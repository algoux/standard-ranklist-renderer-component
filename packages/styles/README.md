# @algoux/standard-ranklist-renderer-component-styles

Shared stylesheet package for the Standard Ranklist Renderer Component packages.

## Install

```bash
npm i -S @algoux/standard-ranklist-renderer-component-styles
```

## Usage

Import it once at app startup:

```ts
import '@algoux/standard-ranklist-renderer-component-styles';
```

If your tooling prefers an explicit asset path, `@algoux/standard-ranklist-renderer-component-styles/style.css` is also exported.
## Controlled row windows

See the [shared row-window contract](../../docs/native-find-row-window.md). The stylesheet includes opt-in resident identity cells, fixed-column offsets and a 3px secondary-line gap for explicit uniform-height tables; default table styling remains unchanged.
