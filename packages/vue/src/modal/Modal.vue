<template>
  <div v-if="shouldRender" :class="rootClasses" :data-srk-modal-state="animationState">
    <div class="srk-modal-mask"></div>
    <div
      class="srk-modal-wrap"
      :class="wrapClassName"
      tabindex="-1"
      @mousedown="handleMaskMouseDown"
    >
      <div
        class="srk-modal"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="title ? titleId : undefined"
        data-srk-modal-panel="true"
        tabindex="-1"
        ref="dialogRef"
        :style="dialogStyle"
      >
        <div class="srk-modal-content">
          <button aria-label="Close" class="srk-modal-close" type="button" @click="requestClose('close-button')">
            <span class="srk-modal-close-x"></span>
          </button>
          <div v-if="title !== undefined" class="srk-modal-header">
            <div :id="titleId" class="srk-modal-title">{{ title }}</div>
          </div>
          <div class="srk-modal-body">
            <slot></slot>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CSSProperties } from 'vue';
import {
  MODAL_ANIMATION_DURATION_MS,
  SRK_ANIMATED_MODAL_ROOT_CLASS,
  ensureModalInteractionTracker,
  lockModalBodyScroll,
  registerModalFocusScope,
  resolveModalTransformOrigin,
  unlockModalBodyScroll,
  unregisterModalFocusScope,
} from '@algoux/standard-ranklist-renderer-component-core';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, watchEffect } from 'vue';

let nextModalId = 0;

const props = withDefaults(
  defineProps<{
    open: boolean;
    title?: string;
    width?: number;
    rootClassName?: string;
    wrapClassName?: string;
    style?: CSSProperties;
    destroyOnClose?: boolean;
    closeOnEsc?: boolean;
    closeOnMaskClick?: boolean;
  }>(),
  {
    destroyOnClose: true,
    closeOnEsc: true,
    closeOnMaskClick: true,
  },
);

const emit = defineEmits<{
  close: [reason: 'mask' | 'close-button' | 'escape'];
  'update:open': [open: boolean];
}>();

const titleId = `srk-vue-modal-title-${++nextModalId}`;
const dialogRef = ref<HTMLDivElement | null>(null);
const isMounted = ref(props.open || !props.destroyOnClose);
const animationState = ref<'pre-open' | 'opening' | 'closing'>(props.open ? 'pre-open' : 'closing');
const transformOrigin = ref({ x: 0, y: 0 });
let closeTimer: number | null = null;
let openTimer: number | null = null;
let focusScopeId: number | null = null;

const shouldRender = computed(() => isMounted.value || !props.destroyOnClose);
const rootClasses = computed(() => ['srk-modal-root', SRK_ANIMATED_MODAL_ROOT_CLASS, props.rootClassName].filter(Boolean));
const shouldLockBody = computed(() => props.open || (props.destroyOnClose && isMounted.value));
const dialogStyle = computed(() => ({
  ...props.style,
  width: props.width ? `${props.width}px` : props.style?.width,
  ['--srk-modal-origin-x' as string]: `${transformOrigin.value.x}px`,
  ['--srk-modal-origin-y' as string]: `${transformOrigin.value.y}px`,
  ['--srk-modal-max-width' as string]: props.width
    ? `${props.width}px`
    : typeof props.style?.width === 'string'
      ? props.style.width
      : undefined,
}));

function clearTimers() {
  if (typeof window === 'undefined') {
    closeTimer = null;
    openTimer = null;
    return;
  }
  if (closeTimer !== null) {
    window.clearTimeout(closeTimer);
    closeTimer = null;
  }
  if (openTimer !== null) {
    window.clearTimeout(openTimer);
    openTimer = null;
  }
}

async function queueOpenAnimation() {
  await nextTick();
  if (typeof window === 'undefined' || !props.open || !isMounted.value || animationState.value !== 'pre-open') {
    return;
  }
  registerFocusScope();
  const resolution = resolveModalTransformOrigin(dialogRef.value);
  transformOrigin.value = resolution.origin;
  openTimer = window.setTimeout(() => {
    animationState.value = 'opening';
    openTimer = null;
  }, 0);
}

function registerFocusScope() {
  const nextFocusScopeId = registerModalFocusScope(dialogRef.value, {
    onEscape: handleEscape,
  });
  if (focusScopeId === null) {
    focusScopeId = nextFocusScopeId;
  }
}

function releaseFocusScope() {
  if (focusScopeId !== null) {
    unregisterModalFocusScope(focusScopeId);
    focusScopeId = null;
  }
}

function requestClose(reason: 'mask' | 'close-button' | 'escape') {
  emit('update:open', false);
  emit('close', reason);
}

function handleMaskMouseDown(event: MouseEvent) {
  if (props.closeOnMaskClick && event.target === event.currentTarget) {
    requestClose('mask');
  }
}

function handleEscape(event: KeyboardEvent) {
  if (props.open && props.closeOnEsc) {
    requestClose('escape');
  }
}

watch(
  () => props.open,
  async (open) => {
    clearTimers();

    if (open) {
      isMounted.value = true;
      transformOrigin.value = { x: 0, y: 0 };
      animationState.value = 'pre-open';
      await queueOpenAnimation();
      return;
    }

    releaseFocusScope();
    animationState.value = 'closing';
    if (!props.destroyOnClose) {
      isMounted.value = true;
      return;
    }

    if (isMounted.value && typeof window !== 'undefined') {
      closeTimer = window.setTimeout(() => {
        isMounted.value = false;
        closeTimer = null;
      }, MODAL_ANIMATION_DURATION_MS);
    }
  },
  { immediate: true },
);

watchEffect((onCleanup) => {
  if (!shouldLockBody.value) {
    return;
  }
  lockModalBodyScroll();
  onCleanup(() => {
    unlockModalBodyScroll();
  });
});

onMounted(() => {
  ensureModalInteractionTracker();
  if (props.open) {
    registerFocusScope();
  }
});

onBeforeUnmount(() => {
  clearTimers();
  releaseFocusScope();
});
</script>
