import type * as srk from '@algoux/standard-ranklist';
import type { StaticRanklist } from '@algoux/standard-ranklist-renderer-component-core';

const accepted = (minute: number, result: 'AC' | 'FB' = 'AC'): srk.RankProblemStatus => ({
  result,
  time: [minute, 'min'],
  tries: 1,
  solutions: [{ result, time: [minute, 'min'] }],
});
const rejected = (minute: number): srk.RankProblemStatus => ({
  result: 'RJ',
  tries: 1,
  solutions: [{ result: 'WA', time: [minute, 'min'] }],
});

/** Two teams and five problems, independent of the manual demo contest. */
export function makeCCPC26Ranklist(count = 2): StaticRanklist {
  return {
    type: 'general',
    version: '0.3.14',
    contest: {
      title: 'CCPC26 contract',
      startAt: '2020-01-01T00:00:00Z',
      duration: [10, 'min'],
      frozenDuration: [120, 's'],
    },
    series: [{ title: '#' }],
    problems: ['A', 'B', 'C', 'D', 'E'].map((alias) => ({
      alias,
      title: `Problem ${alias}`,
      link: `https://example.com/${alias}`,
      style: { backgroundColor: '#34a9bd' },
      statistics: { accepted: 99, submitted: 100 },
    })),
    sorter: {
      algorithm: 'ICPC',
      config: { extendedAlgorithms: [{ algorithm: 'CCPC26', config: { problemRevealAcceptedThreshold: { count } } }] },
    },
    rows: [
      {
        user: { id: 'alpha', name: 'Alpha', organization: 'School A' },
        score: { value: 3, time: [9, 'min'] },
        rankValues: [{ rank: 1 }],
        statuses: [accepted(1, 'FB'), accepted(6, 'FB'), accepted(2), rejected(5), rejected(3)],
      },
      {
        user: { id: 'beta', name: 'Beta', organization: 'School B' },
        score: { value: 2, time: [5, 'min'] },
        rankValues: [{ rank: 2 }],
        statuses: [accepted(2), rejected(4), accepted(3), rejected(2), { result: null }],
      },
    ],
  };
}
