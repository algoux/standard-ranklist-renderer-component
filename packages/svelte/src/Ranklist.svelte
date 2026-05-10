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
    captureModalTriggerPointFromMouseEvent,
    getAcceptedStatusDetails,
    getMarkerPresentation,
    getProblemHeaderBackgroundImage,
    resolveSrkAssetUrl,
    shouldShowTimeColumn,
  } from '@algoux/standard-ranklist-renderer-component-core';
  import { caniuse, srkSupportedVersions } from '@algoux/standard-ranklist-renderer-component-core';

  export let data;
  export let theme = EnumTheme.light;
  export let borderedRows = false;
  export let stripedRows = false;
  export let formatSrkAssetUrl = undefined;

  const dispatch = createEventDispatcher();

  $: showTimeColumn = shouldShowTimeColumn(data.rows);
  $: isSupportedVersion = caniuse(data.version);

  function formatAssetUrl(url, field) {
    return resolveSrkAssetUrl(url, field, formatSrkAssetUrl);
  }

  function getRankValues(row) {
    return row.rankValues || data.series.map(() => ({ rank: null, segmentIndex: null }));
  }

  function getRankText(rankValue, row) {
    return rankValue.rank ? rankValue.rank : row.user.official === false ? '＊' : '';
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

  function statusCellClass(status) {
    const classNames = ['srk-prest-status-block', 'srk--text-center', 'srk--nowrap'];
    if (hasSolutions(status)) {
      classNames.push('srk--cursor-pointer');
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

  function emitUserClick(event, row, rowIndex) {
    if (event) {
      captureModalTriggerPointFromMouseEvent(event, {
        source: 'user-cell',
        context: {
          rowIndex,
          userId: row.user.id || null,
          userName: resolveText(row.user.name),
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
          problemTitle: data.problems[problemIndex] && data.problems[problemIndex].title,
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
    <table class:srk-table-row-bordered={borderedRows} class:srk-table-row-striped={stripedRows}>
      <thead>
        <tr>
          {#each data.series as seriesItem}
            <th class="srk-series-header srk--text-right srk--nowrap">{seriesItem.title}</th>
          {/each}
          <th class="srk--text-left srk--nowrap">Name</th>
          <th class="srk--nowrap">Score</th>
          {#if showTimeColumn}
            <th class="srk--nowrap">Time</th>
          {/if}
          {#each data.problems as problem, problemIndex}
            <th
              class="srk--nowrap srk-problem-header"
              style:background-image={getProblemHeaderBackgroundImage(problem.style, theme)}
            >
              <slot name="problem-header-cell" {problem} {problemIndex} index={problemIndex} {theme}>
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
        </tr>
      </thead>
      <tbody>
        {#each data.rows as row, rowIndex}
          <tr>
            {#each getRankValues(row) as rankValue, seriesIndex}
              <td
                class={`srk--text-right srk--nowrap ${getSeriesSegmentClass(rankValue, data.series[seriesIndex])}`}
                style:color={getSeriesSegmentStyle(rankValue, data.series[seriesIndex]).color}
                style:background-color={getSeriesSegmentStyle(rankValue, data.series[seriesIndex]).backgroundColor}
              >
                {getRankText(rankValue, row)}
              </td>
            {/each}
            <slot
              name="user-cell"
              user={row.user}
              {row}
              {rowIndex}
              ranklist={data}
              markers={data.markers}
              {theme}
              onClick={(event) => emitUserClick(event, row, rowIndex)}
            >
              <!-- svelte-ignore a11y-click-events-have-key-events -->
              <td
                class="srk--text-left srk--nowrap srk-user-cell srk--cursor-pointer"
                title=""
                on:click|preventDefault={(event) => emitUserClick(event, row, rowIndex)}
              >
                <div class="srk-user-cell-content">
                  {#if row.user.avatar}
                    <div class="srk-user-avatar">
                      <img src={formatAssetUrl(row.user.avatar, 'user.avatar')} alt="User Avatar" />
                    </div>
                  {/if}
                  <div class="srk-user-body">
                    <div class="srk-user-name-row">
                      <span class="srk-user-name-text" title={resolveText(row.user.name)}>
                        {resolveText(row.user.name)}
                      </span>
                      <span class="srk-marker-dot-group">
                        {#each getResolvedUserMarkers(row.user) as entry}
                          <span
                            class={markerClass(entry)}
                            style:background-color={markerBackgroundColor(entry)}
                            data-tooltip={resolveText(entry.marker.label)}
                          ></span>
                        {/each}
                      </span>
                    </div>
                    {#if row.user.organization}
                      <p class="srk-user-secondary-text srk--text-ellipsis" title="">
                        {resolveText(row.user.organization)}
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
                onClick={(event) => emitSolutionClick(event, row, rowIndex, status, problemIndex)}
              >
                {#if status.result === 'FB' || status.result === 'AC'}
                  <!-- svelte-ignore a11y-click-events-have-key-events -->
                  <td
                    class={statusCellClass(status)}
                    on:click|preventDefault={(event) => emitSolutionClick(event, row, rowIndex, status, problemIndex)}
                  >
                    {#if typeof status.score === 'number'}
                      <span class="srk-prest-status-block-score">{status.score}</span>
                      <span class="srk-prest-status-block-score-details">{getAcceptedStatusDetails(status)}</span>
                    {:else}
                      {getAcceptedStatusDetails(status)}
                    {/if}
                  </td>
                {:else if status.result === '?' || status.result === 'RJ'}
                  <!-- svelte-ignore a11y-click-events-have-key-events -->
                  <td
                    class={statusCellClass(status)}
                    on:click|preventDefault={(event) => emitSolutionClick(event, row, rowIndex, status, problemIndex)}
                  >
                    {status.tries}
                  </td>
                {:else}
                  <td></td>
                {/if}
              </slot>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}
