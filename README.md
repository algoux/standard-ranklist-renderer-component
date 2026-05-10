# @algoux/standard-ranklist-renderer-component

Multi-package renderer components for [standard-ranklist](https://srk.algoux.org/) data.

Supported srk versions: `>=0.3.0 && <=0.3.12`.

The repository now publishes framework-specific packages plus shared `core` and `styles` packages. The root package is kept as the monorepo coordinator and documentation entry; new consumers should install the framework package they use.

## Packages

| Package | Purpose |
| --- | --- |
| `@algoux/standard-ranklist-renderer-component-core` | Shared helpers, payload types, and SRK compatibility helpers |
| `@algoux/standard-ranklist-renderer-component-styles` | Shared stylesheet package |
| `@algoux/standard-ranklist-renderer-component-react` | React components |
| `@algoux/standard-ranklist-renderer-component-vue` | Vue components and Vue-facing types |
| `@algoux/standard-ranklist-renderer-component-solid` | Solid components and SSR entry |
| `@algoux/standard-ranklist-renderer-component-svelte` | Svelte components and types |
| `@algoux/standard-ranklist-renderer-component-angular` | Angular standalone components and template directives |
