import type * as srk from '@algoux/standard-ranklist';
import { lookup as langLookup } from 'bcp-47-match';
import semver from 'semver';

const MIN_REGEN_SUPPORTED_VERSION = '0.3.0';

export function resolveText(text: srk.Text | undefined): string {
  if (text === undefined) {
    return '';
  }
  if (typeof text === 'string') {
    return text;
  } else {
    const langs = Object.keys(text)
      .filter((k) => k && k !== 'fallback')
      .sort()
      .reverse();
    const userLangs = (typeof navigator !== 'undefined' && [...navigator.languages]) || [];
    const usingLang = langLookup(userLangs, langs) || 'fallback';
    return text[usingLang] ?? '';
  }
}

export function formatTimeDuration(
  time: srk.TimeDuration,
  targetUnit: srk.TimeUnit = 'ms',
  fmt: (num: number) => number = (num) => num,
) {
  let ms = -1;
  switch (time[1]) {
    case 'ms':
      ms = time[0];
      break;
    case 's':
      ms = time[0] * 1000;
      break;
    case 'min':
      ms = time[0] * 1000 * 60;
      break;
    case 'h':
      ms = time[0] * 1000 * 60 * 60;
      break;
    case 'd':
      ms = time[0] * 1000 * 60 * 60 * 24;
      break;
  }
  switch (targetUnit) {
    case 'ms':
      return ms;
    case 's':
      return fmt(ms / 1000);
    case 'min':
      return fmt(ms / 1000 / 60);
    case 'h':
      return fmt(ms / 1000 / 60 / 60);
    case 'd':
      return fmt(ms / 1000 / 60 / 60 / 24);
  }
  return -1;
}

export function preZeroFill(num: number, size: number): string {
  if (num >= Math.pow(10, size)) {
    return num.toString();
  } else {
    let str = Array(size + 1).join('0') + num;
    return str.slice(str.length - size);
  }
}

/**
 * format seconds to time string
 * @param {number} second
 * @param {boolean} showDay
 * @returns {string}
 */
export function secToTimeStr(second: number, showDay = false): string {
  let sec = second;
  let d = 0;
  if (showDay) {
    d = Math.floor(sec / 86400);
    sec %= 86400;
  }
  let h = Math.floor(sec / 3600);
  sec %= 3600;
  let m = Math.floor(sec / 60);
  sec %= 60;
  let s = Math.floor(sec);
  let str_d = '';
  if (showDay && d >= 1) {
    str_d = d + 'D ';
  }
  if (sec < 0) {
    return '--';
  }
  return str_d + preZeroFill(h, 2) + ':' + preZeroFill(m, 2) + ':' + preZeroFill(s, 2);
}

/**
 * Format number index to alphabet index
 * 0 => 'A'
 * 2 => 'C'
 * 25 => 'Z'
 * 26 => 'AA'
 * 28 => 'AC
 * @param {number | string} number
 * @returns {string}
 */
export function numberToAlphabet(number: number | string): string {
  let n = ~~number;
  const radix = 26;
  let cnt = 1;
  let p = radix;
  while (n >= p) {
    n -= p;
    cnt++;
    p *= radix;
  }
  let res = [];
  for (; cnt > 0; cnt--) {
    res.push(String.fromCharCode((n % radix) + 65));
    n = Math.trunc(n / radix);
  }
  return res.reverse().join('');
}

/**
 * Format alphabet index to number index
 * 'A' => 0
 * 'C' => 2
 * 'Z' => 25
 * 'AA' => 26
 * 'AC' => 28
 * @param {string} alphabet
 * @returns {number}
 */
export function alphabetToNumber(alphabet: string): number {
  if (typeof alphabet !== 'string' || !alphabet.length) {
    return -1;
  }
  const chars = `${alphabet}`.toUpperCase().split('').reverse();
  const radix = 26;
  let p = 1;
  let res = -1;
  chars.forEach((ch) => {
    res += (ch.charCodeAt(0) - 65) * p + p;
    p *= radix;
  });
  return res;
}

/**
 * Parse contributor string to an object which contains name, email (optional) and url (optional).
 * @param contributor
 * @returns parsed contributor object
 * @example
 * 'name <mail@example.com> (http://example.com)' -> { name: 'name', email: 'mail@example.com', url: 'http://example.com' }
 * 'name' -> { name: 'name' }
 * 'name <mail@example.com>' -> { name: 'name', email: 'mail@example.com' }
 * 'name (http://example.com)' -> { name: 'name', url: 'http://example.com' }
 * 'John Smith (http://example.com)' -> { name: 'John Smith', url: 'http://example.com' }
 */
export function resolveContributor(
  contributor: srk.Contributor | undefined,
): { name: string; email?: string; url?: string } | null {
  if (!contributor) {
    return null;
  }

  let name = '';
  let email: string | undefined;
  let url: string | undefined;
  const words = contributor.split(' ').map((s) => s.trim());
  let index = words.length - 1;
  while (index > 0) {
    const word = words[index];
    if (word.startsWith('<') && word.endsWith('>')) {
      email = word.slice(1, -1);
      index--;
      continue;
    }
    if (word.startsWith('(') && word.endsWith(')')) {
      url = word.slice(1, -1);
      index--;
      continue;
    }
    break;
  }
  name = words.slice(0, index + 1).join(' ');
  return { name, email, url };
}

export type CalculatedSolutionTetrad = [
  /** user id */ string,
  /** problem index */ number,
  /** result */ Exclude<srk.SolutionResultFull, null> | srk.SolutionResultCustom,
  /** solution submitted time */ srk.TimeDuration,
];

export function getSortedCalculatedRawSolutions(rows: srk.RanklistRow[]): CalculatedSolutionTetrad[] {
  const solutions: CalculatedSolutionTetrad[] = [];
  for (const row of rows) {
    const { user, statuses } = row;
    const userId =
      (user.id && `${user.id}`) || `${typeof user.name === 'string' ? user.name : JSON.stringify(user.name)}`;
    statuses.forEach((status, index) => {
      if (Array.isArray(status.solutions) && status.solutions.length) {
        solutions.push(
          ...status.solutions.map(
            (solution) => [userId, index, solution.result, solution.time] as CalculatedSolutionTetrad,
          ),
        );
      } else if (status.result && status.time?.[0]) {
        // use status.result as partial solutions
        if (status.result === 'AC' || status.result === 'FB') {
          // push a series of mocked rejected solutions based on tries
          for (let i = 1; i < (status.tries || 0); i++) {
            solutions.push([userId, index, 'RJ', status.time]);
          }
          solutions.push([userId, index, status.result, status.time]);
        }
      }
    });
  }
  return solutions.sort((a, b) => {
    const ta = a[3];
    const tb = b[3];
    // if time duration unit is same, directly compare their value; else convert to minimum unit to compare
    const timeComp = ta[1] === tb[1] ? ta[0] - tb[0] : formatTimeDuration(ta) - formatTimeDuration(tb);
    if (timeComp !== 0) {
      return timeComp;
    }
    const resultValue: Record<string, number> = {
      FB: 998,
      AC: 999,
      '?': 1000,
    };
    const resultA = resultValue[a[2]] || 0;
    const resultB = resultValue[b[2]] || 0;
    return resultA - resultB;
  });
}

export function filterSolutionsUntil(
  solutions: CalculatedSolutionTetrad[],
  time: srk.TimeDuration,
): CalculatedSolutionTetrad[] {
  const timeValue = formatTimeDuration(time);
  const check = (tetrad: CalculatedSolutionTetrad) => formatTimeDuration(tetrad[3]) <= timeValue;
  let lastIndex = -1;
  let low = 0;
  let high = solutions.length - 1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (check(solutions[mid])) {
      lastIndex = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return solutions.slice(0, lastIndex + 1);
}

export function canRegenerateRanklist(ranklist: srk.Ranklist): boolean {
  try {
    if (!semver.gte(ranklist.version, MIN_REGEN_SUPPORTED_VERSION)) {
      return false;
    }
    if (ranklist.sorter?.algorithm !== 'ICPC') {
      return false;
    }
  } catch (e) {
    return false;
  }
  return true;
}

export function regenerateRanklistBySolutions(
  originalRanklist: srk.Ranklist,
  solutions: CalculatedSolutionTetrad[],
): srk.Ranklist {
  if (!canRegenerateRanklist(originalRanklist)) {
    throw new Error('The ranklist is not supported to regenerate');
  }
  const sorterConfig: srk.SorterICPC['config'] = {
    penalty: [20, 'min'],
    noPenaltyResults: ['FB', 'AC', '?', 'CE', 'UKE', null],
    timeRounding: 'floor',
    ...JSON.parse(JSON.stringify(originalRanklist.sorter?.config || {})),
  };
  const ranklist: srk.Ranklist = {
    ...originalRanklist,
    rows: [],
  };
  const rows: srk.RanklistRow[] = [];
  const userRowMap = new Map<string, srk.RanklistRow>();
  const problemCount = originalRanklist.problems.length;
  originalRanklist.rows.forEach((row) => {
    const userId =
      (row.user.id && `${row.user.id}`) ||
      `${typeof row.user.name === 'string' ? row.user.name : JSON.stringify(row.user.name)}`;
    userRowMap.set(userId, {
      user: row.user,
      score: {
        value: 0,
      },
      statuses: new Array(problemCount).fill(null).map(() => ({ result: null, solutions: [] })),
    });
  });
  for (const tetrad of solutions) {
    const [userId, problemIndex, result, time] = tetrad;
    let row = userRowMap.get(userId);
    if (!row) {
      console.error(`Invalid user id ${userId} found when regenerating ranklist`);
      break;
    }
    const status = row.statuses[problemIndex];
    status.solutions!.push({ result, time });
  }
  const problemAcceptedCount = new Array(problemCount).fill(0);
  const problemSubmittedCount = new Array(problemCount).fill(0);
  for (const row of userRowMap.values()) {
    const { statuses } = row;
    let scoreValue = 0;
    let totalTimeMs = 0;
    for (let i = 0; i < statuses.length; ++i) {
      const status = statuses[i];
      // calculate for each problem
      const solutions = status.solutions!;
      for (const solution of solutions) {
        if (!solution.result) {
          continue;
        }
        if (solution.result === '?') {
          status.result = solution.result;
          status.tries = (status.tries || 0) + 1;
          problemSubmittedCount[i] += 1;
          continue;
        }
        if (solution.result === 'AC' || solution.result === 'FB') {
          status.result = solution.result;
          status.time = solution.time;
          status.tries = (status.tries || 0) + 1;
          problemAcceptedCount[i] += 1;
          problemSubmittedCount[i] += 1;
          break;
        }
        // @ts-ignore
        if ((sorterConfig.noPenaltyResults || []).includes(solution.result)) {
          continue;
        }
        status.result = 'RJ';
        status.tries = (status.tries || 0) + 1;
        problemSubmittedCount[i] += 1;
      }
      if (status.result === 'AC' || status.result === 'FB') {
        const targetTime: srk.TimeDuration = [
          formatTimeDuration(
            status.time!,
            sorterConfig.timePrecision || 'ms',
            sorterConfig.timeRounding === 'ceil'
              ? Math.ceil
              : sorterConfig.timeRounding === 'round'
              ? Math.round
              : Math.floor,
          ),
          sorterConfig.timePrecision || 'ms',
        ];
        scoreValue += 1;
        totalTimeMs +=
          formatTimeDuration(targetTime, 'ms') +
          (status.tries! - 1) * formatTimeDuration(sorterConfig.penalty!, 'ms');
      }
    }
    row.score = {
      value: scoreValue,
      time: [totalTimeMs, 'ms'],
    };
    rows.push(row);
  }
  rows.sort((a, b) => {
    if (a.score.value !== b.score.value) {
      return b.score.value - a.score.value;
    }
    return formatTimeDuration(a.score.time!) - formatTimeDuration(b.score.time!);
  });
  ranklist.rows = rows;
  ranklist.problems.forEach((problem, index) => {
    if (!problem.statistics) {
      problem.statistics = {
        accepted: 0,
        submitted: 0,
      };
    }
    problem.statistics.accepted = problemAcceptedCount[index];
    problem.statistics.submitted = problemSubmittedCount[index];
  });
  return ranklist;
}
