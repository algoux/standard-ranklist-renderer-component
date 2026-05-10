<template>
  <div class="srk-progress-bar-container">
    <div class="srk-progress-bar">
      <div class="srk-progress-bar-body">
        <div
          class="srk-progress-bar-segment srk-progress-bar-normal"
          :style="{ width: `${progressMetrics.frozenBreakpoint * 100}%` }"
        >
          <div class="srk-progress-bar-fill" :style="{ width: `${progressMetrics.normalInnerPercent}%` }"></div>
        </div>
        <div
          class="srk-progress-bar-segment srk-progress-bar-frozen"
          :style="{ width: `${(1 - progressMetrics.frozenBreakpoint) * 100}%` }"
        >
          <div class="srk-progress-bar-fill" :style="{ width: `${progressMetrics.frozenInnerPercent}%` }"></div>
        </div>
      </div>
      <div v-if="enableTimeTravel && progressMetrics.supportRegen" class="srk-progress-slider-layer">
        <div
          v-if="timeTravelIsChanging"
          class="srk-progress-slider-tooltip"
          :style="{ left: `${durationMinutes ? (timeTravelCurrentValue / durationMinutes) * 100 : 0}%` }"
        >
          {{ secToTimeStr(timeTravelCurrentValue * 60) }}
        </div>
        <input
          v-model.number="timeTravelCurrentValue"
          aria-label="Time Travel"
          class="srk-progress-slider"
          :max="durationMinutes"
          min="0"
          step="1"
          :title="secToTimeStr(timeTravelCurrentValue * 60)"
          type="range"
          @blur="commitTimeTravel"
          @keydown="beginTimeTravel"
          @keyup="commitTimeTravel"
          @mousedown="beginTimeTravel"
          @mouseup="commitTimeTravel"
          @touchend="commitTimeTravel"
          @touchstart="beginTimeTravel"
        />
      </div>
    </div>
    <div class="srk-progress-secondary-area">
      <div class="srk-progress-secondary-area-left" :style="live || inTimeMachine ? {} : { display: 'none' }">
        Elapsed: {{ secToTimeStr(Math.round(progressMetrics.elapsed / 1000)) }}
      </div>
      <div class="srk-progress-secondary-area-center">
        <div v-if="inTimeMachine" class="srk-progress-time-machine-status">
          <div class="srk-progress-time-machine-text">Time Travel Mode</div>
        </div>
        <div v-else-if="live && !isEnded" class="srk-progress-live-text">Live</div>
        <div v-else style="visibility: hidden">SRK</div>
      </div>
      <div class="srk-progress-secondary-area-right" :style="live || inTimeMachine ? {} : { display: 'none' }">
        Remaining: {{ secToTimeStr(Math.round(progressMetrics.remaining / 1000)) }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type * as srk from '@algoux/standard-ranklist';
import { secToTimeStr } from '@algoux/standard-ranklist-utils';
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import {
  getProgressDurationMinutes,
  getProgressMaxAvailableMinutes,
  getProgressMetrics,
  isProgressEnded,
} from '@algoux/standard-ranklist-renderer-component-core';

const props = withDefaults(
  defineProps<{
    data: srk.Ranklist;
    enableTimeTravel?: boolean;
    live?: boolean;
    td?: number;
  }>(),
  {
    enableTimeTravel: false,
    live: false,
    td: 0,
  },
);

const emit = defineEmits<{
  timeTravel: [time: number | null];
}>();

const localTime = ref(Date.now());
const inTimeMachine = ref(false);
const timeTravelIsChanging = ref(false);
const timeTravelCurrentValue = ref(getProgressMaxAvailableMinutes(props.data.contest, localTime.value, props.td));
const timeTravelValue = ref<number | null>(null);
let liveInterval: number | undefined;

const durationMinutes = computed(() => getProgressDurationMinutes(props.data.contest));
const maxAvailableMinutes = computed(() => getProgressMaxAvailableMinutes(props.data.contest, localTime.value, props.td));
const isEnded = computed(() => isProgressEnded(props.data.contest, localTime.value, props.td));
const progressMetrics = computed(() =>
  getProgressMetrics(props.data, localTime.value, props.td, timeTravelCurrentValue.value, inTimeMachine.value),
);

function handleProgressTimer() {
  localTime.value = Date.now();
  if (isEnded.value && liveInterval !== undefined) {
    window.clearInterval(liveInterval);
    liveInterval = undefined;
  }
}

function syncLiveInterval(live: boolean) {
  if (typeof window === 'undefined') {
    return;
  }
  if (live && liveInterval === undefined) {
    liveInterval = window.setInterval(handleProgressTimer, 1000);
  }
  if (!live && liveInterval !== undefined) {
    window.clearInterval(liveInterval);
    liveInterval = undefined;
  }
}

function handleTimeTravelChange(value: number) {
  const exited = value >= durationMinutes.value || value >= maxAvailableMinutes.value;
  emit('timeTravel', exited ? null : value * 60 * 1000);
  inTimeMachine.value = !exited;
  timeTravelValue.value = exited ? null : value * 60 * 1000;
  timeTravelIsChanging.value = false;
}

function beginTimeTravel() {
  timeTravelIsChanging.value = true;
  inTimeMachine.value = true;
}

function commitTimeTravel() {
  if (timeTravelIsChanging.value) {
    handleTimeTravelChange(timeTravelCurrentValue.value);
  }
}

watch(maxAvailableMinutes, (value) => {
  if (!timeTravelIsChanging.value && timeTravelValue.value === null) {
    timeTravelCurrentValue.value = value;
  }
});

watch(
  () => props.live,
  (live) => syncLiveInterval(live),
  { immediate: true },
);

watch(
  () => props.data.contest.title,
  () => {
    timeTravelIsChanging.value = false;
    timeTravelCurrentValue.value = maxAvailableMinutes.value;
    timeTravelValue.value = null;
    inTimeMachine.value = false;
    emit('timeTravel', null);
  },
);

onBeforeUnmount(() => {
  if (liveInterval !== undefined) {
    window.clearInterval(liveInterval);
    liveInterval = undefined;
  }
});
</script>
