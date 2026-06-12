import classnames from 'classnames';
import React from 'react';
import type * as srk from '@algoux/standard-ranklist';
import { resolveText } from '@algoux/standard-ranklist-utils';
import {
  captureModalTriggerPointFromMouseEvent,
  getRankProblemStatusCellPresentation,
} from '@algoux/standard-ranklist-renderer-component-core';
import type {
  RanklistStatusCellPreset,
  SolutionClickPayload,
  StaticRanklist,
  StaticRanklistRow,
} from '@algoux/standard-ranklist-renderer-component-core';

export interface StatusCellProps {
  status: srk.RankProblemStatus;
  problem: srk.Problem | undefined;
  problemIndex: number;
  user: srk.User;
  row: StaticRanklistRow;
  rowIndex: number;
  ranklist: StaticRanklist;
  onSolutionClick?: (payload: SolutionClickPayload) => void | Promise<void>;
  statusCellPreset?: RanklistStatusCellPreset;
  statusColorAsText?: boolean;
  emptyStatusPlaceholder?: string | null;
  languages?: readonly string[];
}

export function StatusCell({
  status,
  problem,
  problemIndex,
  user,
  row,
  rowIndex,
  ranklist,
  onSolutionClick,
  statusCellPreset = 'classic',
  statusColorAsText = false,
  emptyStatusPlaceholder = null,
  languages,
}: StatusCellProps) {
  const problemKey = problem?.alias || resolveText(problem?.title, languages) || problemIndex;
  const problemTitle = resolveText(problem?.title, languages) || null;
  const solutions = [...(status.solutions || [])].reverse();
  const hasSolutions = solutions.length > 0;
  const isClickable = hasSolutions && !!onSolutionClick;
  const commonClassName = classnames('srk-prest-status-block srk--text-center srk--nowrap', {
    'srk--cursor-pointer': isClickable,
    'srk-prest-status-block-color-text': statusColorAsText,
  });
  const onClick = isClickable
    ? (event: React.MouseEvent) =>
        {
          event.preventDefault();
          captureModalTriggerPointFromMouseEvent(event.nativeEvent, {
            source: 'status-cell',
            context: {
              rowIndex,
              problemIndex,
              problemAlias: problem?.alias || null,
              problemTitle,
              userId: user.id || null,
            },
          });
          onSolutionClick?.({
            user,
            row,
            rowIndex,
            problemIndex,
            problem,
            status,
            solutions,
            ranklist,
          });
        }
    : undefined;

  if (status.result === 'FB') {
    return (
      <td key={problemKey} onClick={onClick} className={classnames(commonClassName, 'srk-prest-status-block-fb')}>
        {statusColorAsText && <span className="srk-prest-status-block-fb-star">★</span>}
        {renderStatusBody(status, ranklist, statusCellPreset)}
      </td>
    );
  }
  if (status.result === 'AC') {
    return (
      <td key={problemKey} onClick={onClick} className={classnames(commonClassName, 'srk-prest-status-block-accepted')}>
        {renderStatusBody(status, ranklist, statusCellPreset)}
      </td>
    );
  }
  if (status.result === '?') {
    return (
      <td key={problemKey} onClick={onClick} className={classnames(commonClassName, 'srk-prest-status-block-frozen')}>
        {renderStatusBody(status, ranklist, statusCellPreset)}
      </td>
    );
  }
  if (status.result === 'RJ') {
    return (
      <td key={problemKey} onClick={onClick} className={classnames(commonClassName, 'srk-prest-status-block-failed')}>
        {renderStatusBody(status, ranklist, statusCellPreset)}
      </td>
    );
  }

  return (
    <td key={problemKey} className="srk-status-placeholder-cell srk--text-center srk--nowrap">
      {emptyStatusPlaceholder}
    </td>
  );
}

function renderStatusBody(
  status: srk.RankProblemStatus,
  ranklist: StaticRanklist,
  preset: RanklistStatusCellPreset,
) {
  return renderStatusPresentation(getRankProblemStatusCellPresentation(status, ranklist, preset));
}

function renderTwoLineStatusBody(primary: string, secondary: string) {
  return (
    <>
      <span className="srk-prest-status-block-primary">{primary}</span>
      {' '}
      <span className="srk-prest-status-block-secondary">{secondary}</span>
    </>
  );
}

function renderStatusPresentation(presentation: ReturnType<typeof getRankProblemStatusCellPresentation>) {
  if (typeof presentation.score === 'number') {
    return (
      <>
        <span className="srk-prest-status-block-score">{presentation.score}</span>
        <span className="srk-prest-status-block-score-details">{presentation.scoreDetails}</span>
      </>
    );
  }

  if (presentation.secondary !== undefined) {
    return renderTwoLineStatusBody(presentation.primary || '', presentation.secondary);
  }

  return <>{presentation.primary}</>;
}
