import type * as srk from '@algoux/standard-ranklist';
import {
  EnumTheme,
  convertToStaticRanklist,
  filterSolutionsUntil,
  getSortedCalculatedRawSolutions,
  regenerateRanklistBySolutions,
} from '@algoux/standard-ranklist-utils';
import { createEffect, createMemo, createSignal } from 'solid-js';
import demoData from '../../../demo.json';
import type {
  RanklistColumnTitles,
  RanklistStatusCellPreset,
  RanklistUserAvatarPlacement,
  SolutionClickPayload,
  StaticRanklist,
  UserClickPayload,
} from '../src';
import { DefaultSolutionModal, DefaultUserModal, ProgressBar, Ranklist } from '../src';

import './style.css';

const originalRanklist = demoData as srk.Ranklist;
const sortedSolutions = getSortedCalculatedRawSolutions(originalRanklist.rows);
const demoColumnTitles: RanklistColumnTitles = {
  series: (series, index) => (index === 0 ? 'Rank' : series.title || `Series ${index + 1}`),
  organization: 'School',
  user: 'Team',
  score: 'Solved',
  time: 'Penalty',
  dirt: 'Dirt',
  se: 'SE',
};
const statusPresetOptions: Array<{ value: RanklistStatusCellPreset; label: string }> = [
  { value: 'classic', label: 'Classic' },
  { value: 'detailed', label: 'Detailed' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'compact', label: 'Compact' },
];
const emptyStatusPlaceholderOptions = [
  { value: '', label: 'None' },
  { value: '·', label: 'Dot' },
  { value: '-', label: 'Dash' },
];
const userAvatarPlacementOptions: Array<{ value: RanklistUserAvatarPlacement; label: string }> = [
  { value: 'user', label: 'User' },
  { value: 'organization', label: 'Organization' },
];

function resolvePreferredTheme() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return EnumTheme.light;
  }

  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? EnumTheme.dark : EnumTheme.light;
  } catch {
    return EnumTheme.light;
  }
}

export default function App() {
  const [ranklist, setRanklist] = createSignal<srk.Ranklist>(originalRanklist);
  const [activeUserClick, setActiveUserClick] = createSignal<UserClickPayload | null>(null);
  const [activeSolutionClick, setActiveSolutionClick] = createSignal<SolutionClickPayload | null>(null);
  const [splitOrganization, setSplitOrganization] = createSignal(true);
  const [useCustomColumnTitles, setUseCustomColumnTitles] = createSignal(true);
  const [statusCellPreset, setStatusCellPreset] = createSignal<RanklistStatusCellPreset>('compact');
  const [statusColorAsText, setStatusColorAsText] = createSignal(true);
  const [showProblemStatisticsFooter, setShowProblemStatisticsFooter] = createSignal(true);
  const [showDirtColumn, setShowDirtColumn] = createSignal(true);
  const [showSEColumn, setShowSEColumn] = createSignal(true);
  const [rowBordered, setRowBordered] = createSignal(true);
  const [columnBordered, setColumnBordered] = createSignal(true);
  const [emptyStatusPlaceholder, setEmptyStatusPlaceholder] = createSignal<string | null>('·');
  const [userAvatarPlacement, setUserAvatarPlacement] = createSignal<RanklistUserAvatarPlacement>('organization');
  const staticRanklist = createMemo(() => convertToStaticRanklist(ranklist()) as StaticRanklist);
  const preferredTheme = resolvePreferredTheme();
  let statusPresetSelectRef: HTMLSelectElement | undefined;
  let emptyStatusPlaceholderSelectRef: HTMLSelectElement | undefined;
  let userAvatarPlacementSelectRef: HTMLSelectElement | undefined;

  createEffect(() => {
    const value = statusCellPreset();

    if (statusPresetSelectRef) {
      statusPresetSelectRef.value = value;
    }
  });

  createEffect(() => {
    const value = emptyStatusPlaceholder() || '';

    if (emptyStatusPlaceholderSelectRef) {
      emptyStatusPlaceholderSelectRef.value = value;
    }
  });

  createEffect(() => {
    const value = userAvatarPlacement();

    if (userAvatarPlacementSelectRef) {
      userAvatarPlacementSelectRef.value = value;
    }
  });

  const handleTimeTravel = (time: number | null) => {
    if (time === null) {
      setRanklist(originalRanklist);
    } else {
      setRanklist(
        regenerateRanklistBySolutions(
          originalRanklist,
          filterSolutionsUntil(sortedSolutions, [time, 'ms']),
        ) as srk.Ranklist,
      );
    }
    setActiveUserClick(null);
    setActiveSolutionClick(null);
  };

  const handleUserClick = (payload: UserClickPayload) => {
    setActiveUserClick(payload);
    setActiveSolutionClick(null);
  };

  const handleSolutionClick = (payload: SolutionClickPayload) => {
    setActiveUserClick(null);
    setActiveSolutionClick(payload);
  };

  const useBaselineOptions = () => {
    setSplitOrganization(false);
    setUseCustomColumnTitles(false);
    setStatusCellPreset('classic');
    setStatusColorAsText(false);
    setShowProblemStatisticsFooter(false);
    setShowDirtColumn(false);
    setShowSEColumn(false);
    setRowBordered(false);
    setColumnBordered(false);
    setEmptyStatusPlaceholder(null);
    setUserAvatarPlacement('user');
  };

  const useShowcaseOptions = () => {
    setSplitOrganization(true);
    setUseCustomColumnTitles(true);
    setStatusCellPreset('compact');
    setStatusColorAsText(true);
    setShowProblemStatisticsFooter(true);
    setShowDirtColumn(true);
    setShowSEColumn(true);
    setRowBordered(true);
    setColumnBordered(true);
    setEmptyStatusPlaceholder('·');
    setUserAvatarPlacement('organization');
  };

  return (
    <main class="preview-shell">
      <ProgressBar
        data={ranklist()}
        td={ranklist()._now ? Date.now() - new Date(ranklist()._now).getTime() : 0}
        live
        enableTimeTravel
        onTimeTravel={handleTimeTravel}
      />
      <div class="preview-spacer" />
      <section class="preview-controls" aria-label="Ranklist render options">
        <div class="preview-control-row preview-control-row-primary">
          <label class="preview-field preview-select-field">
            <span>Status preset</span>
            <select
              ref={statusPresetSelectRef}
              aria-label="Status preset"
              value={statusCellPreset()}
              onChange={(event) => setStatusCellPreset(event.currentTarget.value as RanklistStatusCellPreset)}
            >
              {statusPresetOptions.map((option) => (
                <option value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label class="preview-field preview-select-field">
            <span>Empty status placeholder</span>
            <select
              ref={emptyStatusPlaceholderSelectRef}
              aria-label="Empty status placeholder"
              value={emptyStatusPlaceholder() || ''}
              onChange={(event) => setEmptyStatusPlaceholder(event.currentTarget.value || null)}
            >
              {emptyStatusPlaceholderOptions.map((option) => (
                <option value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label class="preview-field preview-select-field">
            <span>User avatar placement</span>
            <select
              ref={userAvatarPlacementSelectRef}
              aria-label="User avatar placement"
              value={userAvatarPlacement()}
              onChange={(event) => setUserAvatarPlacement(event.currentTarget.value as RanklistUserAvatarPlacement)}
            >
              {userAvatarPlacementOptions.map((option) => (
                <option value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <button type="button" class="preview-action" onClick={() => useShowcaseOptions()}>
            Showcase
          </button>
          <button type="button" class="preview-action" onClick={() => useBaselineOptions()}>
            Baseline
          </button>
        </div>
        <div class="preview-control-row">
          <ToggleField label="Split organization" checked={splitOrganization} onChange={setSplitOrganization} />
          <ToggleField label="Custom column titles" checked={useCustomColumnTitles} onChange={setUseCustomColumnTitles} />
          <ToggleField label="Text status colors" checked={statusColorAsText} onChange={setStatusColorAsText} />
          <ToggleField
            label="Problem statistics footer"
            checked={showProblemStatisticsFooter}
            onChange={setShowProblemStatisticsFooter}
          />
          <ToggleField label="Dirt column" checked={showDirtColumn} onChange={setShowDirtColumn} />
          <ToggleField label="SE column" checked={showSEColumn} onChange={setShowSEColumn} />
          <ToggleField label="Row borders" checked={rowBordered} onChange={setRowBordered} />
          <ToggleField label="Column borders" checked={columnBordered} onChange={setColumnBordered} />
        </div>
      </section>
      <div class="preview-spacer" />
      <Ranklist
        data={staticRanklist()}
        theme={preferredTheme}
        stripedRows
        splitOrganization={splitOrganization()}
        columnTitles={useCustomColumnTitles() ? demoColumnTitles : undefined}
        statusCellPreset={statusCellPreset()}
        statusColorAsText={statusColorAsText()}
        showProblemStatisticsFooter={showProblemStatisticsFooter()}
        showDirtColumn={showDirtColumn()}
        showSEColumn={showSEColumn()}
        rowBordered={rowBordered()}
        columnBordered={columnBordered()}
        emptyStatusPlaceholder={emptyStatusPlaceholder()}
        userAvatarPlacement={userAvatarPlacement()}
        onSolutionClick={handleSolutionClick}
        onUserClick={handleUserClick}
      />
      <DefaultUserModal
        open={!!activeUserClick()}
        user={activeUserClick()?.user}
        markers={staticRanklist().markers}
        theme={preferredTheme}
        onClose={() => setActiveUserClick(null)}
      />
      <DefaultSolutionModal
        open={!!activeSolutionClick()}
        user={activeSolutionClick()?.user}
        problem={activeSolutionClick()?.problem}
        problemIndex={activeSolutionClick()?.problemIndex || 0}
        solutions={activeSolutionClick()?.solutions || []}
        onClose={() => setActiveSolutionClick(null)}
      />
    </main>
  );
}

function ToggleField(props: { label: string; checked: () => boolean; onChange: (checked: boolean) => void }) {
  let inputRef: HTMLInputElement | undefined;

  createEffect(() => {
    const checked = props.checked();

    if (inputRef) {
      inputRef.checked = checked;
    }
  });

  return (
    <label class="preview-field preview-toggle-field">
      <input
        ref={inputRef}
        type="checkbox"
        aria-label={props.label}
        checked={props.checked()}
        onChange={(event) => props.onChange(event.currentTarget.checked)}
      />
      <span>{props.label}</span>
    </label>
  );
}
