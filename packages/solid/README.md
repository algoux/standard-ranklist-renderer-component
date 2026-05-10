# @algoux/standard-ranklist-renderer-component-solid

Solid components for Standard Ranklist data, with an explicit `./server` export for SSR-oriented builds.

## Install

```bash
npm i -D @algoux/standard-ranklist
npm i -S @algoux/standard-ranklist-renderer-component-solid @algoux/standard-ranklist-renderer-component-core @algoux/standard-ranklist-renderer-component-styles
```

## Main Exports

- `Ranklist`
- `ProgressBar`
- `Modal`
- `DefaultUserModal`
- `DefaultSolutionModal`

## Usage

```tsx
import { Ranklist } from '@algoux/standard-ranklist-renderer-component-solid';
import { convertToStaticRanklist } from '@algoux/standard-ranklist-renderer-component-core';
import '@algoux/standard-ranklist-renderer-component-styles';
```