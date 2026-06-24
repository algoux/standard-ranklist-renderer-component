<template>
  <main class="preview-shell">
    <ProgressBar :data="ranklist" enable-time-travel live @time-travel="handleTimeTravel" />
    <div class="preview-spacer"></div>
    <section class="preview-controls" aria-label="Ranklist render options">
      <div class="preview-control-row preview-control-row-primary">
        <label class="preview-field preview-select-field">
          <span>Status preset</span>
          <select v-model="statusCellPreset" aria-label="Status preset">
            <option v-for="option in statusPresetOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>
        <label class="preview-field preview-select-field">
          <span>Empty status placeholder</span>
          <select v-model="emptyStatusPlaceholderValue" aria-label="Empty status placeholder">
            <option v-for="option in emptyStatusPlaceholderOptions" :key="option.value || 'none'" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>
        <label class="preview-field preview-select-field">
          <span>User avatar placement</span>
          <select v-model="userAvatarPlacement" aria-label="User avatar placement">
            <option v-for="option in userAvatarPlacementOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>
        <label class="preview-field preview-select-field">
          <span>Language</span>
          <select v-model="language" aria-label="Language">
            <option v-for="option in languageOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>
        <button type="button" class="preview-action" @click="useShowcaseOptions">Showcase</button>
        <button type="button" class="preview-action" @click="useBaselineOptions">Baseline</button>
      </div>
      <div class="preview-control-row">
        <label class="preview-field preview-toggle-field">
          <input v-model="splitOrganization" type="checkbox" aria-label="Split organization" />
          <span>Split organization</span>
        </label>
        <label class="preview-field preview-toggle-field">
          <input v-model="useCustomColumnTitles" type="checkbox" aria-label="Custom column titles" />
          <span>Custom column titles</span>
        </label>
        <label class="preview-field preview-toggle-field">
          <input v-model="statusColorAsText" type="checkbox" aria-label="Text status colors" />
          <span>Text status colors</span>
        </label>
        <label class="preview-field preview-toggle-field">
          <input v-model="showProblemStatisticsFooter" type="checkbox" aria-label="Problem statistics footer" />
          <span>Problem statistics footer</span>
        </label>
        <label class="preview-field preview-toggle-field">
          <input v-model="showDirtColumn" type="checkbox" aria-label="Dirt column" />
          <span>Dirt column</span>
        </label>
        <label class="preview-field preview-toggle-field">
          <input v-model="showSEColumn" type="checkbox" aria-label="SE column" />
          <span>SE column</span>
        </label>
        <label class="preview-field preview-toggle-field">
          <input v-model="rowBordered" type="checkbox" aria-label="Row borders" />
          <span>Row borders</span>
        </label>
        <label class="preview-field preview-toggle-field">
          <input v-model="columnBordered" type="checkbox" aria-label="Column borders" />
          <span>Column borders</span>
        </label>
      </div>
    </section>
    <div class="preview-spacer"></div>
    <Ranklist
      :data="staticRanklist"
      :theme="preferredTheme"
      row-striped
      :split-organization="splitOrganization"
      :column-titles="useCustomColumnTitles ? demoColumnTitles : undefined"
      :status-cell-preset="statusCellPreset"
      :status-color-as-text="statusColorAsText"
      :show-problem-statistics-footer="showProblemStatisticsFooter"
      :show-dirt-column="showDirtColumn"
      :show-s-e-column="showSEColumn"
      :row-bordered="rowBordered"
      :column-bordered="columnBordered"
      :empty-status-placeholder="emptyStatusPlaceholder"
      :user-avatar-placement="userAvatarPlacement"
      :languages="languages"
      @problem-click="handleProblemClick"
      @solution-click="handleSolutionClick"
      @user-click="handleUserClick"
    />
    <DefaultUserModal
      :open="!!activeUserClick"
      :user="activeUserClick?.user"
      :markers="staticRanklist.markers"
      :theme="preferredTheme"
      :languages="languages"
      @close="closeUserModal"
    />
    <DefaultSolutionModal
      :open="!!activeSolutionClick"
      :user="activeSolutionClick?.user"
      :problem="activeSolutionClick?.problem"
      :problem-index="activeSolutionClick?.problemIndex ?? 0"
      :solutions="activeSolutionClick?.solutions || []"
      :languages="languages"
      @close="closeSolutionModal"
    />
    <Modal
      :open="!!activeProblemClick"
      root-class-name="srk-general-modal-root"
      title="Problem Info"
      :width="420"
      wrap-class-name="srk-problem-modal"
      @close="closeProblemModal"
    >
      <div v-if="activeProblem">
        <p>Alias: {{ activeProblem.alias || activeProblemIndex + 1 }}</p>
        <p>Title: {{ activeProblemTitle || '-' }}</p>
        <p>Index: {{ activeProblemIndex }}</p>
        <p v-if="activeProblem.link">
          Link:
          <a :href="activeProblem.link" target="_blank" rel="noopener noreferrer">{{ activeProblem.link }}</a>
        </p>
        <p v-if="activeProblem.statistics">
          Stats: {{ activeProblem.statistics.accepted }} accepted / {{ activeProblem.statistics.submitted }} submitted
        </p>
      </div>
    </Modal>
  </main>
</template>

<script setup lang="ts">
import type * as srk from '@algoux/standard-ranklist';
import {
  EnumTheme,
  convertToStaticRanklist,
  filterSolutionsUntil,
  getSortedCalculatedRawSolutions,
  regenerateRanklistBySolutions,
  resolveText,
} from '@algoux/standard-ranklist-utils';
import { computed, ref } from 'vue';
import demoData from '../../../demo.json';
import type {
  RanklistColumnTitles,
  RanklistStatusCellPreset,
  RanklistUserAvatarPlacement,
  ProblemClickPayload,
  SolutionClickPayload,
  UserClickPayload,
} from '../src';
import { DefaultSolutionModal, DefaultUserModal, Modal, ProgressBar, Ranklist } from '../src';

const originalRanklist = demoData as srk.Ranklist;
const sortedSolutions = getSortedCalculatedRawSolutions(originalRanklist.rows);
const ranklist = ref<srk.Ranklist>(originalRanklist);
const activeUserClick = ref<UserClickPayload | null>(null);
const activeProblemClick = ref<ProblemClickPayload | null>(null);
const activeSolutionClick = ref<SolutionClickPayload | null>(null);
const staticRanklist = computed(() => convertToStaticRanklist(ranklist.value));
const preferredTheme = resolvePreferredTheme();
const splitOrganization = ref(true);
const useCustomColumnTitles = ref(true);
const statusCellPreset = ref<RanklistStatusCellPreset>('compact');
const statusColorAsText = ref(true);
const showProblemStatisticsFooter = ref(true);
const showDirtColumn = ref(true);
const showSEColumn = ref(true);
const rowBordered = ref(true);
const columnBordered = ref(true);
const emptyStatusPlaceholder = ref<string | null>('·');
const userAvatarPlacement = ref<RanklistUserAvatarPlacement>('organization');
type LanguageOptionValue = 'browser' | 'zh-CN' | 'en-US';
const language = ref<LanguageOptionValue>('browser');
const emptyStatusPlaceholderValue = computed({
  get: () => emptyStatusPlaceholder.value || '',
  set: (value: string) => {
    emptyStatusPlaceholder.value = value || null;
  },
});
const languages = computed(() => (language.value === 'browser' ? undefined : [language.value]));
const activeProblem = computed(() => activeProblemClick.value?.problem || null);
const activeProblemIndex = computed(() => activeProblemClick.value?.problemIndex ?? 0);
const activeProblemTitle = computed(() => (activeProblem.value ? resolveText(activeProblem.value.title, languages.value) : ''));

const demoColumnTitles: RanklistColumnTitles = {
  series: (series, index) => (index === 0 ? 'Rank' : series.title || `Series ${index + 1}`),
  organization: 'School',
  user: 'Team',
  score: 'Solved',
  time: 'Penalty',
  dirt: 'Dirt',
  se: 'SE',
};

const statusPresetOptions: Array<{ value: RanklistStatusCellPreset; label: string }> = [
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

const userAvatarPlacementOptions: Array<{ value: RanklistUserAvatarPlacement; label: string }> = [
  { value: 'user', label: 'User' },
  { value: 'organization', label: 'Organization' },
];

const languageOptions: Array<{ value: LanguageOptionValue; label: string }> = [
  { value: 'browser', label: 'Browser' },
  { value: 'zh-CN', label: 'zh-CN' },
  { value: 'en-US', label: 'en-US' },
];

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

function handleTimeTravel(time: number | null) {
  if (time === null) {
    ranklist.value = originalRanklist;
  } else {
    ranklist.value = regenerateRanklistBySolutions(
      originalRanklist,
      filterSolutionsUntil(sortedSolutions, [time, 'ms']),
    ) as srk.Ranklist;
  }
  activeUserClick.value = null;
  activeProblemClick.value = null;
  activeSolutionClick.value = null;
}

function handleUserClick(payload: UserClickPayload) {
  activeUserClick.value = payload;
  activeProblemClick.value = null;
  activeSolutionClick.value = null;
}

function handleProblemClick(payload: ProblemClickPayload) {
  activeUserClick.value = null;
  activeProblemClick.value = payload;
  activeSolutionClick.value = null;
}

function handleSolutionClick(payload: SolutionClickPayload) {
  activeUserClick.value = null;
  activeProblemClick.value = null;
  activeSolutionClick.value = payload;
}

function closeUserModal() {
  activeUserClick.value = null;
}

function closeProblemModal() {
  activeProblemClick.value = null;
}

function closeSolutionModal() {
  activeSolutionClick.value = null;
}

function useBaselineOptions() {
  splitOrganization.value = false;
  useCustomColumnTitles.value = false;
  statusCellPreset.value = 'classic';
  statusColorAsText.value = false;
  showProblemStatisticsFooter.value = false;
  showDirtColumn.value = false;
  showSEColumn.value = false;
  rowBordered.value = false;
  columnBordered.value = false;
  emptyStatusPlaceholder.value = null;
  userAvatarPlacement.value = 'user';
}

function useShowcaseOptions() {
  splitOrganization.value = true;
  useCustomColumnTitles.value = true;
  statusCellPreset.value = 'compact';
  statusColorAsText.value = true;
  showProblemStatisticsFooter.value = true;
  showDirtColumn.value = true;
  showSEColumn.value = true;
  rowBordered.value = true;
  columnBordered.value = true;
  emptyStatusPlaceholder.value = '·';
  userAvatarPlacement.value = 'organization';
}
</script>
