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

## Controlled row window and native Find

The optional `rowWindow`, `retainUserText`, `columnWidths`, and `rowHeight` props share the `RanklistWindowOptions` contract exported by this package and core.

- `rowWindow: { start, end }` selects zero-based, end-exclusive **rich** rows. Bounds are floored/clamped; non-finite bounds disable windowing. All real `tr` positions remain in the table, and payload `rowIndex` values always refer to the complete `data.rows` array. Ranking, statistics, and CCPC26 disclosure still use the complete input.
- `retainUserText: true` keeps one real participant-name/organization text node in every row for native browser Find. Those elements and Text nodes stay mounted as the window moves or `rowWindow` becomes undefined. Rich rows additionally render ranks, scores, statuses, avatars and markers. Without retention, light rows contain only an empty spanning cell; their participant text is not searchable.
- `columnWidths` supplies one positive finite pixel width per physical column: series, optional organization, name, score, optional time, problems, then optional Dirt/SE. A complete valid array enables fixed colgroups (including CCPC26 reveal boundaries), with Name absorbing spare space. Retained light rows then use thin spanning cells. Missing/invalid widths use empty physical rank/detail cells to preserve automatic-column alignment.
- `rowHeight` supplies a positive finite minimum participant-row height in pixels, including full-render mode. It is not a clipping rule; use a height that accommodates your fonts, avatars and status preset.

The renderer does not own scrolling or viewport measurement: the host calculates and updates the window and may clear it for copy/print/full data access. Offscreen status/score fields are intentionally not rendered or searchable. Keep user IDs unique and stable. A custom user-cell template plus a window falls back to full rendering so existing custom-cell contracts remain intact; custom status templates are invoked only for rich rows. Omitting the new props preserves the default table and interactions.

```html
<srk-ranklist
  [data]="staticRanklist"
  [rowWindow]="{ start: 80, end: 110 }"
  [retainUserText]="true"
  [columnWidths]="columnWidths"
  [rowHeight]="61"
/>
```

## Advanced Usage

Use `ModalComponent` directly when you want custom modal content. `SrkUserCellTemplateDirective` and `SrkStatusCellTemplateDirective` let you replace selected ranklist table cells with Angular templates.

For custom interaction flows, `RanklistComponent` exposes three semantic outputs:

- `(userClick)`: receives `UserClickPayload` when a user cell is clicked.
- `(problemClick)`: receives `ProblemClickPayload` when a problem header is clicked. When observed, default problem headers are always clickable and problem links are not rendered as anchors.
- `(solutionClick)`: receives `SolutionClickPayload` when a status cell with submissions is clicked.

`SrkProblemHeaderCellTemplateDirective` contexts receive `ranklist` and an `onClick` helper so they can opt into the same problem-click payload path.

## ProgressBar Status Templates

`ProgressBarComponent` accepts optional `timeMachineTemplate` and `liveTemplate` inputs
of type `TemplateRef<unknown>`. Each template replaces the complete active status DOM
inside `.srk-progress-secondary-area-center`. Omitted templates keep the default
status. Time travel takes priority over live status; templates are mounted only while
their state is active, and the idle/ended placeholder stays unchanged.

```html
<srk-progress-bar
  [data]="ranklist"
  [live]="true"
  [enableTimeTravel]="true"
  [timeMachineTemplate]="timeMachineStatus"
  [liveTemplate]="liveStatus"
></srk-progress-bar>
<ng-template #timeMachineStatus>
  <span>Replay</span>
</ng-template>
<ng-template #liveStatus>
  <strong>Live updates</strong>
</ng-template>
```

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

When filtering rows for display, pass `[ccpc26ProblemLayout]` from utils
`getCCPC26ProblemLayout(completeSlice)` before filtering. Original problem indexes must
match `data`; the layout is ignored when CCPC26 is disabled or its configuration is absent.

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

The development preview uses `timeMachineTemplate` to show a `CCPC26` switch beside the
centered time-travel label, only during replay for contests declaring the ICPC `CCPC26`
extension. Replay updates it at the freeze boundary; manual toggles close stale problem
and solution details. Only `dev/main.ts` loads
`demo.json`; tests inject small synthetic contests through the dev-only `PREVIEW_RANKLIST`
token. See [CCPC26 render options](../../docs/agents/ranklist-renderer-props.md#ccpc26-presentation).
