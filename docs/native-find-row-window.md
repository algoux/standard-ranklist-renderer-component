# Controlled row windows and native browser Find

All framework packages expose the same optional Ranklist rendering controls. They are display-only: pass the complete StaticRanklist to preserve ranks, problem disclosure, statistics and event payloads.

| Option | Type | Behavior |
| --- | --- | --- |
| `rowWindow` | `{ start: number; end: number }` | Zero-based, end-exclusive range of full rows. All participant row positions remain in the table. Omit to render the complete table. |
| `retainUserText` | `boolean` | Keep each participant's actual name and organization text nodes mounted outside the full-row range. There is no duplicate hidden search index. Default is false. |
| `columnWidths` | `readonly number[]` | Optional pixel widths in physical header order. Valid widths produce a fixed native colgroup; the Name column alone absorbs extra space. Invalid/incomplete/nonpositive widths fall back to normal table layout. |
| `rowHeight` | `number` | Optional minimum participant row height in pixels. Standard presets fit 60px with the opt-in 3px secondary-line gap; custom content can still enlarge a native table row. Content is not clipped to enforce a height. |

## Ownership and guarantees

Without `retainUserText`, offscreen rows contain an empty cell rather than searchable identity text. Supply an appropriate `rowHeight` when using this mode; the component does not estimate unseen row sizes.

The component does not attach scroll handlers, discover a scroll container, paginate data or calculate a viewport. The host controls `rowWindow`, normally with a buffer around its visible range. On the server, provide the same initial range as the first client render. A 60px row height can simplify host geometry; do not assume uniform heights for arbitrary custom content.

With `retainUserText`, built-in name/organization spans and their Text nodes survive transitions between light and full rows, including removing `rowWindow` to display the complete table. Browser Ctrl/Cmd+F and menu Find can locate offscreen identity text. The host must update its row window in response to the resulting scroll to mount the other cells. Matching/highlighting are browser-owned; no shortcut interception or replacement search UI is provided.

Only the supplied dataset and the selected display language are searchable. Filtering data removes those participants from the DOM. Updating language/name/organization can naturally update the text and browser search position. Offscreen rank values, scores, problem statuses, markers and avatars are not kept; omit `rowWindow` for full-table search, selection, export/printing, or consumers requiring complete cells. Application downloads should use the original data, not scrape the current window.

Rows are keyed by stable participant identity. Use unique user IDs. Window indices and click payload row indices always refer to the complete current data array, including after filtering/reordering. Anonymous CCPC26 columns retain their original reveal rules; windowing does not expose hidden problem identities or footer statistics.

Custom user cells/components/parts/templates take precedence and disable windowing for that table, preserving their full rendering contract. Custom status renderers are invoked only for full rows. Native search guarantees cover the built-in identity cells; custom content remains the caller's responsibility.

## Layout

For a valid `columnWidths`, provide one width per physical column: series rank columns; optional Organization; Name; Score; optional Time; every problem column; optional Dirt and SE. Name remains flexible, with its supplied width contributing to the table minimum. CCPC26 revealed/anonymous colgroups remain separate. Offscreen retained rows use one thin identity cell (two with Organization split), with logical ARIA column indices and real text positions matching full rows. Without fixed widths, empty cells retain the column structure instead of using offset-dependent thin cells.

The shared styles package owns retained identity, avatar/marker positioning, thin-row offsets and the opt-in secondary-line spacing. Consumers must load the framework package styles as documented. No application-specific patch or CSS copy is needed.

## Example

```ts
const controls = {
  rowWindow: { start: 100, end: 140 },
  retainUserText: true,
  rowHeight: 60,
};
```

Pass these as React/Solid props, Vue props, Svelte component props or Angular inputs. Keep the original `data` intact. Framework READMEs show the corresponding component syntax.

The core package exports `RanklistWindowOptions`, `RanklistRowWindow`, normalization helpers, `getRanklistTableLayout` and `isRanklistIdentityClick` for adapters. They do not depend on a framework; layout computation is deterministic for SSR.

## Release and validation

This change is released as a patch version at the maintainer's explicit request. All seven published packages participate so the rendering contract and required shared styles ship together. Validation covers shared window/layout rules and each framework's retained node identity, complete-row transitions, global event indices, custom-user fallback and existing display/CCPC26 contracts.
