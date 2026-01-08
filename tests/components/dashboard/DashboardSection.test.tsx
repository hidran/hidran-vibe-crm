import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DashboardSection } from '@/components/dashboard/DashboardSection';

// Component that throws an error
const ThrowError = () => {
  throw new Error('Test error');
};

describe('DashboardSection Error Boundary', () => {
  beforeEach(() => {
    // Suppress console errors in tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'group').mockImplementation(() => {});
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
  });

  it('catches errors and displays fallback UI', () => {
    render(
      <DashboardSection sectionName="test section">
        <ThrowError />
      </DashboardSection>
    );

    expect(screen.getByText(/Failed to load test section/i)).toBeInTheDocument();
  });

  it('logs errors with section name', () => {
    const consoleGroupSpy = vi.spyOn(console, 'group');
    
    render(
      <DashboardSection sectionName="statistics">
        <ThrowError />
      </DashboardSection>
    );

    expect(consoleGroupSpy).toHaveBeenCalledWith(
      expect.stringContaining('statistics')
    );
  });

  it('displays reload button in fallback UI', () => {
    render(
      <DashboardSection sectionName="revenue chart">
        <ThrowError />
      </DashboardSection>
    );

    expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
  });

  it('renders children when no error occurs', () => {
    render(
      <DashboardSection sectionName="test section">
        <div>Test content</div>
      </DashboardSection>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
    expect(screen.queryByText(/Failed to load/i)).not.toBeInTheDocument();
  });
});
