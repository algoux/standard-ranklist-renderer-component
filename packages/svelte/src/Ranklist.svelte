<script>
  import {
    EnumTheme,
    formatTimeDuration,
    numberToAlphabet,
    resolveStyle,
    resolveText,
    resolveUserMarkers,
  } from '@algoux/standard-ranklist-utils';
  import { createEventDispatcher } from 'svelte';
  import {
    calculateDirtPercentage,
    calculateProblemStatisticsFooter,
    calculateSEValue,
    captureModalTriggerPointFromMouseEvent,
    formatProblemStatisticsAcceptedMinute,
    formatProblemStatisticsAverageHardness,
    formatProblemStatisticsPercent,
    getMarkerPresentation,
    getProblemHeaderBackgroundImage,
    getRankProblemStatusCellPresentation,
    resolveSrkAssetUrl,
    shouldShowTimeColumn,
  } from '@algoux/standard-ranklist-renderer-component-core';
  import { caniuse, srkSupportedVersions } from '@algoux/standard-ranklist-renderer-component-core';

  export let data;
  export let theme = EnumTheme.light;
  export let rowBordered = false;
  export let columnBordered = false;
  export let rowStriped = false;
  export let formatSrkAssetUrl = undefined;
  export let splitOrganization = false;
  export let columnTitles = undefined;
  export let statusCellPreset = 'classic';
  export let statusColorAsText = false;
  export let showProblemStatisticsFooter = false;
  export let showDirtColumn = false;
  export let showSEColumn = false;
  export let emptyStatusPlaceholder = null;
  export let userAvatarPlacement = 'user';
  export let languages = undefined;

  const dispatch = createEventDispatcher();

  $: showTimeColumn = shouldShowTimeColumn(data.rows);
  $: isSupportedVersion = caniuse(data.version);
  $: showAvatarInOrganization = splitOrganization && userAvatarPlacement === 'organization';
  $: problemStatistics = showProblemStatisticsFooter || showSEColumn ? calculateProblemStatisticsFooter(data) : [];
  $: leftFooterColumnCount = data.series.length + 1 + 1 + (showTimeColumn ? 1 : 0) + (splitOrganization ? 1 : 0);

  const firstBloodStar = '\u2605';
  const footerRows = [
    {
      key: 'accepted',
      label: 'Accepted',
      tooltip: 'Number of participants who solved this problem',
    },
    {
      key: 'attempted',
      label: 'Attempted',
      tooltip: 'Number of participants who attempted this problem',
    },
    {
      key: 'submitted',
      label: 'Submitted',
      tooltip: 'Total number of valid submissions for this problem',
    },
    {
      key: 'dirt',
      label: 'Dirt',
      tooltip: 'Wrong submissions among participants who solved this problem',
    },
    {
      key: 'se',
      label: 'SE',
      tooltip: 'Average hardness, calculated as (participants - accepted) / participants',
    },
    {
      key: 'firstAccepted',
      label: 'FB at',
      tooltip: 'First Blood at, also known as first solve time, in minutes',
    },
    {
      key: 'lastAccepted',
      label: 'LB at',
      tooltip: 'Last Blood at, also known as last solve time, in minutes',
    },
  ];

  function formatAssetUrl(url, field) {
    return resolveSrkAssetUrl(url, field, formatSrkAssetUrl);
  }

  function resolveDisplayText(text) {
    return resolveText(text, languages);
  }

  function getRankValues(row) {
    return row.rankValues || data.series.map(() => ({ rank: null, segmentIndex: null }));
  }

  function getRankText(rankValue, row) {
    return rankValue.rank ? rankValue.rank : row.user.official === false ? '＊' : '';
  }

  function resolveSeriesColumnTitle(series, index, titles) {
    const seriesTitles = titles && titles.series;
    if (typeof seriesTitles === 'function') {
      return seriesTitles(series, index) ?? series.title;
    }
    if (Array.isArray(seriesTitles)) {
      return seriesTitles[index] ?? series.title;
    }
    return series.title;
  }

  function resolveColumnTitle(key, fallback, titles) {
    return titles && titles[key] !== undefined ? titles[key] : fallback;
  }

  function problemAlias(problem, problemIndex) {
    return problem.alias || numberToAlphabet(problemIndex);
  }

  function problemStatsTitle(statistics) {
    const ratio = statistics.submitted ? ((statistics.accepted / statistics.submitted) * 100).toFixed(1) : 0;
    return `${statistics.accepted} / ${statistics.submitted} (${ratio}%)`;
  }

  function getResolvedUserMarkers(user) {
    return resolveUserMarkers(user, data.markers || []).map((marker) => ({
      marker,
      presentation: getMarkerPresentation(marker, theme),
    }));
  }

  function markerClass(entry) {
    return `srk-marker srk-marker-dot srk--c-tooltip ${entry.presentation.className || ''}`;
  }

  function markerBackgroundColor(entry) {
    return entry.presentation.style && entry.presentation.style.backgroundColor;
  }

  function resolveSeriesSegment(rankValue, series) {
    const index = rankValue.segmentIndex || rankValue.segmentIndex === 0 ? rankValue.segmentIndex : -1;
    return ((series && series.segments) || [])[index] || {};
  }

  function getSeriesSegmentClass(rankValue, series) {
    const segmentStyle = resolveSeriesSegment(rankValue, series).style;
    return typeof segmentStyle === 'string' ? `srk-preset-series-segment-${segmentStyle}` : '';
  }

  function isSeriesSegmentedColumn(series) {
    return ((series && series.segments) || []).some((segment) => typeof segment.style === 'string');
  }

  function getSeriesSegmentStyle(rankValue, series) {
    const emptyColor = {
      [EnumTheme.light]: undefined,
      [EnumTheme.dark]: undefined,
    };
    const segmentStyle = resolveSeriesSegment(rankValue, series).style;
    if (!segmentStyle || typeof segmentStyle === 'string') {
      return {};
    }
    const style = resolveStyle(segmentStyle);
    const textColor = style.textColor || emptyColor;
    const backgroundColor = style.backgroundColor || emptyColor;
    return {
      color: textColor[theme],
      backgroundColor: backgroundColor[theme],
    };
  }

  function getStatusSolutions(status) {
    return [...(status.solutions || [])].reverse();
  }

  function hasSolutions(status) {
    return getStatusSolutions(status).length > 0;
  }

  function statusCellClass(status, colorAsText) {
    const classNames = ['srk-prest-status-block', 'srk--text-center', 'srk--nowrap'];
    if (hasSolutions(status)) {
      classNames.push('srk--cursor-pointer');
    }
    if (colorAsText) {
      classNames.push('srk-prest-status-block-color-text');
    }
    if (status.result === 'FB') {
      classNames.push('srk-prest-status-block-fb');
    } else if (status.result === 'AC') {
      classNames.push('srk-prest-status-block-accepted');
    } else if (status.result === '?') {
      classNames.push('srk-prest-status-block-frozen');
    } else if (status.result === 'RJ') {
      classNames.push('srk-prest-status-block-failed');
    }
    return classNames.join(' ');
  }

  function statusPresentation(status, preset) {
    return getRankProblemStatusCellPresentation(status, data, preset);
  }

  function footerCellPrimary(key, stat) {
    switch (key) {
      case 'accepted':
        return stat.accepted;
      case 'attempted':
        return stat.attempted;
      case 'submitted':
        return stat.submitted;
      case 'dirt':
        return stat.dirt;
      case 'se':
        return formatProblemStatisticsAverageHardness(stat);
      case 'firstAccepted':
        return formatProblemStatisticsAcceptedMinute(stat.firstAcceptedTime);
      case 'lastAccepted':
        return formatProblemStatisticsAcceptedMinute(stat.lastAcceptedTime);
      default:
        return '';
    }
  }

  function footerCellSecondary(key, stat) {
    switch (key) {
      case 'accepted':
        return formatProblemStatisticsPercent(stat.accepted, stat.participantCount);
      case 'attempted':
        return formatProblemStatisticsPercent(stat.attempted, stat.participantCount);
      case 'dirt':
        return formatProblemStatisticsPercent(stat.dirt, stat.dirtSubmitted);
      default:
        return undefined;
    }
  }

  function emitUserClick(event, row, rowIndex) {
    if (event) {
      captureModalTriggerPointFromMouseEvent(event, {
        source: 'user-cell',
        context: {
          rowIndex,
          userId: row.user.id || null,
          userName: resolveDisplayText(row.user.name),
        },
      });
    }
    dispatch('userClick', {
      user: row.user,
      row,
      rowIndex,
      ranklist: data,
    });
  }

  function emitSolutionClick(event, row, rowIndex, status, problemIndex) {
    const solutions = getStatusSolutions(status);
    if (!solutions.length) {
      return;
    }
    if (event) {
      captureModalTriggerPointFromMouseEvent(event, {
        source: 'status-cell',
        context: {
          rowIndex,
          problemIndex,
          problemAlias: data.problems[problemIndex] && data.problems[problemIndex].alias,
          problemTitle: data.problems[problemIndex] ? resolveDisplayText(data.problems[problemIndex].title) : null,
          userId: row.user.id || null,
        },
      });
    }
    dispatch('solutionClick', {
      user: row.user,
      row,
      rowIndex,
      problemIndex,
      problem: data.problems[problemIndex],
      status,
      solutions,
      ranklist: data,
    });
  }
</script>

{#if data.type !== 'general'}
  <div>srk type "{data.type}" is not supported</div>
{:else if !isSupportedVersion}
  <div>srk version "{data.version}" is not supported (current supported: {srkSupportedVersions})</div>
{:else}
  <div class="srk-common-table srk-main">
    <table
      class:srk-table-row-bordered={rowBordered}
      class:srk-table-column-bordered={columnBordered}
      class:srk-table-row-striped={rowStriped}
    >
      <thead>
        <tr>
          {#each data.series as seriesItem, seriesIndex}
            <th
              class="srk-series-header srk--text-right srk--nowrap"
              class:srk-series-segmented-column={isSeriesSegmentedColumn(seriesItem)}
            >
              {resolveSeriesColumnTitle(seriesItem, seriesIndex, columnTitles)}
            </th>
          {/each}
          {#if splitOrganization}
            <th class="srk-organization-header srk--text-left srk--nowrap">
              {resolveColumnTitle('organization', 'Organization', columnTitles)}
            </th>
          {/if}
          <th class="srk--text-left srk--nowrap">{resolveColumnTitle('user', 'Name', columnTitles)}</th>
          <th class="srk--text-right srk--nowrap">{resolveColumnTitle('score', 'Score', columnTitles)}</th>
          {#if showTimeColumn}
            <th class="srk--text-right srk--nowrap">{resolveColumnTitle('time', 'Time', columnTitles)}</th>
          {/if}
          {#each data.problems as problem, problemIndex}
            <th
              class="srk--nowrap srk-problem-header"
              style:background-image={getProblemHeaderBackgroundImage(problem.style, theme)}
            >
              <slot name="problem-header-cell" {problem} {problemIndex} index={problemIndex} {theme} {languages}>
                {#if problem.link}
                  <a href={problem.link} target="_blank" rel="noopener noreferrer" style="color: unset">
                    <span class="srk--display-block">{problemAlias(problem, problemIndex)}</span>
                    {#if problem.statistics}
                      <span class="srk--display-block srk-problem-stats" title={problemStatsTitle(problem.statistics)}>
                        {problem.statistics.accepted}
                      </span>
                    {/if}
                  </a>
                {:else}
                  <span class="srk--display-block">{problemAlias(problem, problemIndex)}</span>
                  {#if problem.statistics}
                    <span class="srk--display-block srk-problem-stats" title={problemStatsTitle(problem.statistics)}>
                      {problem.statistics.accepted}
                    </span>
                  {/if}
                {/if}
              </slot>
            </th>
          {/each}
          {#if showDirtColumn}
            <th class="srk-dirt-header srk--text-right srk--nowrap">{resolveColumnTitle('dirt', 'Dirt', columnTitles)}</th>
          {/if}
          {#if showSEColumn}
            <th class="srk-se-header srk--text-right srk--nowrap">{resolveColumnTitle('se', 'SE', columnTitles)}</th>
          {/if}
        </tr>
      </thead>
      <tbody>
        {#each data.rows as row, rowIndex}
          <tr>
            {#each getRankValues(row) as rankValue, seriesIndex}
              <td
                class={`srk--text-right srk--nowrap ${getSeriesSegmentClass(rankValue, data.series[seriesIndex])}`}
                class:srk-series-segmented-column={isSeriesSegmentedColumn(data.series[seriesIndex])}
                style:color={getSeriesSegmentStyle(rankValue, data.series[seriesIndex]).color}
                style:background-color={getSeriesSegmentStyle(rankValue, data.series[seriesIndex]).backgroundColor}
              >
                {getRankText(rankValue, row)}
              </td>
            {/each}
            {#if splitOrganization}
              <td
                class="srk-organization-cell srk--text-left srk--nowrap"
                class:srk-organization-cell-avatar={showAvatarInOrganization && !!row.user.avatar}
              >
                <div class="srk-organization-cell-content">
                  {#if showAvatarInOrganization && row.user.avatar}
                    <div class="srk-user-avatar">
                      <img src={formatAssetUrl(row.user.avatar, 'user.avatar')} alt="User Avatar" />
                    </div>
                  {/if}
                  <span
                    class="srk-organization-name-text"
                    title={row.user.organization ? resolveDisplayText(row.user.organization) : ''}
                  >
                    {row.user.organization ? resolveDisplayText(row.user.organization) : ''}
                  </span>
                </div>
              </td>
            {/if}
            <slot
              name="user-cell"
              user={row.user}
              {row}
              {rowIndex}
              ranklist={data}
              markers={data.markers}
              {theme}
              hideOrganization={splitOrganization}
              hideAvatar={showAvatarInOrganization}
              {languages}
              onClick={(event) => emitUserClick(event, row, rowIndex)}
            >
              <!-- svelte-ignore a11y-click-events-have-key-events -->
              <td
                class="srk--text-left srk--nowrap srk-user-cell srk--cursor-pointer"
                title=""
                on:click|preventDefault={(event) => emitUserClick(event, row, rowIndex)}
              >
                <div class="srk-user-cell-content">
                  {#if row.user.avatar && !showAvatarInOrganization}
                    <div class="srk-user-avatar">
                      <img src={formatAssetUrl(row.user.avatar, 'user.avatar')} alt="User Avatar" />
                    </div>
                  {/if}
                  <div class="srk-user-body">
                    <div class="srk-user-name-row">
                      <span class="srk-user-name-text" title={resolveDisplayText(row.user.name)}>
                        {resolveDisplayText(row.user.name)}
                      </span>
                      <span class="srk-marker-dot-group">
                        {#each getResolvedUserMarkers(row.user) as entry}
                          <span
                            class={markerClass(entry)}
                            style:background-color={markerBackgroundColor(entry)}
                            data-tooltip={resolveDisplayText(entry.marker.label)}
                          ></span>
                        {/each}
                      </span>
                    </div>
                    {#if row.user.organization && !splitOrganization}
                      <p class="srk-user-secondary-text srk--text-ellipsis" title="">
                        {resolveDisplayText(row.user.organization)}
                      </p>
                    {/if}
                  </div>
                </div>
              </td>
            </slot>
            <td class="srk--text-right srk--nowrap">{row.score.value}</td>
            {#if showTimeColumn}
              <td class="srk--text-right srk--nowrap">
                {row.score.time ? formatTimeDuration(row.score.time, 'min', Math.floor) : '-'}
              </td>
            {/if}
            {#each row.statuses as status, problemIndex}
              <slot
                name="status-cell"
                {status}
                problem={data.problems[problemIndex]}
                {problemIndex}
                user={row.user}
                {row}
                {rowIndex}
                ranklist={data}
                solutions={getStatusSolutions(status)}
                statusCellPreset={statusCellPreset}
                statusColorAsText={statusColorAsText}
                emptyStatusPlaceholder={emptyStatusPlaceholder}
                {languages}
                onClick={(event) => emitSolutionClick(event, row, rowIndex, status, problemIndex)}
              >
                {#if status.result === 'FB' || status.result === 'AC'}
                  {@const presentation = statusPresentation(status, statusCellPreset)}
                  <!-- svelte-ignore a11y-click-events-have-key-events -->
                  <td
                    class={statusCellClass(status, statusColorAsText)}
                    on:click|preventDefault={(event) => emitSolutionClick(event, row, rowIndex, status, problemIndex)}
                  >
                    {#if statusColorAsText && status.result === 'FB'}
                      <span class="srk-prest-status-block-fb-star">{firstBloodStar}</span>
                    {/if}
                    {#if typeof presentation.score === 'number'}
                      <span class="srk-prest-status-block-score">{presentation.score}</span>
                      <span class="srk-prest-status-block-score-details">{presentation.scoreDetails}</span>
                    {:else if presentation.secondary !== undefined}
                      <span class="srk-prest-status-block-primary">{presentation.primary || ''}</span>{' '}<span class="srk-prest-status-block-secondary">{presentation.secondary}</span>
                    {:else}
                      {presentation.primary}
                    {/if}
                  </td>
                {:else if status.result === '?' || status.result === 'RJ'}
                  {@const presentation = statusPresentation(status, statusCellPreset)}
                  <!-- svelte-ignore a11y-click-events-have-key-events -->
                  <td
                    class={statusCellClass(status, statusColorAsText)}
                    on:click|preventDefault={(event) => emitSolutionClick(event, row, rowIndex, status, problemIndex)}
                  >
                    {#if presentation.secondary !== undefined}
                      <span class="srk-prest-status-block-primary">{presentation.primary || ''}</span>{' '}<span class="srk-prest-status-block-secondary">{presentation.secondary}</span>
                    {:else}
                      {presentation.primary}
                    {/if}
                  </td>
                {:else}
                  <td class="srk-status-placeholder-cell srk--text-center srk--nowrap">
                    {emptyStatusPlaceholder == null ? '' : emptyStatusPlaceholder}
                  </td>
                {/if}
              </slot>
            {/each}
            {#if showDirtColumn}
              <td class="srk-dirt-cell srk--text-right srk--nowrap">{calculateDirtPercentage(row)}</td>
            {/if}
            {#if showSEColumn}
              <td class="srk-se-cell srk--text-right srk--nowrap">{calculateSEValue(row, problemStatistics)}</td>
            {/if}
          </tr>
        {/each}
      </tbody>
      {#if showProblemStatisticsFooter}
        <tfoot>
          {#each footerRows as footerRow}
            <tr class="srk-problem-statistics-footer-row">
              <td class="srk-problem-statistics-footer-labels srk--text-right srk--nowrap" colspan={leftFooterColumnCount}>
                <span class="srk-problem-statistics-footer-label srk--c-tooltip" data-tooltip={footerRow.tooltip}>
                  {footerRow.label}
                </span>
              </td>
              {#each problemStatistics as stat}
                {@const secondary = footerCellSecondary(footerRow.key, stat)}
                <td class="srk-problem-statistics-footer-cell srk--text-center srk--nowrap">
                  <span class="srk-problem-statistics-footer-primary">{footerCellPrimary(footerRow.key, stat)}</span>
                  {#if secondary !== undefined}
                    {' '}<span class="srk-problem-statistics-footer-secondary">{secondary}</span>
                  {/if}
                </td>
              {/each}
              {#if showDirtColumn}
                <td class="srk-problem-statistics-footer-cell srk-extra-statistics-footer-cell srk-dirt-footer-cell srk--nowrap">
                  <span class="srk-problem-statistics-footer-primary"></span>
                </td>
              {/if}
              {#if showSEColumn}
                <td class="srk-problem-statistics-footer-cell srk-extra-statistics-footer-cell srk-se-footer-cell srk--nowrap">
                  <span class="srk-problem-statistics-footer-primary"></span>
                </td>
              {/if}
            </tr>
          {/each}
          <tr class="srk-problem-statistics-footer-row srk-problem-statistics-footer-problem-label-row">
            <td class="srk-problem-statistics-footer-labels srk--text-right srk--nowrap" colspan={leftFooterColumnCount}></td>
            {#each data.problems as problem, problemIndex}
              <td
                class="srk-problem-statistics-footer-cell srk-problem-statistics-footer-problem-header srk-problem-header srk--text-center srk--nowrap"
                style:background-image={getProblemHeaderBackgroundImage(problem.style, theme, 0)}
              >
                <span class="srk--display-block">{problem.alias || numberToAlphabet(problemIndex)}</span>
              </td>
            {/each}
            {#if showDirtColumn}
              <td class="srk-problem-statistics-footer-cell srk-extra-statistics-footer-cell srk-dirt-footer-cell srk--nowrap">
                <span class="srk-problem-statistics-footer-primary"></span>
              </td>
            {/if}
            {#if showSEColumn}
              <td class="srk-problem-statistics-footer-cell srk-extra-statistics-footer-cell srk-se-footer-cell srk--nowrap">
                <span class="srk-problem-statistics-footer-primary"></span>
              </td>
            {/if}
          </tr>
        </tfoot>
      {/if}
    </table>
  </div>
{/if}
