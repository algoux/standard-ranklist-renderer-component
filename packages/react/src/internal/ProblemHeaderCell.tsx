import React from 'react';
import type * as srk from '@algoux/standard-ranklist';
import { EnumTheme, numberToAlphabet, resolveText } from '@algoux/standard-ranklist-utils';
import { getProblemHeaderBackgroundImage } from '@algoux/standard-ranklist-renderer-component-core';

export interface ProblemHeaderCellProps {
  problem: srk.Problem;
  index: number;
  theme: EnumTheme;
  languages?: readonly string[];
}

export function ProblemHeaderCell({ problem, index, theme, languages }: ProblemHeaderCellProps) {
  const alias = problem.alias ? problem.alias : numberToAlphabet(index);
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
  const cellComp = problem.link ? (
    <a href={problem.link} target="_blank" rel="noopener noreferrer" style={{ color: 'unset' }}>
      {innerComp}
    </a>
  ) : (
    innerComp
  );

  return (
    <th
      className="srk--nowrap srk-problem-header"
      key={problem.alias || resolveText(problem.title, languages)}
      style={{ backgroundImage: getProblemHeaderBackgroundImage(problem.style, theme) }}
    >
      {cellComp}
    </th>
  );
}
