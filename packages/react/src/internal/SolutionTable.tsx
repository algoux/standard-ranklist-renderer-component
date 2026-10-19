import type * as srk from '@algoux/standard-ranklist';
import { formatSolutionTimestamp, getSolutionDisplayResult } from '@algoux/standard-ranklist-renderer-component-core';
import { SolutionResultLabel } from './SolutionResultLabel';

export interface SolutionTableProps {
  solutions: srk.Solution[];
  problemRevealed?: boolean;
}

export function SolutionTable({ solutions, problemRevealed = true }: SolutionTableProps) {
  return (
    <table className="srk-common-table srk-solutions-table">
      <thead>
        <tr>
          <th className="srk--text-left">Result</th>
          <th className="srk--text-right">Time</th>
        </tr>
      </thead>
      <tbody>
        {solutions.map((solution, index) => (
          <tr key={`${solution.result}_${solution.time[0]}_${index}`}>
            <td>
              <SolutionResultLabel result={getSolutionDisplayResult(solution.result, problemRevealed)} />
            </td>
            <td className="srk--text-right">{formatSolutionTimestamp(solution)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
