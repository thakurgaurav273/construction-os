# Component Guide

SitePilot relies on `@sitepilot/ui` for all foundational components.

## Rules
1. **Never use raw HTML elements for standard UI.** Use `<Button>`, `<Input>`, `<Card>`, etc.
2. **Styling:** Use Tailwind CSS exclusively via the `cn()` utility to merge custom classes.
3. **Animations:** For layout transitions, rely on Framer Motion. For micro-interactions, use Tailwind's `animate-in` or custom transition classes.

## Available Components
- `Button`: Standard clickable action. Supports `variant` and `size`.
- `Card`: Premium elevated container for content blocks.
- `Input`: Vercel-style soft inputs with custom focus rings.
- `Table`: Generic overflow-managed table wrapper.
- `Badge`: Soft status indicators.
