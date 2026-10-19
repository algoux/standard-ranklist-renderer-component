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
- `SrkProblemHeaderCellTemplateDirective`
- `SrkUserCellTemplateDirective`
- `SrkStatusCellTemplateDirective`

## Usage

Import the standalone components you use, and import the shared stylesheet once in your application styles or entry. `RanklistComponent` expects a static ranklist, so convert an SRK ranklist before binding it.

```ts
import { Component } from '@angular/core';
import { convertToStaticRanklist } from '@algoux/standard-ranklist-renderer-component-core';
import {
  DefaultSolutionModalComponent,
  DefaultUserModalComponent,
  ProgressBarComponent,
  RanklistComponent,
  type SolutionClickPayload,
  type UserClickPayload,
} from '@algoux/standard-ranklist-renderer-component-angular';
import '@algoux/standard-ranklist-renderer-component-styles';

@Component({
  standalone: true,
  imports: [
    DefaultSolutionModalComponent,
    DefaultUserModalComponent,
    ProgressBarComponent,
    RanklistComponent,
  ],
  template: `
    <srk-progress-bar
      [data]="ranklist"
      [enableTimeTravel]="true"
      (timeTravel)="handleTimeTravel($event)"
    ></srk-progress-bar>
    <srk-ranklist
      [data]="staticRanklist"
      [rowStriped]="true"
      (userClick)="handleUserClick($event)"
      (solutionClick)="handleSolutionClick($event)"
    ></srk-ranklist>
    <srk-default-user-modal
      [open]="!!activeUser"
      [user]="activeUser?.user"
      [markers]="staticRanklist.markers"
      (close)="activeUser = null"
    ></srk-default-user-modal>
    <srk-default-solution-modal
      [open]="!!activeSolution"
      [user]="activeSolution?.user"
      [problem]="activeSolution?.problem"
      [problemIndex]="activeSolution?.problemIndex ?? 0"
      [solutions]="activeSolution?.solutions || []"
      (close)="activeSolution = null"
    ></srk-default-solution-modal>
  `,
})
export class BoardComponent {
  ranklist!: any;
  activeUser: UserClickPayload | null = null;
  activeSolution: SolutionClickPayload | null = null;

  get staticRanklist() {
    return convertToStaticRanklist(this.ranklist);
  }

  handleTimeTravel(time: number | null) {
    console.log(time);
  }

  handleUserClick(payload: UserClickPayload) {
    this.activeUser = payload;
    this.activeSolution = null;
  }

  handleSolutionClick(payload: SolutionClickPayload) {
    this.activeSolution = payload;
    this.activeUser = null;
  }
}
```

## Advanced Usage

Use `ModalComponent` directly when you want custom modal content. `SrkUserCellTemplateDirective` and `SrkStatusCellTemplateDirective` let you replace selected ranklist table cells with Angular templates.

For custom interaction flows, `RanklistComponent` exposes three semantic outputs:

- `(userClick)`: receives `UserClickPayload` when a user cell is clicked.
- `(problemClick)`: receives `ProblemClickPayload` when a problem header is clicked. When observed, default problem headers are always clickable and problem links are not rendered as anchors.
- `(solutionClick)`: receives `SolutionClickPayload` when a status cell with submissions is clicked.

`SrkProblemHeaderCellTemplateDirective` contexts receive `ranklist` and an `onClick` helper so they can opt into the same problem-click payload path.

## Ranklist Render Options

`RanklistComponent` includes optional render inputs for changing the table structure and status presentation while keeping the default behavior unchanged:

- `splitOrganization`: moves user organization into its own column before the user column.
- `columnTitles`: overrides text labels for series, organization, user, score, time, Dirt, and SE columns.
- `statusCellPreset`: uses `classic`, `detailed`, `minimal`, or `compact` status cell content.
- `statusColorAsText`: uses bold status-colored text instead of colored cell backgrounds.
- `showProblemStatisticsFooter`: appends a DOMjudge-style per-problem statistics footer.
- `showDirtColumn`: appends a Dirt percentage column after problem columns.
- `showSEColumn`: appends a contestant SE column after problem columns, placed after Dirt when both are enabled.
- `rowBordered`: adds row separators controlled by CSS variables.
- `rowStriped`: adds striped body rows.
- `columnBordered`: adds column separators controlled by CSS variables.
- `emptyStatusPlaceholder`: renders a custom string in no-submission status cells.
- `userAvatarPlacement`: chooses whether the default user avatar renders in the user column or, when `splitOrganization` is enabled, in the organization column.
- `languages`: passes an explicit language priority list to i18n text resolution. Leave it unset to use the browser language list; pass it to `RanklistComponent`, `DefaultUserModalComponent`, and `DefaultSolutionModalComponent` when rendering outside the browser or when you need a forced language.

```ts
import type { RanklistColumnTitles } from '@algoux/standard-ranklist-renderer-component-angular';

export class BoardComponent {
  readonly columnTitles: RanklistColumnTitles = {
    organization: 'Org',
    user: 'Team',
    score: 'Solved',
    time: 'Penalty',
    dirt: 'Dirt',
    se: 'SE',
  };
}
```

```html
<srk-ranklist
  [data]="staticRanklist"
  [splitOrganization]="true"
  [showProblemStatisticsFooter]="true"
  [showDirtColumn]="true"
  [showSEColumn]="true"
  [statusCellPreset]="'compact'"
  [statusColorAsText]="true"
  [rowBordered]="true"
  [rowStriped]="true"
  [columnBordered]="true"
  [emptyStatusPlaceholder]="'·'"
  [userAvatarPlacement]="'organization'"
  [languages]="['zh-CN']"
  [columnTitles]="columnTitles"
></srk-ranklist>
```

## CCPC26 presentation

Set `[enableCCPC26]="true"` only when the caller wants SRK 0.3.14's configured ICPC
CCPC26 presentation (normally before the freeze). The input defaults to false and the
component owns no clock. Pass a complete contest snapshot; core and utils compute the
shared revealed prefix and each participant's anonymous problem order.

Anonymous headers and footer cells remain blank. The final revealed column has a shared
1px right separator, or 3px with `columnBordered`; no separator appears if none or all
problems are revealed. Anonymous FB cells and submission records display as ordinary AC,
while click outputs preserve original indexes, status objects and results.

Pass `[problemRevealed]="activeSolution?.problemRevealed ?? true"` to
`srk-default-solution-modal` to hide the problem label and first-blood result, including
during its closing animation. The modal input defaults to true.

`srkStatusCell` templates receive optional `problemRevealed` metadata and original status
objects. Custom cells can use core's `getRankProblemDisplayStatus(status, problemRevealed)`
to apply the same anonymous FB presentation. `srkProblemHeaderCell` templates run only for
revealed problems. The owning `<th>` applies the sticky separator; its `className` is also
available in the template context. Core and styles own the shared presentation rules and styling.

The development preview includes a `CCPC26 mode` checkbox. Replay updates it at the freeze
boundary; manual toggles close stale problem and solution details. Only `dev/main.ts` loads
`demo.json`; tests inject small synthetic contests through the dev-only `PREVIEW_RANKLIST`
token. See [CCPC26 render options](../../docs/agents/ranklist-renderer-props.md#ccpc26-presentation).
