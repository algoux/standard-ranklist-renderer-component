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
  let splitOrganization = true;
  let useCustomColumnTitles = true;
  let statusCellPreset = 'compact';
  let statusColorAsText = true;
  let showProblemStatisticsFooter = true;
  let showDirtColumn = true;
  let showSEColumn = true;
  let rowBordered = true;
  let columnBordered = true;
  let emptyStatusPlaceholderValue = '·';
  let userAvatarPlacement = 'organization';
  const preferredTheme = resolvePreferredTheme();
  const demoColumnTitles = {
    series: (series, index) => (index === 0 ? 'Rank' : series.title || `Series ${index + 1}`),
    organization: 'School',
    user: 'Team',
    score: 'Solved',
    time: 'Penalty',
    dirt: 'Dirt',
    se: 'SE',
  };
  const statusPresetOptions = [
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
  const userAvatarPlacementOptions = [
    { value: 'user', label: 'User' },
    { value: 'organization', label: 'Organization' },
  ];

  $: staticRanklist = convertToStaticRanklist(ranklist);
  $: emptyStatusPlaceholder = emptyStatusPlaceholderValue || null;

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

  function useBaselineOptions() {
    splitOrganization = false;
    useCustomColumnTitles = false;
    statusCellPreset = 'classic';
    statusColorAsText = false;
    showProblemStatisticsFooter = false;
    showDirtColumn = false;
    showSEColumn = false;
    rowBordered = false;
    columnBordered = false;
    emptyStatusPlaceholderValue = '';
    userAvatarPlacement = 'user';
  }

  function useShowcaseOptions() {
    splitOrganization = true;
    useCustomColumnTitles = true;
    statusCellPreset = 'compact';
    statusColorAsText = true;
    showProblemStatisticsFooter = true;
    showDirtColumn = true;
    showSEColumn = true;
    rowBordered = true;
    columnBordered = true;
    emptyStatusPlaceholderValue = '·';
    userAvatarPlacement = 'organization';
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
  <section class="preview-controls" aria-label="Ranklist render options">
    <div class="preview-control-row preview-control-row-primary">
      <label class="preview-field preview-select-field">
        <span>Status preset</span>
        <select aria-label="Status preset" bind:value={statusCellPreset}>
          {#each statusPresetOptions as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </label>
      <label class="preview-field preview-select-field">
        <span>Empty status placeholder</span>
        <select aria-label="Empty status placeholder" bind:value={emptyStatusPlaceholderValue}>
          {#each emptyStatusPlaceholderOptions as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </label>
      <label class="preview-field preview-select-field">
        <span>User avatar placement</span>
        <select aria-label="User avatar placement" bind:value={userAvatarPlacement}>
          {#each userAvatarPlacementOptions as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      </label>
      <button type="button" class="preview-action" on:click={useShowcaseOptions}>Showcase</button>
      <button type="button" class="preview-action" on:click={useBaselineOptions}>Baseline</button>
    </div>
    <div class="preview-control-row">
      <label class="preview-field preview-toggle-field">
        <input type="checkbox" aria-label="Split organization" bind:checked={splitOrganization} />
        <span>Split organization</span>
      </label>
      <label class="preview-field preview-toggle-field">
        <input type="checkbox" aria-label="Custom column titles" bind:checked={useCustomColumnTitles} />
        <span>Custom column titles</span>
      </label>
      <label class="preview-field preview-toggle-field">
        <input type="checkbox" aria-label="Text status colors" bind:checked={statusColorAsText} />
        <span>Text status colors</span>
      </label>
      <label class="preview-field preview-toggle-field">
        <input type="checkbox" aria-label="Problem statistics footer" bind:checked={showProblemStatisticsFooter} />
        <span>Problem statistics footer</span>
      </label>
      <label class="preview-field preview-toggle-field">
        <input type="checkbox" aria-label="Dirt column" bind:checked={showDirtColumn} />
        <span>Dirt column</span>
      </label>
      <label class="preview-field preview-toggle-field">
        <input type="checkbox" aria-label="SE column" bind:checked={showSEColumn} />
        <span>SE column</span>
      </label>
      <label class="preview-field preview-toggle-field">
        <input type="checkbox" aria-label="Row borders" bind:checked={rowBordered} />
        <span>Row borders</span>
      </label>
      <label class="preview-field preview-toggle-field">
        <input type="checkbox" aria-label="Column borders" bind:checked={columnBordered} />
        <span>Column borders</span>
      </label>
    </div>
  </section>
  <div class="preview-spacer"></div>
  <Ranklist
    data={staticRanklist}
    theme={preferredTheme}
    stripedRows
    {splitOrganization}
    columnTitles={useCustomColumnTitles ? demoColumnTitles : undefined}
    {statusCellPreset}
    {statusColorAsText}
    {showProblemStatisticsFooter}
    {showDirtColumn}
    {showSEColumn}
    {rowBordered}
    {columnBordered}
    {emptyStatusPlaceholder}
    {userAvatarPlacement}
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
