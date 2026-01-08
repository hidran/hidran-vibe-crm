# Developer Getting Started Guide

This guide will help you set up Vibe CRM for development and make your first contribution.

## Prerequisites

Before you begin, ensure you have:

- **Node.js** 18.0 or higher ([install here](https://nodejs.org/))
- **npm** or **bun** package manager
- **Git** for version control
- A **Supabase account** (free tier available at https://supabase.com)
- A **GitHub account** (if contributing)

Verify your setup:
```bash
node --version  # Should be v18+
npm --version   # Or bun --version
git --version
```

## 1. Clone and Setup (5 minutes)

### Clone the Repository
```bash
git clone https://github.com/yourusername/vibe-crm.git
cd vibe-crm
```

### Install Dependencies
```bash
npm install
# or
bun install
```

### Configure Environment Variables

Copy the environment template and add your Supabase credentials:

```bash
cp .env.example .env
```

Edit `.env` and add:
```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-key
```

Get these values from your Supabase project dashboard:
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Click "Settings" > "API"
4. Copy "Project URL" and "anon/public key"

## 2. Start Development Server (2 minutes)

```bash
npm run dev
```

The application will start at `http://localhost:8080`

You should see:
- Login page if not authenticated
- Dashboard if you have test data seeded

## 3. Test Data & Login

### Using Seeded Data (Recommended)

The project includes seeded test data with a superadmin user:

**Email:** `hidran@gmail.com`
**Password:** `Hidran.123`

This user has:
- Superadmin access to all organizations
- 3 test organizations with sample data
- Projects, tasks, clients, and invoices for testing

### Explore the Dashboard

After logging in:
1. Navigate to **Dashboard** - See overview and statistics
2. Navigate to **Clients** - View and create clients
3. Navigate to **Projects** - Browse projects and tasks
4. Navigate to **Invoices** - See invoicing features
5. Switch organizations (if superadmin) - Test multi-tenancy

## 4. Understanding the Code Structure

Key directories to understand:

```
src/
├── pages/              # Route-level pages (Dashboard, Clients, etc.)
├── components/         # Reusable React components
│   ├── ui/            # shadcn/ui base components
│   ├── clients/       # Client-related components
│   ├── projects/      # Project-related components
│   └── [feature]/     # Other feature-specific components
├── hooks/              # Custom React hooks (useClients, useInvoices, etc.)
├── services/           # Business logic and Supabase calls
├── contexts/           # React Context (AuthContext, ThemeContext)
├── integrations/       # External service setup (Supabase client)
└── lib/               # Utility functions
```

### Data Flow Example: Displaying Clients

```
1. User navigates to /clients
2. Page component (src/pages/Clients.tsx) loads
3. Page uses useClients() hook to fetch data
4. Hook uses TanStack Query to cache/manage state
5. Hook calls supabase.from("clients").select()
6. Data rendered in ClientsDataTable component
7. User can create/edit/delete via mutations
8. Mutations invalidate queries, UI updates automatically
```

## 5. Running Tests

### Run All Tests Once
```bash
npm test
```

### Watch Mode (Rerun on file changes)
```bash
npm run test:watch
```

### Open Test UI Dashboard
```bash
npm run test:ui
```

### Run Specific Test File
```bash
npm test -- src/hooks/useClients.test.tsx
```

### Run Tests Matching Pattern
```bash
npm test -- --grep "should fetch clients"
```

## 6. Building & Deployment

### Development Build
```bash
npm run build:dev
npm run preview
```

### Production Build
```bash
npm run build
```

Output is in the `dist/` folder, ready for deployment.

## 7. Code Quality

### Linting
```bash
npm run lint
```

Fix linting issues automatically:
```bash
npm run lint -- --fix
```

## Making Your First Contribution

### 1. Create a Feature Branch
```bash
git checkout -b feature/my-feature
git pull origin main  # Ensure you're up-to-date
```

### 2. Make Your Changes

Follow the [Architecture Guide](../architecture/overview.md) patterns:

- Create hooks in `/src/hooks/`
- Create components in `/src/components/`
- Create services in `/src/services/`
- Add tests in `/tests/`

### 3. Test Your Changes
```bash
npm run lint
npm test
npm run dev
# Manually test in browser
```

### 4. Commit Your Work

Use descriptive commit messages:
```bash
git add .
git commit -m "feat: Add client filtering by status"
```

### 5. Push and Create PR
```bash
git push origin feature/my-feature
```

Then create a Pull Request on GitHub with:
- Clear description of changes
- Link to any related issues
- Screenshots if UI changes

## Common Development Tasks

### Adding a New Page

1. Create file: `src/pages/MyFeature.tsx`
2. Add route in `src/App.tsx`
3. Add navigation link in `src/components/layout/AppSidebar.tsx`
4. Add test file: `tests/pages/MyFeature.test.tsx`

### Adding a Custom Hook

1. Create file: `src/hooks/useMyData.ts`
2. Export hook functions following the pattern:
   - `useMyData()` - Fetch data
   - `useCreateMyData()` - Create mutation
   - `useUpdateMyData()` - Update mutation
   - `useDeleteMyData()` - Delete mutation
3. Add test file: `tests/hooks/useMyData.test.tsx`

### Adding a Component

1. Create file: `src/components/MyFeature/MyComponent.tsx`
2. Create test: `tests/components/MyFeature/MyComponent.test.tsx`
3. Export from `src/components/MyFeature/index.ts` if needed

### Adding a Form

1. Create form component with React Hook Form + Zod
2. Use shadcn/ui form components
3. Validate with Zod schema
4. Handle submission with mutations

Example structure:
```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const formSchema = z.object({
  name: z.string().min(1, "Name required"),
  email: z.string().email("Valid email required"),
});

export function MyForm() {
  const form = useForm({
    resolver: zodResolver(formSchema),
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  );
}
```

## Debugging

### Browser DevTools

1. Open Chrome DevTools (`F12`)
2. **Console**: See errors and logs
3. **Network**: Monitor API calls to Supabase
4. **Application**: Check localStorage (auth token)

### Debug Queries

Add logging to understand query behavior:
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ["clients"],
  queryFn: fetchClients,
});

console.log("Query state:", { data, isLoading, error });
```

### Environment Issues

Check configuration:
```bash
# Verify environment variables are loaded
echo $VITE_SUPABASE_URL
```

### Common Issues

**"Supabase URL not configured"**
- Check `.env` file exists with VITE_SUPABASE_URL
- Restart dev server after changing `.env`

**"useAuth must be used within AuthProvider"**
- Ensure component is wrapped in AuthProvider in App.tsx

**Tests failing with "no such table"**
- Tests run with mocked Supabase by default
- Check test setup in `tests/setup.ts` if needed

**Port 8080 already in use**
```bash
npm run dev -- --port 3000  # Use different port
```

## Next Steps

1. Read [Architecture Overview](../architecture/overview.md) - Understand system design
2. Read [Multi-Tenant Architecture](../architecture/multi-tenancy.md) - Understand data isolation
3. Browse existing code - Look at similar features for patterns
4. Make a small change - Try updating a component
5. Read [Contributing Guide](../CONTRIBUTING.md) - Learn contribution standards

## Getting Help

- Check [FAQ](../faq.md) for common questions
- See [Troubleshooting](../troubleshooting.md) for solutions
- Review [CLAUDE.md](../CLAUDE.md) for AI development guidance
- Open a GitHub issue with questions

## Resources

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Router Docs](https://reactrouter.com/)
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Zod Documentation](https://zod.dev)
- [React Hook Form Docs](https://react-hook-form.com/)

---

Happy coding! If you get stuck, see the [Troubleshooting](../troubleshooting.md) guide.
