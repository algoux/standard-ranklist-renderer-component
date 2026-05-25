# Ranklist Render Options Props

This document is the agent-facing source of truth for the optional render props
being piloted in the React package before promotion to the other framework
packages.

## Execution Constraints

- Work happens on branch `feat/ranklist-render-options`.
- Do not use a git worktree for this feature.
- Do not create commits unless the user explicitly asks for a commit.
- Preserve unrelated local changes.

## React Pilot API

Add the following optional props to React `RanklistProps`:

```ts
splitOrganization?: boolean;
columnTitles?: RanklistColumnTitles;
statusCellPreset?: 'classic' | 'detailed' | 'minimal' | 'compact';
statusColorAsText?: boolean;
showProblemStatisticsFooter?: boolean;
showDirtColumn?: boolean;
showSEColumn?: boolean;
rowBordered?: boolean;
rowStriped?: boolean;
columnBordered?: boolean;
emptyStatusPlaceholder?: string | null;
userAvatarPlacement?: 'user' | 'organization';
```

`RanklistColumnTitles` is text-only so the same concept can later map cleanly to
Vue, Solid, Svelte, and Angular:

```ts
interface RanklistColumnTitles {
  series?: string[] | ((series: srk.RankSeries, index: number) => string | undefined);
  organization?: string;
  user?: string;
  score?: string;
  time?: string;
  dirt?: string;
  se?: string;
}
```

Default labels are: series title from SRK, `Name`, `Organization`, `Score`,
`Time`, `Dirt`, and `SE`.

## Prop Reference

| Prop | Default | Contract |
| --- | --- | --- |
| `splitOrganization` | `false` | Inserts an Organization column before User and hides organization text from the default User cell. |
| `columnTitles` | SRK/default labels | Text-only title overrides for series, organization, user, score, time, dirt, and se columns. |
| `statusCellPreset` | `classic` | Chooses the reusable status content preset: `classic`, `detailed`, `minimal`, or `compact`. |
| `statusColorAsText` | `false` | Removes status fill backgrounds and uses bold status-colored text; FB adds a gold star marker. |
| `showProblemStatisticsFooter` | `false` | Renders the multi-row problem statistics footer plus the final problem alias row. |
| `showDirtColumn` | `false` | Appends the row Dirt percentage column after problem columns. |
| `showSEColumn` | `false` | Appends the row SE column after problems and after Dirt when both are enabled. |
| `rowBordered` | `false` | Enables row separators via shared CSS variables. |
| `rowStriped` | `false` | Enables striped body rows. |
| `columnBordered` | `false` | Enables column separators via shared CSS variables. |
| `emptyStatusPlaceholder` | `null` | Replaces no-submission status cell blank content with a custom string. |
| `userAvatarPlacement` | `user` | Moves the default avatar into the split Organization column only when set to `organization` and `splitOrganization` is enabled. |

## Behavior Rules

- `splitOrganization` inserts an Organization column between series columns and
  User. The default user cell must not duplicate organization text when the
  split column is active.
- `userAvatarPlacement` defaults to `user`. `organization` only has an effect
  when `splitOrganization` is enabled; in that case the default avatar moves
  from the User column into the Organization column before the organization
  text. Without split organization, avatars stay in the User column.
- `statusCellPreset` values:
  - `classic`: current rendering.
  - `detailed`: accepted line 1 is pass time, line 2 is `(-n)` when wrong tries
    exist. Rejected/frozen line 1 is an empty placeholder, line 2 is `(-tries)`
    when tries exist.
  - `minimal`: accepted is `+` or `+n`; rejected/frozen is `-n`.
  - `compact`: minimal first line plus pass time on a second line for accepted
    cells. Rejected/frozen cells render `-n`; when `tries > 0` and `solutions`
    contains at least one penalty-bearing solution after filtering
    `sorter.config.noPenaltyResults`, render the last such solution time on a
    second line. If no penalty-bearing solution exists, keep the single `-n`
    line.
- No-submission statuses remain blank in all presets.
- `emptyStatusPlaceholder` changes only no-submission status cells (`result:
  null`). Its default is `null`, which preserves the blank cell behavior.
- Status time formatting uses ICPC sorter `config.timePrecision` when present,
  otherwise the status time unit. Minute or coarser displays `h:mm`, seconds
  displays `h:mm:ss`, milliseconds displays `h:mm:ss.SSS`.
- `statusColorAsText` removes status fill backgrounds and uses bold colored
  text for status emphasis. FB cells additionally render a gold star inside the
  cell near the top-right corner.
- Footer statistics use `status.tries` as the valid submission source:
  - Accepted: number of users whose status result is `AC` or `FB`.
    The cell shows a second line `(r%)`, where `r` is
    `Math.floor(accepted / participantCount * 100)`. If the participant count
    is `0`, show `(-)`.
  - Tried: number of users with `tries > 0`.
    The cell shows a second line `(r%)`, where `r` is
    `Math.floor(tried / participantCount * 100)`. If the participant count is
    `0`, show `(-)`.
  - Submitted: sum of `tries`.
  - Dirt: among users who accepted this problem (`AC` or `FB`), sum
    `max(tries - 1, 0)` as the first line. The second line is `(r%)`, where
    `r` is `Math.floor(dirt / acceptedSubmitted * 100)` and
    `acceptedSubmitted` is the sum of `tries` for accepted users. If
    `acceptedSubmitted` is `0`, show `(-)`.
  - SE: average hardness, formatted with two decimals as
    `(participantCount - accepted) / participantCount` using round-to-nearest
    formatting. If the participant count is `0`, show `-`.
  - FB at and LB at are separate rows, formatted as floored minute integers.
- Footer label rows use the shared marker tooltip style with these English
  explanations. The tooltip class must be attached to the inner label text
  element, not the full footer row, so the tooltip is anchored on the text
  itself. Footer statistic tooltips are positioned to the left of their labels
  and the tooltip pseudo-element must not receive pointer events, otherwise the
  hover hot zone can drift to the tooltip bubble:
  - Accepted: number of participants who solved this problem
  - Tried: number of participants who attempted this problem
  - Submitted: total number of valid submissions for this problem
  - Dirt: wrong submissions among participants who solved this problem
  - SE: average hardness, calculated as `(participants - accepted) / participants`
  - FB at: First Blood at, also known as first solve time, in minutes
  - LB at: Last Blood at, also known as last solve time, in minutes
- Footer statistics must be structured as real table rows: one `<tr>` per
  statistic item, with the left label cell spanning all non-problem columns and
  each problem value in its own cell. Do not stack all statistic rows inside a
  single footer cell; that breaks label/value alignment and prevents footer
  rows from naturally following row striping and row border styles. Row striping
  and row borders apply only to per-problem statistic value cells; do not apply
  them to the left label cell or to right-side alignment-only extra cells such
  as the Dirt or SE footer cells.
- Footer statistics end with one extra problem label row after `LB at`. Its
  per-problem cells render only the problem alias (or the alphabet fallback)
  and reuse the problem-header background treatment with the gradient direction
  reversed by 180 degrees, without the header's accepted-count second line.
  Their background is clipped to the padding box so transparent row-border
  space does not show a colored top edge when row borders are disabled.
- Dirt only considers accepted problems. Numerator is sum of `tries - 1`;
  denominator is sum of `tries`; percentages are floored integers and zero
  denominator renders `0%`.
- `showSEColumn` appends a contestant `SE` column after the problem columns.
  When `showDirtColumn` is also enabled, `SE` is placed after `Dirt`.
  Contestant SE is the average of the per-problem SE values for every problem
  the row accepted (`AC` or `FB`). A row with no accepted problems renders
  `0.00`. Contestant SE uses the same two-decimal round-to-nearest formatting
  as the footer SE row.
- `Score`, `Time`, `Dirt`, and `SE` column headers are right-aligned to match
  their numeric body cells.
- If the footer and appended extra columns are both enabled, the footer gets
  one empty alignment cell for each enabled extra column, in column order
  (`Dirt`, then `SE`).
- `rowBordered` enables a light horizontal separator between body rows. The
  color is controlled by `--srk-table-row-border-color`, which defaults to
  `--srk-table-border` only when row borders are enabled.
- `rowStriped` enables the existing `.srk-table-row-striped` body-row
  background treatment.
- `columnBordered` enables light vertical separators between columns. The color
  is controlled by `--srk-table-column-border-color`, which defaults to
  `--srk-table-border` only when column borders are enabled. Column separator
  border rules must be scoped behind `.srk-table-column-bordered`; transparent
  borders must not be emitted for the disabled state. Use an inset separator
  rather than collapsed table borders so sticky problem headers and body cells
  render the same separator color. Footer alignment-only extra cells for
  appended columns (`Dirt`, `SE`) must not render column separators.
- Series segment markers are visual-only overlays, not real table borders.
  They must use an inner pseudo-element driven by
  `--srk-series-segment-border-width` and `--srk-series-segment-color`, so
  `columnBordered` separators stay aligned with headers and non-segment rows.
  Any series column that can display a preset segment marker must reserve
  right-side content padding for the whole column with
  `srk-series-segmented-column` and `--srk-series-segment-content-gap`;
  otherwise rows without an active marker no longer align with rows that do
  have one. When row borders are disabled, preset segment marker pseudo-elements
  also bleed across the transparent 1px row boundary with
  `--srk-series-segment-row-bleed`; `.srk-table-row-bordered` resets this bleed
  to `0px` so real row separators remain visible.
- Problem header cells keep an opaque base background under their existing
  problem-style gradient and sit above body rows while sticky, so status text
  cannot show through during scroll.
- Empty status placeholders use a centered placeholder cell class and must not
  inherit any accepted/failed/frozen/FB status highlight class.

## Rollout Status

- React/Vue workspace: implemented in source; focused option tests, `pnpm test:workspace`,
  `pnpm build:styles`, `pnpm build:core`, and `pnpm build:react` have been
  run during the pilot.
  Latest feedback pass adds footer tooltip labels, wider footer row spacing,
  row/column border props, empty status placeholders, text-anchored footer
  tooltips, scoped column border CSS, and sticky problem header bleed-through
  protection. Follow-up QA changed column separators to inset shadows and moved
  footer statistic tooltips to the left side with pointer-events disabled.
  Latest compact preset update adds rejected/frozen second-line penalty solution
  time when `solutions` data can identify a last effective wrong submission.
  Latest avatar placement update adds `userAvatarPlacement` for moving the
  default avatar into the split Organization column. Latest series segment pass
  keeps marker bars out of table border geometry so column separators align
  when `columnBordered` is enabled, while preserving the old text-to-marker
  spacing across the whole affected series column and preventing row-gap breaks
  when row borders are disabled. Latest footer statistics update adds Accepted
  and Tried percentages, per-problem Dirt and SE rows, and renames FB/LB labels
  to `FB at` / `LB at`. Latest footer layout pass renders each statistic as its
  own table row so label/value alignment is handled by the table layout itself,
  and scopes footer striping/borders to problem statistic value cells only.
  Latest SE column update adds `showSEColumn`, keeps appended extra columns in
  `Dirt` then `SE` order, and standardizes SE formatting to two-decimal
  round-to-nearest output for both footer and contestant values. Final React
  pilot cleanup extracts status preset presentation into core and documents the
  prop contracts, shared implementation map, and test coverage matrix for the
  upcoming framework ports.
- Vue, Solid, Svelte, Angular: pending React manual confirmation.

## React Implementation Notes

- Runtime helpers for shared logic live in core so later framework ports can use
  the same time formatting, status preset presentation, footer statistics,
  problem header background gradients, Dirt, and SE calculation rules.
- Shared CSS for row/column borders, status color-as-text, FB star markers,
  split Organization/avatar layout, series segment bars, footer rows, footer
  tooltips, and footer problem alias cells lives in the styles package.
- Framework packages should keep only framework rendering/composition local.
  Any portable value calculation or formatting needed by multiple renderers
  should be added to core before ports proceed.
- The root Vitest workspace aliases the core package to `packages/core/src` so
  tests exercise source changes instead of stale local `dist` artifacts.
- React still imports core by package name for normal builds; build order remains
  core before React.

## Test Coverage

- React option tests cover split organization, custom titles, right-aligned
  numeric/extra headers, avatar placement, all status presets, sorter precision
  time formatting, compact rejected penalty solution time, color-as-text FB star,
  footer statistics rows, footer tooltips, footer problem alias row, Dirt, SE,
  empty placeholders, and row/column border classes.
- Structure tests cover shared CSS selector contracts for gated column borders,
  footer extra-cell border exclusions, opaque problem headers, footer problem
  alias row styling, left-positioned tooltips, footer striping/row borders, and
  segment marker geometry.
- React dev tests cover the local `dev:react` controls for the new props,
  Showcase/Baseline presets, and the default modal wiring remains intact.
