# @algoux/standard-ranklist-renderer-component-angular

Angular standalone components and template directives for Standard Ranklist data.

## Install

```bash
npm i -D @algoux/standard-ranklist
npm i -S @algoux/standard-ranklist-renderer-component-angular @algoux/standard-ranklist-renderer-component-core @algoux/standard-ranklist-renderer-component-styles
```

## Main Exports

- `RanklistComponent`
- `ProgressBarComponent`
- `ModalComponent`
- `DefaultUserModalComponent`
- `DefaultSolutionModalComponent`
- `SrkUserCellTemplateDirective`
- `SrkStatusCellTemplateDirective`

## Usage

```ts
import { RanklistComponent } from '@algoux/standard-ranklist-renderer-component-angular';
import { convertToStaticRanklist } from '@algoux/standard-ranklist-renderer-component-core';
import '@algoux/standard-ranklist-renderer-component-styles';
```