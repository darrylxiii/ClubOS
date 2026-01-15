# Contributing to The Quantum Club OS

Welcome to the engineering team! This document outlines the standards, workflows, and structures we use to maintain a high-velocity, high-quality codebase.

## 🛠 Tech Stack

*   **Framework**: [React](https://react.dev/) + [Vite](https://vitejs.dev/)
*   **Language**: TypeScript (Strict Mode)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
*   **UI Library**: [shadcn/ui](https://ui.shadcn.com/) (Radix UI)
*   **State Management**: [TanStack Query](https://tanstack.com/query/latest) (Server State) + React Context (Client State)
*   **Backend**: [Supabase](https://supabase.com/) (PostgreSQL + Edge Functions)
*   **AI Integration**: Custom Edge Functions wrapping generic LLMs

## 📂 Project Structure

```
src/
├── components/         # Reusable UI components
│   ├── ui/             # Shadcn primitives (Button, Input, etc.)
│   └── [feature]/      # Feature-specific components
├── contexts/           # React Context providers (Auth, Theme)
├── hooks/              # Custom React hooks (Data fetching, Logic)
├── pages/              # Route components
├── services/           # API wrappers and business logic objects
├── utils/              # Pure helper functions
└── App.tsx             # Root component
```

##  workflow

### 1. Type Safety First
We run in `noImplicitAny` mode. Every function parameter and return value must be typed.
*   **Do**: `const sum = (a: number, b: number): number => a + b;`
*   **Don't**: `const sum = (a, b) => a + b;`

### 2. Component Philosophy
*   **Colocation**: Keep related hooks and sub-components close to where they are used.
*   **Composition**: Prefer composition over inheritance or mega-components.
*   **Styling**: Use Tailwind utility classes. For complex conditionals, use `cn()` utility.

### 3. State Management
*   **Server Data**: Use `useQuery` / `useMutation`. Do not store server data in `useState` unless you are modifying it locally before saving.
*   **Global UI State**: Use React Context (e.g., `SidebarContext`).
*   **Ref**: Use `useRef` for mutable values that don't trigger re-renders.

### 4. Code Quality
*   **Linting**: Run `npm run lint` before committing.
*   **Utils**: Complex logic should be extracted to `src/utils` and must include JSDoc.

## 🚀 Getting Started

1.  **Install**: `npm install`
2.  **Dev**: `npm run dev`
3.  **Build**: `npm run build`

## 🧪 Testing

*   **Unit**: `npm run test` (Vitest)
*   **E2E**: Playwright (if configured)

---

*“Code is read much more often than it is written.”*
