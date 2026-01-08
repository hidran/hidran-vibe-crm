# Drag and Drop Implementation for Tasks

## Overview

The tasks kanban board now supports full drag and drop functionality, including:
- Moving tasks between columns (changing status)
- Reordering tasks within the same column
- Visual feedback during drag operations

## Recent Fixes

### Issue 1: Frontend Not Updating After Drag and Drop
**Problem**: When dragging and dropping a task, the status updated in the backend database but the frontend UI didn't refresh to show the change.

**Root Cause**: The React Query cache invalidation key didn't match the actual query key structure. The query key was:
```typescript
["tasks", organizationId, filters, isSuperadmin]
```
But the invalidation only used:
```typescript
["tasks", data.organization_id]
```

**Solution**: Updated `useUpdateTaskStatus` to invalidate all task queries:
```typescript
queryClient.invalidateQueries({
  queryKey: ["tasks"],
  refetchType: "active"
});
```

This invalidates all task queries regardless of filters, ensuring the UI updates immediately after drag and drop.

### Issue 2: Dragging Between Columns
**Problem**: When dragging a task to a different column's empty space, the drag state from the previous column wasn't being cleared, causing positioning issues.

**Solution**: Updated `handleDragOver` to clear task-specific drag state when hovering over column empty space:
```typescript
const handleDragOver = (e: React.DragEvent) => {
  e.preventDefault();
  // Clear task-specific drag state when dragging over column empty space
  if (e.target === e.currentTarget) {
    setDragOverTaskId(null);
    setDragOverPosition(null);
  }
};
```

This ensures that when dragging to a different column, the visual indicators and position calculations work correctly.

## Implementation Details

### File: `/src/components/tasks/KanbanBoard.tsx`

#### Key Features

1. **Drag Between Columns**: Tasks can be dragged from one column to another to change their status
2. **Reorder Within Column**: Tasks can be reordered within the same column by dragging and dropping
3. **Visual Feedback**:
   - Dragged task becomes semi-transparent (50% opacity)
   - A pulsing blue line indicates where the task will be dropped
   - The line appears above or below the target task based on cursor position

#### State Management

```typescript
const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
const [dragOverPosition, setDragOverPosition] = useState<"before" | "after" | null>(null);
```

#### Core Functions

**`handleDragStart`**: Captures the task ID being dragged and sets visual state
**`handleDragEnd`**: Cleans up drag state when drag operation ends
**`handleTaskDragOver`**: Calculates whether the task should be dropped before or after the target task based on cursor position
**`handleDragLeave`**: Clears the drop indicator when cursor leaves a task
**`calculateNewPosition`**: Determines the new position index for the dragged task
**`handleDrop`**: Executes the task update with new status and position

#### Position Calculation

When a task is dropped:
1. If dropped on a specific task, the position is calculated based on "before" or "after" indicator
2. The position is sent to the backend along with the status
3. The backend updates the task's `position` field
4. Tasks are ordered by `position` field in the database query

#### Sorting

Tasks within each column are sorted by:
1. `position` field (ascending) - if set
2. `created_at` field (descending) - for tasks without position

This ensures new tasks appear at the top of columns by default, while manually ordered tasks maintain their position.

## Database Schema

The `tasks` table includes a `position` field:
```typescript
position: number | null
```

Tasks are queried with:
```sql
ORDER BY position ASC, created_at DESC
```

## API Usage

The `updateTaskStatus` mutation accepts:
```typescript
{
  id: string;
  status: TaskStatus; // "backlog" | "todo" | "in_progress" | "review" | "done"
  position?: number;  // Optional new position in the column
}
```

## User Experience

1. **Grab a task**: Hover over any task card - cursor changes to grab hand
2. **Start dragging**: Click and hold to start dragging
3. **Visual feedback**:
   - The dragged task becomes semi-transparent
   - As you hover over other tasks, a blue pulsing line appears showing where it will drop
4. **Drop the task**:
   - Release anywhere in a column to place at the end
   - Release over a task to place before/after that task
5. **Auto-save**: The position updates automatically upon drop

## Technical Notes

- Uses native HTML5 drag and drop API (no external library)
- Position calculations happen on the frontend
- Backend handles position persistence
- React Query automatically refetches and updates the UI
- Works across all modern browsers

## Testing

### E2E Tests

A comprehensive E2E test suite has been created at `/tests/tasks/task-drag-drop.spec.ts` with the following test cases:

**See also**: `/docs/TASK_SUMMARY.md` for a complete overview of the implementation and testing.

1. **Drag task from Backlog to Todo**: Verifies tasks can move between columns
2. **Drag task from Todo to In Progress**: Tests sequential column transitions
3. **Drag task to Done column**: Confirms completion workflow
4. **Reorder tasks within same column**: Tests drag and drop for reordering
5. **Visual feedback during drag**: Verifies opacity changes and UI feedback
6. **Drag across all columns**: Tests complete workflow from backlog to done

### Running the Tests

```bash
# Run all task-related E2E tests (requires local Supabase running)
npm test -- tests/tasks/task-drag-drop.spec.ts

# Run with Playwright UI
npx playwright test tests/tasks/task-drag-drop.spec.ts --ui

# Run specific test
npx playwright test tests/tasks/task-drag-drop.spec.ts -g "should drag task from Backlog to Todo"
```

### Test Requirements

- Local Supabase instance running (or configured test database)
- Dev server running on `http://localhost:8080`
- Service role key configured for test data setup

### Manual Testing

1. Start the dev server: `npm run dev`
2. Navigate to `/tasks`
3. Create some tasks in different columns
4. Try dragging:
   - From one column to another (e.g., Backlog → Todo)
   - Within the same column to reorder
   - Across multiple columns in sequence
5. Verify:
   - Visual feedback (opacity change, blue line indicator)
   - Task appears in correct position after drop
   - UI updates automatically
   - Database persists the change (check by refreshing page)
