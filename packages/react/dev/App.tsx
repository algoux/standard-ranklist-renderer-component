import React from 'react';
import type * as srk from '@algoux/standard-ranklist';
import type { SolutionClickPayload, StaticRanklist, UserClickPayload } from '../src';
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
}

export default class App extends React.Component<Record<string, never>, AppState> {
  private readonly preferredTheme = resolvePreferredTheme();

  constructor(props: any) {
    super(props);
    this.state = {
      data: data as srk.Ranklist,
      solutions: Utils.getSortedCalculatedRawSolutions((data as srk.Ranklist).rows),
      activeUserClick: null,
      activeSolutionClick: null,
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
        <Ranklist
          data={staticRanklist}
          theme={this.preferredTheme}
          stripedRows
          onUserClick={this.handleUserClick}
          onSolutionClick={this.handleSolutionClick}
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
