import type * as srk from '@algoux/standard-ranklist';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

export function makeI18nRanklist(): srk.Ranklist {
  return clone({
    type: 'general',
    version: '0.3.13',
    contest: {
      title: 'I18n Contest',
      startAt: '2026-04-23T10:00:00+08:00',
      duration: [5, 'h'],
    },
    series: [],
    markers: [
      {
        id: 'regional',
        label: {
          fallback: 'Fallback Marker',
          en: 'English Marker',
          'zh-CN': '中文标记',
        },
        style: 'blue',
      },
    ],
    problems: [
      {
        alias: 'A',
        title: {
          fallback: 'Fallback Problem',
          en: 'English Problem',
          'zh-CN': '中文题目',
        },
      },
    ],
    rows: [
      {
        user: {
          id: 'team-i18n',
          name: {
            fallback: 'Fallback Team',
            en: 'English Team',
            'zh-CN': '中文队伍',
          },
          organization: {
            fallback: 'Fallback University',
            en: 'English University',
            'zh-CN': '中文大学',
          },
          teamMembers: [
            {
              name: {
                fallback: 'Fallback Member',
                en: 'English Member',
                'zh-CN': '中文队员',
              },
            },
          ],
          markers: ['regional'],
        },
        score: {
          value: 1,
        },
        statuses: [
          {
            result: 'AC',
            time: [10, 'min'],
            tries: 1,
            solutions: [
              {
                result: 'AC',
                time: [10, 'min'],
              },
            ],
          },
        ],
      },
    ],
  } as srk.Ranklist);
}
