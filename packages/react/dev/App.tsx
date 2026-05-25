import React from 'react';
import type * as srk from '@algoux/standard-ranklist';
import type {
  RanklistColumnTitles,
  RanklistStatusCellPreset,
  RanklistUserAvatarPlacement,
  SolutionClickPayload,
  StaticRanklist,
  UserClickPayload,
} from '../src';
import data from '../../../demo.json';
import {
  DefaultSolutionModal,
  DefaultUserModal,
  Ranklist,
  convertToStaticRanklist,
} from '../src';
import * as Utils from '@algoux/standard-ranklist-utils';
import { ProgressBar } from '../src';

function resolvePreferredTheme() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return Utils.EnumTheme.light;
  }

  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? Utils.EnumTheme.dark
      : Utils.EnumTheme.light;
  } catch {
    return Utils.EnumTheme.light;
  }
}

interface AppState {
  data: srk.Ranklist;
  solutions: srk.Solution[];
  activeUserClick: UserClickPayload | null;
  activeSolutionClick: SolutionClickPayload | null;
  splitOrganization: boolean;
  useCustomColumnTitles: boolean;
  statusCellPreset: RanklistStatusCellPreset;
  statusColorAsText: boolean;
  showProblemStatisticsFooter: boolean;
  showDirtColumn: boolean;
  showSEColumn: boolean;
  rowBordered: boolean;
  columnBordered: boolean;
  emptyStatusPlaceholder: string | null;
  userAvatarPlacement: RanklistUserAvatarPlacement;
}

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

export default class App extends React.Component<Record<string, never>, AppState> {
  private readonly preferredTheme = resolvePreferredTheme();

  constructor(props: any) {
    super(props);
    this.state = {
      data: data as srk.Ranklist,
      solutions: Utils.getSortedCalculatedRawSolutions((data as srk.Ranklist).rows),
      activeUserClick: null,
      activeSolutionClick: null,
      splitOrganization: true,
      useCustomColumnTitles: true,
      statusCellPreset: 'compact',
      statusColorAsText: true,
      showProblemStatisticsFooter: true,
      showDirtColumn: true,
      showSEColumn: true,
      rowBordered: true,
      columnBordered: true,
      emptyStatusPlaceholder: '·',
      userAvatarPlacement: 'organization',
    };
  }

  getStaticRanklist = (): StaticRanklist => convertToStaticRanklist(this.state.data) as StaticRanklist;

  handleTimeTravel = (time: number | null) => {
    if (time === null) {
      this.setState({
        data: data as srk.Ranklist,
        activeUserClick: null,
        activeSolutionClick: null,
      });
      return;
    }
    const filteredSolutions = Utils.filterSolutionsUntil(this.state.solutions, [time, 'ms']);
    const newSrk = Utils.regenerateRanklistBySolutions(data, filteredSolutions);
    this.setState({
      data: newSrk as srk.Ranklist,
      activeUserClick: null,
      activeSolutionClick: null,
    });
  };

  handleUserClick = (payload: UserClickPayload) => {
    this.setState({
      activeUserClick: payload,
      activeSolutionClick: null,
    });
  };

  handleSolutionClick = (payload: SolutionClickPayload) => {
    this.setState({
      activeUserClick: null,
      activeSolutionClick: payload,
    });
  };

  closeUserModal = () => {
    this.setState({ activeUserClick: null });
  };

  closeSolutionModal = () => {
    this.setState({ activeSolutionClick: null });
  };

  setBooleanOption = (key: BooleanRanklistOptionKey) => {
    this.setState((state) => ({
      [key]: !state[key],
    } as Pick<AppState, BooleanRanklistOptionKey>));
  };

  handleStatusPresetChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    this.setState({
      statusCellPreset: event.target.value as RanklistStatusCellPreset,
    });
  };

  handleEmptyStatusPlaceholderChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    this.setState({
      emptyStatusPlaceholder: event.target.value || null,
    });
  };

  handleUserAvatarPlacementChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    this.setState({
      userAvatarPlacement: event.target.value as RanklistUserAvatarPlacement,
    });
  };

  useBaselineOptions = () => {
    this.setState({
      splitOrganization: false,
      useCustomColumnTitles: false,
      statusCellPreset: 'classic',
      statusColorAsText: false,
      showProblemStatisticsFooter: false,
      showDirtColumn: false,
      showSEColumn: false,
      rowBordered: false,
      columnBordered: false,
      emptyStatusPlaceholder: null,
      userAvatarPlacement: 'user',
    });
  };

  useShowcaseOptions = () => {
    this.setState({
      splitOrganization: true,
      useCustomColumnTitles: true,
      statusCellPreset: 'compact',
      statusColorAsText: true,
      showProblemStatisticsFooter: true,
      showDirtColumn: true,
      showSEColumn: true,
      rowBordered: true,
      columnBordered: true,
      emptyStatusPlaceholder: '·',
      userAvatarPlacement: 'organization',
    });
  };

  render() {
    const staticRanklist = this.getStaticRanklist();

    return (
      <main className="preview-shell">
        <ProgressBar
          data={this.state.data}
          td={this.state.data._now ? Date.now() - new Date(this.state.data._now).getTime() : 0}
          live
          enableTimeTravel
          onTimeTravel={this.handleTimeTravel}
        />
        <div className="preview-spacer" />
        <section className="preview-controls" aria-label="Ranklist render options">
          <div className="preview-control-row preview-control-row-primary">
            <label className="preview-field preview-select-field">
              <span>Status preset</span>
              <select
                aria-label="Status preset"
                value={this.state.statusCellPreset}
                onChange={this.handleStatusPresetChange}
              >
                {statusPresetOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="preview-field preview-select-field">
              <span>Empty status placeholder</span>
              <select
                aria-label="Empty status placeholder"
                value={this.state.emptyStatusPlaceholder || ''}
                onChange={this.handleEmptyStatusPlaceholderChange}
              >
                {emptyStatusPlaceholderOptions.map((option) => (
                  <option key={option.value || 'none'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="preview-field preview-select-field">
              <span>User avatar placement</span>
              <select
                aria-label="User avatar placement"
                value={this.state.userAvatarPlacement}
                onChange={this.handleUserAvatarPlacementChange}
              >
                {userAvatarPlacementOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="preview-action" onClick={this.useShowcaseOptions}>
              Showcase
            </button>
            <button type="button" className="preview-action" onClick={this.useBaselineOptions}>
              Baseline
            </button>
          </div>
          <div className="preview-control-row">
            <ToggleField
              label="Split organization"
              checked={this.state.splitOrganization}
              onChange={() => this.setBooleanOption('splitOrganization')}
            />
            <ToggleField
              label="Custom column titles"
              checked={this.state.useCustomColumnTitles}
              onChange={() => this.setBooleanOption('useCustomColumnTitles')}
            />
            <ToggleField
              label="Text status colors"
              checked={this.state.statusColorAsText}
              onChange={() => this.setBooleanOption('statusColorAsText')}
            />
            <ToggleField
              label="Problem statistics footer"
              checked={this.state.showProblemStatisticsFooter}
              onChange={() => this.setBooleanOption('showProblemStatisticsFooter')}
            />
            <ToggleField
              label="Dirt column"
              checked={this.state.showDirtColumn}
              onChange={() => this.setBooleanOption('showDirtColumn')}
            />
            <ToggleField
              label="SE column"
              checked={this.state.showSEColumn}
              onChange={() => this.setBooleanOption('showSEColumn')}
            />
            <ToggleField
              label="Row borders"
              checked={this.state.rowBordered}
              onChange={() => this.setBooleanOption('rowBordered')}
            />
            <ToggleField
              label="Column borders"
              checked={this.state.columnBordered}
              onChange={() => this.setBooleanOption('columnBordered')}
            />
          </div>
        </section>
        <div className="preview-spacer" />
        <Ranklist
          data={staticRanklist}
          theme={this.preferredTheme}
          rowStriped
          onUserClick={this.handleUserClick}
          onSolutionClick={this.handleSolutionClick}
          splitOrganization={this.state.splitOrganization}
          columnTitles={this.state.useCustomColumnTitles ? demoColumnTitles : undefined}
          statusCellPreset={this.state.statusCellPreset}
          statusColorAsText={this.state.statusColorAsText}
          showProblemStatisticsFooter={this.state.showProblemStatisticsFooter}
          showDirtColumn={this.state.showDirtColumn}
          showSEColumn={this.state.showSEColumn}
          rowBordered={this.state.rowBordered}
          columnBordered={this.state.columnBordered}
          emptyStatusPlaceholder={this.state.emptyStatusPlaceholder}
          userAvatarPlacement={this.state.userAvatarPlacement}
        />

        <DefaultUserModal
          open={!!this.state.activeUserClick}
          user={this.state.activeUserClick?.user}
          markers={staticRanklist.markers}
          theme={this.preferredTheme}
          onClose={this.closeUserModal}
        />

        <DefaultSolutionModal
          open={!!this.state.activeSolutionClick}
          user={this.state.activeSolutionClick?.user}
          problem={this.state.activeSolutionClick?.problem}
          problemIndex={this.state.activeSolutionClick?.problemIndex || 0}
          solutions={this.state.activeSolutionClick?.solutions || []}
          onClose={this.closeSolutionModal}
        />

        {/*
          Uncomment this block to keep the library's default user content, but try custom modal props.

          <DefaultUserModal
            open={!!this.state.activeUserClick}
            user={this.state.activeUserClick?.user}
            markers={staticRanklist.markers}
            theme={this.preferredTheme}
            title="Custom User Title"
            width={520}
            onClose={this.closeUserModal}
          />
        */}

        {/*
          Uncomment this block to replace DefaultUserModal with your own modal content.

          <Modal
            open={!!this.state.activeUserClick}
            onClose={this.closeUserModal}
            title={
              this.state.activeUserClick
                ? `Custom user: ${Utils.resolveText(this.state.activeUserClick.user.name)}`
                : 'Custom user'
            }
            width={520}
          >
            <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
              {JSON.stringify(this.state.activeUserClick, null, 2)}
            </pre>
          </Modal>
        */}

        {/*
          Uncomment this block to replace DefaultSolutionModal with your own modal content.

          <Modal
            open={!!this.state.activeSolutionClick}
            onClose={this.closeSolutionModal}
            title={
              this.state.activeSolutionClick
                ? `Custom solutions: ${this.state.activeSolutionClick.problem?.alias || this.state.activeSolutionClick.problemIndex + 1}`
                : 'Custom solutions'
            }
            width={520}
          >
            <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
              {JSON.stringify(this.state.activeSolutionClick, null, 2)}
            </pre>
          </Modal>
        */}
      </main>
    );
  }
}

type BooleanRanklistOptionKey =
  | 'splitOrganization'
  | 'useCustomColumnTitles'
  | 'statusColorAsText'
  | 'showProblemStatisticsFooter'
  | 'showDirtColumn'
  | 'showSEColumn'
  | 'rowBordered'
  | 'columnBordered';

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="preview-field preview-toggle-field">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span>{label}</span>
    </label>
  );
}
