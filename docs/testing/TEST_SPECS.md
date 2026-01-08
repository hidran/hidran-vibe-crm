# Test Specifications

## Feature Test Cases

### 1. Authentication (AuthContext)
- [ ] Should provide auth context with user, session, loading, signOut
- [ ] Should initialize with loading state
- [ ] Should have null user when not authenticated
- [ ] Should call signOut and clear session

### 2. Organization Management (useOrganization)
- [ ] Should return organization state properties
- [ ] Should have createOrganization mutation
- [ ] Should fetch organization membership for authenticated user

### 3. Client CRUD (useClients)
- [ ] useClients: Should return clients for organization
- [ ] useCreateClient: Should create new client with required fields
- [ ] useUpdateClient: Should update existing client
- [ ] useDeleteClient: Should delete client by ID
- [ ] ClientDialog: Should render create mode title when no client provided
- [ ] ClientDialog: Should render edit mode when client provided
- [ ] ClientDialog: Should render all form fields (name, email, phone, address, VAT, status)

### 4. Project CRUD (useProjects)
- [ ] useProjects: Should return projects for organization
- [ ] useCreateProject: Should create new project with required fields
- [ ] useUpdateProject: Should update existing project
- [ ] useDeleteProject: Should delete project by ID
- [ ] ProjectDialog: Should render create mode title when no project provided
- [ ] ProjectDialog: Should render edit mode when project provided
- [ ] ProjectDialog: Should render all form fields (name, description, client, status, priority, dates)

### 5. Task CRUD (useTasks)
- [ ] useTasks: Should return tasks for organization
- [ ] useTasks: Should filter by project when projectId provided
- [ ] useCreateTask: Should create new task with required fields
- [ ] useUpdateTask: Should update existing task
- [ ] useDeleteTask: Should delete task by ID
- [ ] useUpdateTaskStatus: Should update task status (for drag-drop)
- [ ] TaskDialog: Should render create mode title when no task provided
- [ ] TaskDialog: Should render edit mode when task provided
- [ ] TaskDialog: Should use defaultStatus when provided

### 6. Kanban Board (KanbanBoard)
- [ ] Should render all 5 status columns (Backlog, To Do, In Progress, Review, Done)
- [ ] Should display task count for each column
- [ ] Should render tasks in correct columns based on status
- [ ] Should support drag-and-drop between columns
- [ ] Should call onAddTask when add button clicked
- [ ] Should call onEditTask when edit menu item clicked

### 7. Pages
- [ ] Auth: Should render login form by default
- [ ] Auth: Should toggle between login and signup modes
- [ ] Dashboard: Should display stat cards for clients, projects, tasks
- [ ] Clients: Should render client list and add button
- [ ] Projects: Should render project list and add button
- [ ] Tasks: Should render kanban board with all columns

## Manual Testing Checklist

1. **Authentication Flow**
   - Sign up with email/password
   - Sign in with existing credentials
   - Sign out clears session

2. **Organization Setup**
   - New users can create organization
   - Organization data persists across sessions

3. **Client Management**
   - Create new client with all fields
   - Edit existing client
   - Delete client
   - Client list updates in real-time

4. **Project Management**
   - Create project linked to client
   - Edit project details
   - Delete project
   - Project list shows client association

5. **Task Management**
   - Create task in any column
   - Drag task between columns
   - Edit task details
   - Delete task
   - Tasks grouped correctly by status
