# Vibe CRM

A modern, multi-tenant CRM application built with React, TypeScript, and Supabase.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test
```

Visit `http://localhost:5173` to see the application.

## Documentation

Complete documentation is available in the `/docs` folder:

- **[Getting Started (Users)](docs/user-guides/getting-started.md)** - Learn how to use Vibe CRM
- **[Getting Started (Developers)](docs/developer-guides/getting-started.md)** - Setup and development guide
- **[Architecture Overview](docs/architecture/overview.md)** - System design and patterns
- **[API Reference](docs/api/hooks.md)** - Custom hooks and APIs
- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute to the project

### Quick Links

- [Setup Instructions](docs/SETUP.md) - Detailed setup with Supabase
- [Documentation Navigation](docs/NAVIGATION.md) - Find what you need quickly
- [Testing](docs/testing/TEST_SPECS.md) - Test specifications and guidelines

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn-ui
- **Backend**: Supabase (PostgreSQL with Row Level Security)
- **State Management**: TanStack React Query v5
- **Forms**: React Hook Form with Zod validation
- **Testing**: Vitest, Testing Library, Playwright

## Features

- Multi-tenant organization management
- Client and project tracking
- Task management with Kanban board
- Invoice generation with PDF export
- Role-based access control (superadmin, owner, admin, member)
- Dashboard analytics and revenue charts
- Dark/light theme support

## Project Structure

```
vibe-crm/
├── src/
│   ├── pages/           # Route-level components
│   ├── components/      # Reusable UI components
│   ├── hooks/          # Custom React hooks
│   ├── services/       # Business logic and API calls
│   ├── contexts/       # React Context providers
│   └── integrations/   # Third-party integrations
├── docs/               # Complete documentation
├── tests/              # Test files
├── supabase/           # Database migrations
└── public/             # Static assets
```

## Development

```bash
# Development server (with hot reload)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint

# Run tests
npm test              # Run once
npm run test:watch    # Watch mode
npm run test:ui       # UI dashboard
```

## Contributing

Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

[Add your license information here]

## Support

For questions and support, please refer to the [documentation](docs/README.md) or open an issue.
# hidran-vibe-crm
