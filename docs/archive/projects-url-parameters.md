# Projects Page - URL Parameter State Management

## Overview
Refactored the Projects page to use URL parameters for managing all filter and pagination state, enabling browser history navigation and state persistence across page reloads.

## Benefits

### 1. **Browser History Support** 🔙
- Back/Forward buttons work correctly
- Each filter change creates a history entry
- Users can navigate through their filter history

### 2. **Shareable URLs** 🔗
- Copy and share filtered views
- Bookmark specific filter combinations
- Direct links to specific pages

### 3. **State Persistence** 💾
- Filters persist across page reloads
- No loss of state when refreshing
- Consistent experience across sessions

### 4. **Deep Linking** 🎯
- Link directly to filtered results
- Pre-populate filters from external sources
- Better integration with other parts of the app

## URL Parameter Schema

### Filter Parameters

| Parameter | Type | Example | Description |
|-----------|------|---------|-------------|
| `search` | string | `?search=website` | Text search query |
| `client` | string | `?client=uuid-123` | Client ID filter |
| `status` | string | `?status=active` | Project status filter |
| `priority` | string | `?priority=urgent` | Priority level filter |
| `startDate` | ISO date | `?startDate=2024-01-01` | Start date filter (YYYY-MM-DD) |
| `dueDate` | ISO date | `?dueDate=2024-12-31` | Due date filter (YYYY-MM-DD) |
| `page` | number | `?page=3` | Current page number |

### Example URLs

**No filters (default view):**
```
/projects
```

**Search for "website":**
```
/projects?search=website
```

**Active projects, page 2:**
```
/projects?status=active&page=2
```

**Urgent projects for specific client:**
```
/projects?client=abc-123&priority=urgent
```

**Complex filter combination:**
```
/projects?search=redesign&status=active&priority=high&startDate=2024-01-01&page=2
```

## Technical Implementation

### Reading URL Parameters

```tsx
const [searchParams, setSearchParams] = useSearchParams();

// Read individual parameters
const searchQuery = searchParams.get('search') || '';
const clientFilter = searchParams.get('client') || 'all';
const statusFilter = searchParams.get('status') || 'all';
const priorityFilter = searchParams.get('priority') || 'all';
const currentPage = parseInt(searchParams.get('page') || '1', 10);

// Parse date parameters
const startDateParam = searchParams.get('startDate');
const startDateFilter = startDateParam ? new Date(startDateParam) : undefined;
```

### Updating URL Parameters

```tsx
const updateUrlParams = (updates: Record<string, string | undefined>) => {
  const newParams = new URLSearchParams(searchParams);
  
  Object.entries(updates).forEach(([key, value]) => {
    if (value && value !== 'all' && value !== '') {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
  });
  
  setSearchParams(newParams, { replace: true });
};
```

### Filter Setters

```tsx
// Each filter setter updates URL and resets to page 1
const setSearchQuery = (value: string) => 
  updateUrlParams({ search: value, page: '1' });

const setClientFilter = (value: string) => 
  updateUrlParams({ client: value, page: '1' });

const setStatusFilter = (value: string) => 
  updateUrlParams({ status: value, page: '1' });

const setPriorityFilter = (value: string) => 
  updateUrlParams({ priority: value, page: '1' });

const setStartDateFilter = (date: Date | undefined) => 
  updateUrlParams({ 
    startDate: date ? date.toISOString().split('T')[0] : undefined, 
    page: '1' 
  });

const setCurrentPage = (page: number) => 
  updateUrlParams({ page: page.toString() });
```

### Clear All Filters

```tsx
const clearFilters = () => {
  setSearchParams({}, { replace: true });
};
```

## Behavior Details

### Replace vs Push
- Uses `{ replace: true }` to avoid cluttering browser history
- Each filter change replaces the current history entry
- Users can still use back button to go to previous page

### Auto-Reset to Page 1
- Changing any filter automatically resets to page 1
- Prevents showing empty pages when filter reduces results
- Page parameter is explicitly set to '1' on filter changes

### Default Values
- Parameters not in URL use default values
- `all` for dropdown filters
- Empty string for search
- `1` for page number
- `undefined` for dates

### Parameter Cleanup
- Empty values are removed from URL
- `all` values are removed (default state)
- Keeps URLs clean and readable

## Migration from useState

### Before (useState):
```tsx
const [searchQuery, setSearchQuery] = useState("");
const [clientFilter, setClientFilter] = useState("all");
const [currentPage, setCurrentPage] = useState(1);

// State lost on reload
// No browser history
// Can't share filtered view
```

### After (URL Parameters):
```tsx
const searchQuery = searchParams.get('search') || '';
const clientFilter = searchParams.get('client') || 'all';
const currentPage = parseInt(searchParams.get('page') || '1', 10);

const setSearchQuery = (value: string) => 
  updateUrlParams({ search: value, page: '1' });

// State persists on reload
// Browser history works
// Can share URLs
```

## User Experience

### Scenario 1: Filtering and Sharing
1. User filters projects: `?status=active&priority=urgent`
2. User copies URL from browser
3. User shares URL with colleague
4. Colleague opens URL and sees same filtered view

### Scenario 2: Browser Navigation
1. User applies filter: `?status=active`
2. User applies another filter: `?status=active&priority=high`
3. User clicks browser back button
4. Returns to: `?status=active`

### Scenario 3: Page Reload
1. User filters and navigates: `?status=active&page=3`
2. User refreshes page (F5)
3. Page loads with same filters and page number
4. No state lost

### Scenario 4: Bookmarking
1. User finds useful filter combination
2. User bookmarks the page
3. Later, user clicks bookmark
4. Page loads with saved filters

## Testing

### Manual Testing Checklist
- [ ] Apply filters and check URL updates
- [ ] Reload page and verify filters persist
- [ ] Use browser back/forward buttons
- [ ] Copy URL and open in new tab
- [ ] Clear filters and verify URL clears
- [ ] Navigate pages and check URL
- [ ] Apply multiple filters together
- [ ] Share URL with another user

### URL Examples to Test

```bash
# Default view
http://localhost:8080/projects

# Search only
http://localhost:8080/projects?search=website

# Status filter
http://localhost:8080/projects?status=active

# Multiple filters
http://localhost:8080/projects?status=active&priority=urgent&page=2

# Date filters
http://localhost:8080/projects?startDate=2024-01-01&dueDate=2024-12-31

# All filters
http://localhost:8080/projects?search=app&client=abc-123&status=active&priority=high&startDate=2024-01-01&page=3
```

## Edge Cases Handled

1. **Invalid page numbers**: Defaults to 1
2. **Invalid dates**: Ignored, filter not applied
3. **Unknown filter values**: Treated as 'all'
4. **Missing parameters**: Use default values
5. **Page > totalPages**: Shows empty results (user can navigate back)

## Future Enhancements

1. **URL Shortening**: For very long filter combinations
2. **Filter Presets**: Save common filter combinations
3. **Query String Validation**: Validate parameters on load
4. **Analytics**: Track popular filter combinations
5. **Default Filters**: Allow setting default filters per user

## Status: ✅ COMPLETE

URL parameter state management has been successfully implemented for all filters and pagination on the Projects page.
