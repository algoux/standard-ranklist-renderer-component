import classnames from 'classnames';
import React from 'react';
import type * as srk from '@algoux/standard-ranklist';
import { EnumTheme, numberToAlphabet, resolveText } from '@algoux/standard-ranklist-utils';
import {
  captureModalTriggerPointFromMouseEvent,
  getProblemHeaderBackgroundImage,
} from '@algoux/standard-ranklist-renderer-component-core';
import type {
  ProblemClickPayload,
  StaticRanklist,
} from '@algoux/standard-ranklist-renderer-component-core';

export interface ProblemHeaderCellProps {
  problem: srk.Problem;
  index: number;
  ranklist: StaticRanklist;
  theme: EnumTheme;
  onProblemClick?: (payload: ProblemClickPayload) => void | Promise<void>;
  languages?: readonly string[];
}

export function ProblemHeaderCell({
  problem,
  index,
  ranklist,
  theme,
  onProblemClick,
  languages,
}: ProblemHeaderCellProps) {
  const alias = problem.alias ? problem.alias : numberToAlphabet(index);
  const title = resolveText(problem.title, languages);
  const stat = problem.statistics;
  const statDesc = stat
    ? `${stat.accepted} / ${stat.submitted} (${
        stat.submitted ? ((stat.accepted / stat.submitted) * 100).toFixed(1) : 0
      }%)`
    : '';
  const innerComp = (
    <>
      <span className="srk--display-block">{alias}</span>
      {stat ? (
        <span title={statDesc} className="srk--display-block srk-problem-stats">
          {stat.accepted}
        </span>
      ) : null}
    </>
  );
  const cellComp = problem.link && !onProblemClick ? (
    <a href={problem.link} target="_blank" rel="noopener noreferrer" style={{ color: 'unset' }}>
      {innerComp}
    </a>
  ) : (
    innerComp
  );

  return (
    <th
      className={classnames('srk--nowrap srk-problem-header', {
        'srk--cursor-pointer': !!onProblemClick,
      })}
      key={problem.alias || title}
      onClick={
        onProblemClick
          ? (event) => {
              event.preventDefault();
              captureModalTriggerPointFromMouseEvent(event.nativeEvent, {
                source: 'problem-header',
                context: {
                  problemIndex: index,
                  problemAlias: problem.alias || null,
                  problemTitle: title || null,
                },
              });
              onProblemClick({
                problem,
                problemIndex: index,
                ranklist,
              });
            }
          : undefined
      }
      style={{ backgroundImage: getProblemHeaderBackgroundImage(problem.style, theme) }}
    >
      {cellComp}
    </th>
  );
}
