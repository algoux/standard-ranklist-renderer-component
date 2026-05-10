import classnames from 'classnames';
import React from 'react';
import type * as srk from '@algoux/standard-ranklist';
import { resolveText } from '@algoux/standard-ranklist-utils';
import {
  captureModalTriggerPointFromMouseEvent,
  getAcceptedStatusDetails,
} from '@algoux/standard-ranklist-renderer-component-core';
import type { SolutionClickPayload, StaticRanklist, StaticRanklistRow } from '@algoux/standard-ranklist-renderer-component-core';

export interface StatusCellProps {
  status: srk.RankProblemStatus;
  problem: srk.Problem | undefined;
  problemIndex: number;
  user: srk.User;
  row: StaticRanklistRow;
  rowIndex: number;
  ranklist: StaticRanklist;
  onSolutionClick?: (payload: SolutionClickPayload) => void | Promise<void>;
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
}: StatusCellProps) {
  const problemKey = problem?.alias || resolveText(problem?.title) || problemIndex;
  const problemTitle = resolveText(problem?.title) || null;
  const solutions = [...(status.solutions || [])].reverse();
  const hasSolutions = solutions.length > 0;
  const isClickable = hasSolutions && !!onSolutionClick;
  const commonClassName = classnames('srk-prest-status-block srk--text-center srk--nowrap', {
    'srk--cursor-pointer': isClickable,
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
        {renderAcceptedStatusBody(status)}
      </td>
    );
  }
  if (status.result === 'AC') {
    return (
      <td key={problemKey} onClick={onClick} className={classnames(commonClassName, 'srk-prest-status-block-accepted')}>
        {renderAcceptedStatusBody(status)}
      </td>
    );
  }
  if (status.result === '?') {
    return (
      <td key={problemKey} onClick={onClick} className={classnames(commonClassName, 'srk-prest-status-block-frozen')}>
        {status.tries}
      </td>
    );
  }
  if (status.result === 'RJ') {
    return (
      <td key={problemKey} onClick={onClick} className={classnames(commonClassName, 'srk-prest-status-block-failed')}>
        {status.tries}
      </td>
    );
  }

  return <td key={problemKey}></td>;
}

function renderAcceptedStatusBody(status: srk.RankProblemStatus) {
  const details = getAcceptedStatusDetails(status);

  if (typeof status.score === 'number') {
    return (
      <>
        <span className="srk-prest-status-block-score">{status.score}</span>
        <span className="srk-prest-status-block-score-details">{details}</span>
      </>
    );
  }

  return <>{details}</>;
}
