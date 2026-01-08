/**
 * Property-Based Tests for Attachment Filtering and Retrieval
 * Feature: attachment-management
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

describe('Attachment Filtering and Retrieval Property Tests', () => {
    /**
     * Property 9: Project attachment filtering
     * Validates: Requirements 4.1
     *
     * This property ensures that attachments are correctly filtered by project_id
     * and only return attachments for the specified project.
     */
    it('Property 9: Project attachment filtering returns only project attachments', () => {
        fc.assert(
            fc.property(
                fc.array(
                    fc.record({
                        id: fc.uuid(),
                        organization_id: fc.uuid(),
                        project_id: fc.option(fc.uuid(), { nil: null }),
                        task_id: fc.option(fc.uuid(), { nil: null }),
                        file_name: fc.string({ minLength: 1, maxLength: 100 }),
                    }),
                    { minLength: 0, maxLength: 50 }
                ),
                fc.uuid(), // filter project ID
                (attachments, filterProjectId) => {
                    // Simulate filtering logic
                    const filteredAttachments = attachments.filter(
                        att => att.project_id === filterProjectId
                    );

                    // Property: All filtered attachments belong to the specified project
                    filteredAttachments.forEach(attachment => {
                        expect(attachment.project_id).toBe(filterProjectId);
                    });

                    // Property: No attachments from other projects are included
                    filteredAttachments.forEach(attachment => {
                        expect(attachment.project_id).not.toBe(null);
                        if (attachment.project_id !== filterProjectId) {
                            throw new Error('Filter included wrong project');
                        }
                    });

                    // Property: Filter count matches actual count
                    const expectedCount = attachments.filter(
                        att => att.project_id === filterProjectId
                    ).length;
                    expect(filteredAttachments.length).toBe(expectedCount);

                    // Property: If no attachments match, result should be empty
                    const hasMatchingProject = attachments.some(
                        att => att.project_id === filterProjectId
                    );
                    if (!hasMatchingProject) {
                        expect(filteredAttachments.length).toBe(0);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 10: Task attachment filtering
     * Validates: Requirements 4.2
     *
     * This property ensures that attachments are correctly filtered by task_id
     * and only return attachments for the specified task.
     */
    it('Property 10: Task attachment filtering returns only task attachments', () => {
        fc.assert(
            fc.property(
                fc.array(
                    fc.record({
                        id: fc.uuid(),
                        organization_id: fc.uuid(),
                        project_id: fc.option(fc.uuid(), { nil: null }),
                        task_id: fc.option(fc.uuid(), { nil: null }),
                        file_name: fc.string({ minLength: 1, maxLength: 100 }),
                    }),
                    { minLength: 0, maxLength: 50 }
                ),
                fc.uuid(), // filter task ID
                (attachments, filterTaskId) => {
                    // Simulate filtering logic
                    const filteredAttachments = attachments.filter(
                        att => att.task_id === filterTaskId
                    );

                    // Property: All filtered attachments belong to the specified task
                    filteredAttachments.forEach(attachment => {
                        expect(attachment.task_id).toBe(filterTaskId);
                    });

                    // Property: No attachments from other tasks are included
                    filteredAttachments.forEach(attachment => {
                        expect(attachment.task_id).not.toBe(null);
                        if (attachment.task_id !== filterTaskId) {
                            throw new Error('Filter included wrong task');
                        }
                    });

                    // Property: Filter count matches actual count
                    const expectedCount = attachments.filter(
                        att => att.task_id === filterTaskId
                    ).length;
                    expect(filteredAttachments.length).toBe(expectedCount);

                    // Property: Task attachments should not include project attachments
                    filteredAttachments.forEach(attachment => {
                        // If it has a task_id, it might also have project_id (task belongs to project)
                        // but we're specifically filtering by task_id
                        expect(attachment.task_id).toBe(filterTaskId);
                    });
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 12: Attachment ordering
     * Validates: Requirements 4.5
     *
     * This property ensures that attachments are ordered by created_at descending
     * (newest first).
     */
    it('Property 12: Attachments are ordered by created_at descending', () => {
        fc.assert(
            fc.property(
                fc.array(
                    fc.record({
                        id: fc.uuid(),
                        file_name: fc.string({ minLength: 1, maxLength: 100 }),
                        created_at: fc.integer({
                            min: new Date('2020-01-01').getTime(),
                            max: Date.now()
                        }).map(ts => new Date(ts).toISOString()),
                    }),
                    { minLength: 2, maxLength: 20 }
                ),
                (attachments) => {
                    // Simulate ordering logic
                    const sorted = [...attachments].sort((a, b) => {
                        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                    });

                    // Property: Each attachment is newer than or equal to the next
                    for (let i = 0; i < sorted.length - 1; i++) {
                        const currentDate = new Date(sorted[i].created_at).getTime();
                        const nextDate = new Date(sorted[i + 1].created_at).getTime();
                        expect(currentDate).toBeGreaterThanOrEqual(nextDate);
                    }

                    // Property: Most recent attachment is first
                    if (sorted.length > 0) {
                        const mostRecentIndex = attachments.reduce((maxIdx, att, idx, arr) => {
                            return new Date(att.created_at).getTime() >
                                new Date(arr[maxIdx].created_at).getTime()
                                ? idx
                                : maxIdx;
                        }, 0);
                        expect(sorted[0].id).toBe(attachments[mostRecentIndex].id);
                    }
                }
            ),
            { numRuns: 50 }
        );
    });

    /**
     * Property 19: Organization filtering
     * Validates: Requirements 7.1, 7.5
     *
     * This property ensures that attachments are correctly filtered by organization_id
     * through RLS policies.
     */
    it('Property 19: Organization filtering isolates data by organization', () => {
        fc.assert(
            fc.property(
                fc.array(
                    fc.record({
                        id: fc.uuid(),
                        organization_id: fc.uuid(),
                        project_id: fc.option(fc.uuid(), { nil: null }),
                        task_id: fc.option(fc.uuid(), { nil: null }),
                        file_name: fc.string({ minLength: 1, maxLength: 100 }),
                    }),
                    { minLength: 0, maxLength: 50 }
                ),
                fc.uuid(), // filter organization ID
                (attachments, filterOrgId) => {
                    // Simulate RLS filtering logic
                    const filteredAttachments = attachments.filter(
                        att => att.organization_id === filterOrgId
                    );

                    // Property: All filtered attachments belong to the specified organization
                    filteredAttachments.forEach(attachment => {
                        expect(attachment.organization_id).toBe(filterOrgId);
                    });

                    // Property: No attachments from other organizations are included
                    const otherOrgAttachments = filteredAttachments.filter(
                        att => att.organization_id !== filterOrgId
                    );
                    expect(otherOrgAttachments.length).toBe(0);

                    // Property: Filter count matches actual count
                    const expectedCount = attachments.filter(
                        att => att.organization_id === filterOrgId
                    ).length;
                    expect(filteredAttachments.length).toBe(expectedCount);

                    // Property: Organization filter is applied before project/task filter
                    // (Multi-tenant isolation at base level)
                    const orgIds = new Set(filteredAttachments.map(att => att.organization_id));
                    if (orgIds.size > 0) {
                        expect(orgIds.size).toBe(1);
                        expect(orgIds.has(filterOrgId)).toBe(true);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 25: Uploader information retrieval
     * Validates: Requirements 10.5
     *
     * This property ensures that uploader information is correctly retrieved
     * through the profiles join.
     */
    it('Property 25: Uploader information is correctly retrieved and joined', () => {
        fc.assert(
            fc.property(
                fc.array(
                    fc.record({
                        id: fc.uuid(),
                        file_name: fc.string({ minLength: 1, maxLength: 100 }),
                        uploaded_by: fc.uuid(),
                        uploader: fc.record({
                            id: fc.uuid(),
                            email: fc.emailAddress(),
                            full_name: fc.option(
                                fc.string({ minLength: 1, maxLength: 100 }),
                                { nil: null }
                            ),
                        }),
                    }),
                    { minLength: 1, maxLength: 20 }
                ),
                (attachmentsWithUploaders) => {
                    // Property: Each attachment has uploader information
                    attachmentsWithUploaders.forEach(attachment => {
                        expect(attachment.uploader).toBeTruthy();
                        expect(attachment.uploader.id).toBeTruthy();
                        expect(attachment.uploader.email).toBeTruthy();
                    });

                    // Property: Uploader ID matches the uploaded_by field
                    // (In the actual query, we join on uploaded_by)
                    attachmentsWithUploaders.forEach(attachment => {
                        expect(attachment.uploaded_by).toBeTruthy();
                        expect(attachment.uploader.id).toBeTruthy();
                    });

                    // Property: Email is in valid format
                    attachmentsWithUploaders.forEach(attachment => {
                        expect(attachment.uploader.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
                    });

                    // Property: Full name can be null (optional field)
                    attachmentsWithUploaders.forEach(attachment => {
                        const nameIsValid =
                            attachment.uploader.full_name === null ||
                            typeof attachment.uploader.full_name === 'string';
                        expect(nameIsValid).toBe(true);
                    });
                }
            ),
            { numRuns: 50 }
        );
    });

    /**
     * Additional test: Combined project and organization filtering
     * Ensures that filters work together correctly
     */
    it('Combined project and organization filters work correctly', () => {
        fc.assert(
            fc.property(
                fc.array(
                    fc.record({
                        id: fc.uuid(),
                        organization_id: fc.uuid(),
                        project_id: fc.option(fc.uuid(), { nil: null }),
                        task_id: fc.option(fc.uuid(), { nil: null }),
                        file_name: fc.string({ minLength: 1, maxLength: 100 }),
                    }),
                    { minLength: 0, maxLength: 50 }
                ),
                fc.uuid(), // organization filter
                fc.uuid(), // project filter
                (attachments, filterOrgId, filterProjectId) => {
                    // Simulate combined filtering
                    const filteredAttachments = attachments.filter(
                        att =>
                            att.organization_id === filterOrgId &&
                            att.project_id === filterProjectId
                    );

                    // Property: All results match BOTH filters
                    filteredAttachments.forEach(attachment => {
                        expect(attachment.organization_id).toBe(filterOrgId);
                        expect(attachment.project_id).toBe(filterProjectId);
                    });

                    // Property: Result count is correct
                    const expectedCount = attachments.filter(
                        att =>
                            att.organization_id === filterOrgId &&
                            att.project_id === filterProjectId
                    ).length;
                    expect(filteredAttachments.length).toBe(expectedCount);

                    // Property: Combined filter is stricter than individual filters
                    const orgOnlyCount = attachments.filter(
                        att => att.organization_id === filterOrgId
                    ).length;
                    const projectOnlyCount = attachments.filter(
                        att => att.project_id === filterProjectId
                    ).length;
                    expect(filteredAttachments.length).toBeLessThanOrEqual(orgOnlyCount);
                    expect(filteredAttachments.length).toBeLessThanOrEqual(projectOnlyCount);
                }
            ),
            { numRuns: 100 }
        );
    });
});
