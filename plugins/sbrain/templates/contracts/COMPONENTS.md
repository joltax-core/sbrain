# Shared Component Catalog (tier 2)

> Read this in full (see `stack-frontend-vue` §1.1) before writing any new Vue
> component. **This catalog is tier 2 only** — composite/business components built on
> top of shadcn-vue primitives (`AppTable`, `AppFilterDrawer`, `FormBuilder`, ...).
> Tier-1 UI primitives (button, dialog, table, sheet, ...) come from the shadcn-vue
> MCP/CLI into `src/components/ui/` and are NOT listed here — that tree is
> self-documenting via shadcn-vue's own registry.
>
> This catalog starts empty and grows as modules need shared tier-2 composites, not
> pre-built. A tier-2 component that isn't listed here does not exist as far as the
> next module is concerned; a module-specific component does NOT belong here either.
>
> Adding a row is part of the same change that adds the component, not a follow-up.

| Component | Path | Built on (tier-1) | Responsibility | When NOT to use it |
| --------- | ---- | ------------------ | --------------- | ------------------- |
|           |      |                     |                  |                      |

## Deprecated / superseded

> A component replaced by a better version stays listed here (never silently
> deleted) with a pointer to its replacement, so a reader hitting an old import knows
> where to migrate.

| Component | Superseded by | Why |
| --------- | -------------- | --- |
|           |                |     |
