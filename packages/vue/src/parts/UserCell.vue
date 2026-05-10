<template>
  <td
    class="srk--text-left srk--nowrap srk-user-cell"
    :class="{ 'srk--cursor-pointer': !!onUserClick }"
    title=""
    @click.prevent="emitUserClick"
  >
    <div class="srk-user-cell-content">
      <div v-if="user.avatar" class="srk-user-avatar">
        <img :src="formatSrkAssetUrl(user.avatar, 'user.avatar')" alt="User Avatar" />
      </div>
      <div class="srk-user-body">
        <div class="srk-user-name-row">
          <span class="srk-user-name-text" :title="name">{{ name }}</span>
          <span class="srk-marker-dot-group">
            <span
              v-for="marker in resolvedMarkers"
              :key="marker.marker.id"
              class="srk-marker srk-marker-dot srk--c-tooltip"
              :class="marker.presentation.className"
              :style="marker.presentation.style"
              :data-tooltip="resolveText(marker.marker.label)"
            ></span>
          </span>
        </div>
        <p v-if="user.organization" class="srk-user-secondary-text srk--text-ellipsis" title="">
          {{ resolveText(user.organization) }}
        </p>
      </div>
    </div>
  </td>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type * as srk from '@algoux/standard-ranklist';
import { EnumTheme, resolveText, resolveUserMarkers } from '@algoux/standard-ranklist-utils';
import {
  captureModalTriggerPointFromMouseEvent,
  getMarkerPresentation,
} from '@algoux/standard-ranklist-renderer-component-core';
import type { StaticRanklist, StaticRanklistRow, UserClickPayload } from '@algoux/standard-ranklist-renderer-component-core';

const props = withDefaults(
  defineProps<{
    user: srk.User;
    row: StaticRanklistRow;
    rowIndex: number;
    ranklist: StaticRanklist;
    markers?: srk.Marker[];
    theme?: EnumTheme;
    formatSrkAssetUrl: (url: string, field: string) => string;
    onUserClick?: (payload: UserClickPayload) => void | Promise<void>;
  }>(),
  {
    markers: () => [],
    theme: EnumTheme.light,
  },
);

const name = computed(() => resolveText(props.user.name));
const userMarkers = computed(() => resolveUserMarkers(props.user, props.markers));
const resolvedMarkers = computed(() =>
  userMarkers.value.map((marker) => ({
    marker,
    presentation: getMarkerPresentation(marker, props.theme),
  })),
);

function emitUserClick(event: MouseEvent) {
  captureModalTriggerPointFromMouseEvent(event, {
    source: 'user-cell',
    context: {
      rowIndex: props.rowIndex,
      userId: props.user.id || null,
      userName: name.value,
    },
  });
  props.onUserClick?.({
    user: props.user,
    row: props.row,
    rowIndex: props.rowIndex,
    ranklist: props.ranklist,
  });
}
</script>
