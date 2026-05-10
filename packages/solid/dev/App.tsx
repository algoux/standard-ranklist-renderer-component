import type * as srk from '@algoux/standard-ranklist';
import {
  EnumTheme,
  convertToStaticRanklist,
  filterSolutionsUntil,
  getSortedCalculatedRawSolutions,
  regenerateRanklistBySolutions,
} from '@algoux/standard-ranklist-utils';
import { createMemo, createSignal } from 'solid-js';
import demoData from '../../../demo.json';
import type { SolutionClickPayload, StaticRanklist, UserClickPayload } from '../src';
import { DefaultSolutionModal, DefaultUserModal, ProgressBar, Ranklist } from '../src';

import './style.css';

const originalRanklist = demoData as srk.Ranklist;
const sortedSolutions = getSortedCalculatedRawSolutions(originalRanklist.rows);

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
  const staticRanklist = createMemo(() => convertToStaticRanklist(ranklist()) as StaticRanklist);
  const preferredTheme = resolvePreferredTheme();

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
      <Ranklist
        data={staticRanklist()}
        theme={preferredTheme}
        stripedRows
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
