# @algoux/standard-ranklist-renderer-component-core

Shared helpers, compatibility checks, and payload types for Standard Ranklist Renderer Component packages.

## Install

```bash
npm i -D @algoux/standard-ranklist
npm i -S @algoux/standard-ranklist-renderer-component-core
```

## Main Exports

- `convertToStaticRanklist`
- `caniuse`
- `srkSupportedVersions`
- `StaticRanklist`
- `UserClickPayload`
- `ProblemClickPayload`
- `SolutionClickPayload`
- `getRanklistProblemPresentation`
- `RanklistProblemPresentation`
- `getRankProblemDisplayStatus`
- `getSolutionDisplayResult`
- `isBeforeContestFreeze`

## Usage

```ts
import { caniuse } from '@algoux/standard-ranklist-renderer-component-core';
import { convertToStaticRanklist } from '@algoux/standard-ranklist-utils';
```

## CCPC26 presentation

`getRanklistProblemPresentation(data, enableCCPC26, ccpc26ProblemLayout?)` returns anonymous header/footer
slots, original per-row indexes, reveal flags and separator metadata. It delegates the
contest's threshold and ordering rules to utils. The display-status/result helpers hide
anonymous first blood without mutating payloads. `isBeforeContestFreeze(contest, elapsed)`
uses caller-provided milliseconds or null, and never reads a clock.

For filtered rows, pass a layout from utils `getCCPC26ProblemLayout(completeSlice)` as
the third argument. It preserves the complete slice's reveal thresholds without recounting
the displayed rows. Original problem indexes must match `data`. The layout is ignored if
CCPC26 is disabled or its standard configuration is absent.

All framework packages use these helpers and the common styles. See
[CCPC26 render options](../../docs/agents/ranklist-renderer-props.md#ccpc26-presentation) for the shared contract.
