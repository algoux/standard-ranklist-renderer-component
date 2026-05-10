import classnames from 'classnames';
import type * as srk from '@algoux/standard-ranklist';
import { getSolutionResultMeta } from '@algoux/standard-ranklist-renderer-component-core';

export interface SolutionResultLabelProps {
  result: srk.Solution['result'];
}

export function SolutionResultLabel({ result }: SolutionResultLabelProps) {
  const resultMeta = getSolutionResultMeta(result);
  return <span className={classnames('srk-solution-result-text', resultMeta.className)}>{resultMeta.label}</span>;
}
