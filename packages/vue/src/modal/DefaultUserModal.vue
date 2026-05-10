<template>
  <Modal
    v-if="cachedUser"
    :open="open"
    :title="title"
    :width="width"
    :root-class-name="rootClassName"
    :wrap-class-name="wrapClassName"
    :style="style"
    @close="(reason) => emit('close', reason)"
    @update:open="(value) => emit('update:open', value)"
  >
    <div class="srk-user-modal-info">
      <h3 class="srk-user-modal-info-user-name">{{ resolveText(cachedUser.name) }}</h3>
      <p v-if="cachedUser.organization" class="srk-user-modal-info-user-second-name">
        {{ resolveText(cachedUser.organization) }}
      </p>
      <div class="srk-user-modal-info-labels">
        <span class="srk-user-modal-info-labels-label srk-user-modal-info-labels-label-preset-general">
          {{ cachedUser.official === false ? '＊ 非正式参加者' : '正式参加者' }}
        </span>
        <span
          v-for="marker in resolvedMarkers"
          :key="marker.marker.id"
          class="srk-user-modal-info-labels-label"
          :class="marker.presentation.className"
          :style="marker.presentation.style"
        >
          {{ resolveText(marker.marker.label) }}
        </span>
      </div>
      <div v-if="cachedUser.teamMembers && cachedUser.teamMembers.length" class="srk-user-modal-info-team-members">
        <template v-for="(member, index) in cachedUser.teamMembers" :key="resolveText(member.name)">
          <span v-if="index > 0" class="srk-user-modal-info-team-members-slash"> / </span>
          <span>{{ resolveText(member.name) }}</span>
        </template>
      </div>
      <div v-if="cachedUser.photo" class="srk-user-modal-info-photo">
        <img :src="formatAssetUrl(cachedUser.photo, 'user.photo')" alt="User portrait" class="srk-user-modal-info-photo-img" />
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import type * as srk from '@algoux/standard-ranklist';
import type { CSSProperties } from 'vue';
import { computed, ref, watch } from 'vue';
import { EnumTheme, resolveText, resolveUserMarkers } from '@algoux/standard-ranklist-utils';
import { getMarkerPresentation, resolveSrkAssetUrl } from '@algoux/standard-ranklist-renderer-component-core';
import Modal from './Modal.vue';

const props = withDefaults(
  defineProps<{
    open: boolean;
    user?: srk.User | null;
    markers?: srk.Marker[];
    theme?: EnumTheme;
    title?: string;
    width?: number;
    rootClassName?: string;
    wrapClassName?: string;
    style?: CSSProperties;
    formatSrkAssetUrl?: (url: string, field: string) => string;
  }>(),
  {
    markers: () => [],
    theme: EnumTheme.light,
    title: 'User Info',
    width: 420,
    rootClassName: 'srk-general-modal-root',
    wrapClassName: 'srk-user-modal',
  },
);

const emit = defineEmits<{
  close: [reason: 'mask' | 'close-button' | 'escape'];
  'update:open': [open: boolean];
}>();

const cachedUser = ref<srk.User | null>(props.user || null);

watch(
  () => props.user,
  (user) => {
    if (user) {
      cachedUser.value = user;
    }
  },
  { immediate: true },
);

const resolvedMarkers = computed(() =>
  cachedUser.value
    ? resolveUserMarkers(cachedUser.value, props.markers).map((marker) => ({
        marker,
        presentation: getMarkerPresentation(marker, props.theme),
      }))
    : [],
);

function formatAssetUrl(url: string, field: string) {
  return resolveSrkAssetUrl(url, field, props.formatSrkAssetUrl);
}
</script>
