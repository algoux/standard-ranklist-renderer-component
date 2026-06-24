import type * as srk from '@algoux/standard-ranklist';
import {
  EnumTheme,
  convertToStaticRanklist,
  filterSolutionsUntil,
  getSortedCalculatedRawSolutions,
  regenerateRanklistBySolutions,
  resolveText,
} from '@algoux/standard-ranklist-utils';
import {
  MODAL_ANIMATION_DURATION_MS,
  lockModalBodyScroll,
  resolveModalTransformOrigin,
  unlockModalBodyScroll,
} from '@algoux/standard-ranklist-renderer-component-core';
import type { JSX } from 'solid-js';
import { createEffect, createMemo, createSignal, onCleanup, untrack } from 'solid-js';
import { render as renderSolid } from 'solid-js/web';
import demoData from '../../../demo.json';
import type {
  RanklistColumnTitles,
  RanklistStatusCellPreset,
  RanklistUserAvatarPlacement,
  ProblemClickPayload,
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
type LanguageOptionValue = 'browser' | 'zh-CN' | 'en-US';
const languageOptions: Array<{ value: LanguageOptionValue; label: string }> = [
  { value: 'browser', label: 'Browser' },
  { value: 'zh-CN', label: 'zh-CN' },
  { value: 'en-US', label: 'en-US' },
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

function selectValue(event: Event) {
  return (event.target as HTMLSelectElement).value;
}

const cloneRanklist = (ranklist: srk.Ranklist): srk.Ranklist => JSON.parse(JSON.stringify(ranklist));

let globalLanguageListenerInstalled = false;
const [language, setLanguage] = createSignal<LanguageOptionValue>('browser');

function handleGlobalLanguageSelectEvent(event: Event) {
  const target = event.target as HTMLSelectElement | null;

  if (target?.getAttribute('aria-label') === 'Language') {
    setLanguage(target.value as LanguageOptionValue);
  }
}

function ensureGlobalLanguageListener() {
  if (globalLanguageListenerInstalled || typeof document === 'undefined') {
    return;
  }
  document.addEventListener('change', handleGlobalLanguageSelectEvent, true);
  document.addEventListener('input', handleGlobalLanguageSelectEvent, true);
  globalLanguageListenerInstalled = true;
}

export default function App() {
  const [ranklist, setRanklist] = createSignal<srk.Ranklist>(originalRanklist);
  const [activeUserClick, setActiveUserClick] = createSignal<UserClickPayload | null>(null);
  const [activeProblemClick, setActiveProblemClick] = createSignal<ProblemClickPayload | null>(null);
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
  setLanguage('browser');
  ensureGlobalLanguageListener();
  const selectedLanguages = createMemo(() => (language() === 'browser' ? undefined : [language()]));
  const staticRanklist = createMemo(() => {
    selectedLanguages();
    return convertToStaticRanklist(cloneRanklist(ranklist())) as StaticRanklist;
  });
  const preferredTheme = resolvePreferredTheme();
  let statusPresetSelectRef: HTMLSelectElement | undefined;
  let emptyStatusPlaceholderSelectRef: HTMLSelectElement | undefined;
  let userAvatarPlacementSelectRef: HTMLSelectElement | undefined;
  let languageSelectRef: HTMLSelectElement | undefined;

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

  createEffect(() => {
    const value = language();

    if (languageSelectRef) {
      languageSelectRef.value = value;
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
    setActiveProblemClick(null);
    setActiveSolutionClick(null);
  };

  const handleUserClick = (payload: UserClickPayload) => {
    setActiveUserClick(payload);
    setActiveProblemClick(null);
    setActiveSolutionClick(null);
  };

  const handleProblemClick = (payload: ProblemClickPayload) => {
    setActiveUserClick(null);
    setActiveProblemClick(payload);
    setActiveSolutionClick(null);
  };

  const handleSolutionClick = (payload: SolutionClickPayload) => {
    setActiveUserClick(null);
    setActiveProblemClick(null);
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
              onChange={(event) => setStatusCellPreset(selectValue(event) as RanklistStatusCellPreset)}
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
              onChange={(event) => setEmptyStatusPlaceholder(selectValue(event) || null)}
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
              onChange={(event) => setUserAvatarPlacement(selectValue(event) as RanklistUserAvatarPlacement)}
            >
              {userAvatarPlacementOptions.map((option) => (
                <option value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label class="preview-field preview-select-field">
            <span>Language</span>
            <select
              ref={languageSelectRef}
              aria-label="Language"
              value={language()}
              oninput={(event) => setLanguage(selectValue(event) as LanguageOptionValue)}
              onchange={(event) => setLanguage(selectValue(event) as LanguageOptionValue)}
              onInput={(event) => setLanguage(selectValue(event) as LanguageOptionValue)}
              onChange={(event) => setLanguage(selectValue(event) as LanguageOptionValue)}
            >
              {languageOptions.map((option) => (
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
      <ImperativeMount
        render={() => (
          <Ranklist
            data={staticRanklist()}
            theme={preferredTheme}
            rowStriped
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
            languages={selectedLanguages()}
            onProblemClick={handleProblemClick}
            onSolutionClick={handleSolutionClick}
            onUserClick={handleUserClick}
          />
        )}
      />
      <DefaultUserModal
        open={!!activeUserClick()}
        user={activeUserClick()?.user}
        markers={staticRanklist().markers}
        theme={preferredTheme}
        languages={selectedLanguages()}
        onClose={() => setActiveUserClick(null)}
      />
      <ProblemModal
        payload={activeProblemClick()}
        languages={selectedLanguages()}
        onClose={() => setActiveProblemClick(null)}
      />
      <DefaultSolutionModal
        open={!!activeSolutionClick()}
        user={activeSolutionClick()?.user}
        problem={activeSolutionClick()?.problem}
        problemIndex={activeSolutionClick()?.problemIndex || 0}
        solutions={activeSolutionClick()?.solutions || []}
        languages={selectedLanguages()}
        onClose={() => setActiveSolutionClick(null)}
      />
    </main>
  );
}

function ProblemModal(props: {
  payload: ProblemClickPayload | null;
  languages?: readonly string[];
  onClose: () => void;
}) {
  const [mounted, setMounted] = createSignal(!!props.payload);
  const [animationState, setAnimationState] = createSignal<'pre-open' | 'opening' | 'closing'>(
    props.payload ? 'pre-open' : 'closing',
  );
  const [transformOrigin, setTransformOrigin] = createSignal({ x: 0, y: 0 });
  let dialogRef: HTMLDivElement | undefined;
  let bodyRef: HTMLDivElement | undefined;
  let openTimer: number | null = null;
  let closeTimer: number | null = null;
  let bodyLocked = false;

  const clearTimers = () => {
    if (openTimer !== null) {
      window.clearTimeout(openTimer);
      openTimer = null;
    }
    if (closeTimer !== null) {
      window.clearTimeout(closeTimer);
      closeTimer = null;
    }
  };

  const lockBody = () => {
    if (!bodyLocked) {
      lockModalBodyScroll();
      bodyLocked = true;
    }
  };

  const unlockBody = () => {
    if (bodyLocked) {
      unlockModalBodyScroll();
      bodyLocked = false;
    }
  };

  const appendProblemModalText = (container: HTMLElement, label: string, value: string | number) => {
    const paragraph = document.createElement('p');
    paragraph.textContent = `${label}: ${value}`;
    container.appendChild(paragraph);
  };

  const renderProblemModalBody = (payload: ProblemClickPayload) => {
    if (!bodyRef || typeof document === 'undefined') {
      return;
    }

    const problem = payload.problem;
    const container = document.createElement('div');

    appendProblemModalText(container, 'Alias', problem.alias || payload.problemIndex + 1);
    appendProblemModalText(container, 'Title', resolveText(problem.title, props.languages) || '-');
    appendProblemModalText(container, 'Index', payload.problemIndex);

    if (problem.link) {
      const paragraph = document.createElement('p');
      const link = document.createElement('a');
      link.href = problem.link;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = problem.link;
      paragraph.append('Link: ', link);
      container.appendChild(paragraph);
    }

    if (problem.statistics) {
      appendProblemModalText(
        container,
        'Stats',
        `${problem.statistics.accepted} accepted / ${problem.statistics.submitted} submitted`,
      );
    }

    bodyRef.replaceChildren(container);
  };

  const playOpenAnimation = (payload: ProblemClickPayload) => {
    clearTimers();
    renderProblemModalBody(payload);
    setMounted(true);
    setTransformOrigin({ x: 0, y: 0 });
    dialogRef?.style.setProperty('--srk-modal-origin-x', '0px');
    dialogRef?.style.setProperty('--srk-modal-origin-y', '0px');
    setAnimationState('pre-open');
    lockBody();

    openTimer = window.setTimeout(() => {
      const resolution = resolveModalTransformOrigin(dialogRef || null);
      setTransformOrigin(resolution.origin);
      dialogRef?.style.setProperty('--srk-modal-origin-x', `${resolution.origin.x}px`);
      dialogRef?.style.setProperty('--srk-modal-origin-y', `${resolution.origin.y}px`);
      setAnimationState('opening');
      openTimer = null;
    }, 0);
  };

  const playCloseAnimation = () => {
    clearTimers();
    setAnimationState('closing');
    closeTimer = window.setTimeout(() => {
      setMounted(false);
      bodyRef?.replaceChildren();
      unlockBody();
      closeTimer = null;
    }, MODAL_ANIMATION_DURATION_MS);
  };

  createEffect(() => {
    const payload = props.payload;

    if (payload) {
      playOpenAnimation(payload);
      return;
    }

    if (untrack(mounted)) {
      playCloseAnimation();
    }
  });

  onCleanup(() => {
    clearTimers();
    unlockBody();
  });

  return (
    <div
      class="srk-modal-root srk-animated-modal-root srk-general-modal-root"
      data-srk-modal-state={animationState()}
      style={{ display: mounted() ? undefined : 'none' }}
    >
      <div class="srk-modal-mask" />
      <div
        class="srk-modal-wrap srk-problem-modal"
        tabIndex={-1}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            props.onClose();
          }
        }}
      >
        <div
          aria-labelledby="solid-problem-modal-title"
          aria-modal="true"
          class="srk-modal"
          data-srk-modal-panel="true"
          ref={(element) => {
            dialogRef = element;
          }}
          role="dialog"
          style={{
            width: '420px',
            '--srk-modal-max-width': '420px',
            '--srk-modal-origin-x': `${transformOrigin().x}px`,
            '--srk-modal-origin-y': `${transformOrigin().y}px`,
          }}
          tabIndex={-1}
        >
          <div class="srk-modal-content">
            <button aria-label="Close" class="srk-modal-close" type="button" onClick={props.onClose}>
              <span class="srk-modal-close-x" />
            </button>
            <div class="srk-modal-header">
              <div class="srk-modal-title" id="solid-problem-modal-title">
                Problem Info
              </div>
            </div>
            <div
              class="srk-modal-body"
              ref={(element) => {
                bodyRef = element;
              }}
            />
          </div>
        </div>
      </div>
    </div>
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

function ImperativeMount(props: { render: () => JSX.Element }) {
  let host: HTMLDivElement | undefined;
  let dispose: (() => void) | undefined;
  const [ready, setReady] = createSignal(false);

  createEffect(() => {
    if (!ready() || !host) {
      return;
    }

    dispose?.();
    host.replaceChildren();
    dispose = renderSolid(props.render, host);
  });

  onCleanup(() => {
    dispose?.();
  });

  return (
    <div
      ref={(element) => {
        host = element;
        setReady(true);
      }}
    />
  );
}
