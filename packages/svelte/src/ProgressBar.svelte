<script>
  import { secToTimeStr } from '@algoux/standard-ranklist-utils';
  import {
    getProgressDurationMinutes,
    getProgressMaxAvailableMinutes,
    getProgressMetrics,
    isProgressEnded,
  } from '@algoux/standard-ranklist-renderer-component-core';
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';

  export let data;
  export let enableTimeTravel = false;
  export let live = false;
  export let td = 0;

  const dispatch = createEventDispatcher();
  const timeTravelKeys = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown']);

  let localTime = Date.now();
  let inTimeMachine = false;
  let timeTravelIsChanging = false;
  let timeTravelCurrentValue = 0;
  let timeTravelValue = null;
  let liveInterval;
  let mounted = false;
  let previousContestTitle = '';

  $: durationMinutes = getProgressDurationMinutes(data.contest);
  $: maxAvailableMinutes = getProgressMaxAvailableMinutes(data.contest, localTime, td);
  $: isEnded = isProgressEnded(data.contest, localTime, td);
  $: progressMetrics = getProgressMetrics(data, localTime, td, Number(timeTravelCurrentValue), inTimeMachine);
  $: if (!timeTravelIsChanging && timeTravelValue === null && Number(timeTravelCurrentValue) !== maxAvailableMinutes) {
    timeTravelCurrentValue = maxAvailableMinutes;
  }
  $: {
    const contestTitle = JSON.stringify(data && data.contest && data.contest.title);
    if (previousContestTitle && contestTitle !== previousContestTitle) {
      timeTravelIsChanging = false;
      timeTravelCurrentValue = maxAvailableMinutes;
      timeTravelValue = null;
      inTimeMachine = false;
      dispatch('timeTravel', null);
    }
    previousContestTitle = contestTitle;
  }
  $: syncLiveInterval(live);

  function clearLiveInterval() {
    if (liveInterval !== undefined) {
      window.clearInterval(liveInterval);
      liveInterval = undefined;
    }
  }

  function syncLiveInterval(isLive) {
    if (!mounted || typeof window === 'undefined') {
      return;
    }
    if (isLive && liveInterval === undefined) {
      liveInterval = window.setInterval(handleProgressTimer, 1000);
      return;
    }
    if (!isLive) {
      clearLiveInterval();
    }
  }

  function handleProgressTimer() {
    localTime = Date.now();
    if (isEnded) {
      clearLiveInterval();
    }
  }

  function handleTimeTravelChange(value) {
    const numericValue = Number(value);
    const exited = numericValue >= durationMinutes || numericValue >= maxAvailableMinutes;
    dispatch('timeTravel', exited ? null : numericValue * 60 * 1000);
    inTimeMachine = !exited;
    timeTravelValue = exited ? null : numericValue * 60 * 1000;
    timeTravelIsChanging = false;
  }

  function beginTimeTravel() {
    timeTravelIsChanging = true;
    inTimeMachine = true;
  }

  function commitTimeTravel() {
    if (timeTravelIsChanging) {
      handleTimeTravelChange(timeTravelCurrentValue);
    }
  }

  function handleSliderKeyDown(event) {
    if (timeTravelKeys.has(event.key)) {
      beginTimeTravel();
    }
  }

  function handleSliderKeyUp(event) {
    if (timeTravelKeys.has(event.key)) {
      commitTimeTravel();
    }
  }

  function timeLabel(minutes) {
    return secToTimeStr(Number(minutes) * 60);
  }

  onMount(() => {
    mounted = true;
    syncLiveInterval(live);
  });

  onDestroy(() => {
    mounted = false;
    clearLiveInterval();
  });
</script>

<div class="srk-progress-bar-container">
  <div class="srk-progress-bar">
    <div class="srk-progress-bar-body">
      <div
        class="srk-progress-bar-segment srk-progress-bar-normal"
        style:width={`${progressMetrics.frozenBreakpoint * 100}%`}
      >
        <div class="srk-progress-bar-fill" style:width={`${progressMetrics.normalInnerPercent}%`}></div>
      </div>
      <div
        class="srk-progress-bar-segment srk-progress-bar-frozen"
        style:width={`${(1 - progressMetrics.frozenBreakpoint) * 100}%`}
      >
        <div class="srk-progress-bar-fill" style:width={`${progressMetrics.frozenInnerPercent}%`}></div>
      </div>
    </div>
    {#if enableTimeTravel && progressMetrics.supportRegen}
      <div class="srk-progress-slider-layer">
        {#if timeTravelIsChanging}
          <div
            class="srk-progress-slider-tooltip"
            style:left={`${durationMinutes ? (Number(timeTravelCurrentValue) / durationMinutes) * 100 : 0}%`}
          >
            {timeLabel(timeTravelCurrentValue)}
          </div>
        {/if}
        <input
          aria-label="Time Travel"
          class="srk-progress-slider"
          max={durationMinutes}
          min="0"
          step="1"
          title={timeLabel(timeTravelCurrentValue)}
          type="range"
          value={timeTravelCurrentValue}
          on:blur={() => {
            if (timeTravelIsChanging) {
              commitTimeTravel();
            }
          }}
          on:input={(event) => (timeTravelCurrentValue = Number(event.currentTarget.value))}
          on:keydown={handleSliderKeyDown}
          on:keyup={handleSliderKeyUp}
          on:mousedown={beginTimeTravel}
          on:mouseup={commitTimeTravel}
          on:touchend={commitTimeTravel}
          on:touchstart={beginTimeTravel}
        />
      </div>
    {/if}
  </div>
  <div class="srk-progress-secondary-area">
    <div class="srk-progress-secondary-area-left" style:display={live || inTimeMachine ? undefined : 'none'}>
      Elapsed: {secToTimeStr(Math.round(progressMetrics.elapsed / 1000))}
    </div>
    <div class="srk-progress-secondary-area-center">
      {#if inTimeMachine}
        <div class="srk-progress-time-machine-status">
          <div class="srk-progress-time-machine-text">Time Travel Mode</div>
        </div>
      {:else if live && !isEnded}
        <div class="srk-progress-live-text">Live</div>
      {:else}
        <div style="visibility: hidden">SRK</div>
      {/if}
    </div>
    <div class="srk-progress-secondary-area-right" style:display={live || inTimeMachine ? undefined : 'none'}>
      Remaining: {secToTimeStr(Math.round(progressMetrics.remaining / 1000))}
    </div>
  </div>
</div>
