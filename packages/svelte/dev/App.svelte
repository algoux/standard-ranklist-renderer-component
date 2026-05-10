<script>
  import {
    EnumTheme,
    convertToStaticRanklist,
    filterSolutionsUntil,
    getSortedCalculatedRawSolutions,
    regenerateRanklistBySolutions,
  } from '@algoux/standard-ranklist-utils';
  import demoData from '../../../demo.json';
  import { DefaultSolutionModal, DefaultUserModal, ProgressBar, Ranklist } from '../src';

  const originalRanklist = demoData;
  const sortedSolutions = getSortedCalculatedRawSolutions(originalRanklist.rows);
  let ranklist = originalRanklist;
  let activeUserClick = null;
  let activeSolutionClick = null;
  const preferredTheme = resolvePreferredTheme();

  $: staticRanklist = convertToStaticRanklist(ranklist);

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

  function handleTimeTravel(event) {
    const time = event.detail;
    if (time === null) {
      ranklist = originalRanklist;
    } else {
      ranklist = regenerateRanklistBySolutions(
        originalRanklist,
        filterSolutionsUntil(sortedSolutions, [time, 'ms']),
      );
    }
    activeUserClick = null;
    activeSolutionClick = null;
  }

  function handleUserClick(event) {
    activeUserClick = event.detail;
    activeSolutionClick = null;
  }

  function handleSolutionClick(event) {
    activeUserClick = null;
    activeSolutionClick = event.detail;
  }
</script>

<main class="preview-shell">
  <ProgressBar
    data={ranklist}
    td={ranklist._now ? Date.now() - new Date(ranklist._now).getTime() : 0}
    live
    enableTimeTravel
    on:timeTravel={handleTimeTravel}
  />
  <div class="preview-spacer"></div>
  <Ranklist
    data={staticRanklist}
    theme={preferredTheme}
    stripedRows
    on:solutionClick={handleSolutionClick}
    on:userClick={handleUserClick}
  />
  <DefaultUserModal
    open={!!activeUserClick}
    user={activeUserClick && activeUserClick.user}
    markers={staticRanklist.markers}
    theme={preferredTheme}
    on:close={() => (activeUserClick = null)}
  />
  <DefaultSolutionModal
    open={!!activeSolutionClick}
    user={activeSolutionClick && activeSolutionClick.user}
    problem={activeSolutionClick && activeSolutionClick.problem}
    problemIndex={(activeSolutionClick && activeSolutionClick.problemIndex) || 0}
    solutions={(activeSolutionClick && activeSolutionClick.solutions) || []}
    on:close={() => (activeSolutionClick = null)}
  />
</main>
