import type * as srk from '@algoux/standard-ranklist';

/** Small synthetic preview input, independent of the competition selected in demo.json. */
export function makePreviewRanklist(): srk.Ranklist {
  return {
    type: 'general',
    version: '0.3.14',
    _now: '2026-01-01T00:10:00Z',
    contest: {
      title: 'Preview Test Contest',
      startAt: '2026-01-01T00:00:00Z',
      duration: [10, 'min'],
      frozenDuration: [2, 'min'],
    },
    series: [],
    sorter: {
      algorithm: 'ICPC',
      config: {
        extendedAlgorithms: [{ algorithm: 'CCPC26', config: { problemRevealAcceptedThreshold: { count: 2 } } }],
      },
    },
    problems: [
      {
        alias: 'A',
        title: 'Preview Problem',
        link: 'https://example.com/problem-a',
        statistics: { accepted: 1, submitted: 1 },
      },
      { alias: 'B', statistics: { accepted: 0, submitted: 0 } },
    ],
    rows: [
      {
        user: {
          id: 'preview-team',
          name: { fallback: 'Preview Team', 'en-US': 'Preview Team', 'zh-CN': '测试队伍' },
          organization: 'Preview University',
          avatar: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
        },
        score: { value: 1, time: [1, 'min'] },
        statuses: [
          { result: 'AC', tries: 1, time: [1, 'min'], solutions: [{ result: 'AC', time: [1, 'min'] }] },
          { result: null, solutions: [] },
        ],
      },
    ],
  };
}
