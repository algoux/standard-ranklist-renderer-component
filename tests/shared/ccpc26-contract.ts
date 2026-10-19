import { afterEach, describe, expect, it } from 'vitest';
import type * as srk from '@algoux/standard-ranklist';
import type {
  StaticRanklist,
  SolutionClickPayload,
  ProblemClickPayload,
} from '@algoux/standard-ranklist-renderer-component-core';
import { makeCCPC26Ranklist } from './ccpc26-fixture';

export interface CCPC26RanklistProps {
  data: StaticRanklist;
  enableCCPC26?: boolean;
  statusCellPreset?: 'classic' | 'detailed' | 'minimal' | 'compact';
  statusColorAsText?: boolean;
  showProblemStatisticsFooter?: boolean;
  columnBordered?: boolean;
  splitOrganization?: boolean;
  showDirtColumn?: boolean;
  showSEColumn?: boolean;
  onSolutionClick?: (payload: SolutionClickPayload) => void;
  onProblemClick?: (payload: ProblemClickPayload) => void;
}

export interface CCPC26ModalProps {
  open: boolean;
  user?: srk.User | null;
  problem?: srk.Problem;
  problemIndex: number;
  problemRevealed?: boolean;
  solutions: srk.Solution[];
  title?: string;
}

export interface CCPC26Rendered<Props> {
  container: ParentNode;
  update: (props: Props) => void | Promise<void>;
  flush: () => void | Promise<void>;
  cleanup: () => void | Promise<void>;
}

export interface CCPC26Adapter {
  target: string;
  renderRanklist: (
    props: CCPC26RanklistProps,
  ) => CCPC26Rendered<CCPC26RanklistProps> | Promise<CCPC26Rendered<CCPC26RanklistProps>>;
  renderModal: (
    props: CCPC26ModalProps,
  ) => CCPC26Rendered<CCPC26ModalProps> | Promise<CCPC26Rendered<CCPC26ModalProps>>;
}

function labels(container: ParentNode) {
  return Array.from(container.querySelectorAll('thead .srk-problem-header')).map(
    (cell) => cell.querySelector('span')?.textContent || '',
  );
}
function rows(container: ParentNode) {
  return Array.from(container.querySelectorAll('tbody > tr'));
}
function cells(row: ParentNode) {
  return Array.from(row.querySelectorAll<HTMLElement>('.srk-prest-status-block, .srk-status-placeholder-cell'));
}
function text(node: Node | null | undefined) {
  return (node?.textContent || '').replace(/\s+/g, ' ').trim();
}
function statusText(node: Node) {
  return text(node).replace(/\s|★/g, '');
}

/** One observable-behavior contract, exercised through each framework's real components. */
export function describeCCPC26Contract(adapter: CCPC26Adapter) {
  describe(`${adapter.target} CCPC26 contract`, () => {
    const cleanups: Array<() => void | Promise<void>> = [];
    afterEach(async () => {
      for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
    });
    async function render(props: CCPC26RanklistProps) {
      const view = await adapter.renderRanklist(props);
      cleanups.push(view.cleanup);
      return view;
    }
    async function modal(props: CCPC26ModalProps) {
      const view = await adapter.renderModal(props);
      cleanups.push(view.cleanup);
      return view;
    }

    it('shares revealed columns while ordering each anonymous row and preserving raw interactions', async () => {
      const data = makeCCPC26Ranklist();
      const before = JSON.stringify(data);
      const clicks: SolutionClickPayload[] = [];
      const problems: ProblemClickPayload[] = [];
      const view = await render({
        data,
        enableCCPC26: true,
        statusCellPreset: 'compact',
        statusColorAsText: true,
        onSolutionClick: (payload) => clicks.push(payload),
        onProblemClick: (payload) => problems.push(payload),
      });
      expect(labels(view.container)).toEqual(['A', 'C', '', '', '']);
      const body = rows(view.container);
      expect(cells(body[0]).map(statusText)).toEqual(['+0:01', '+0:02', '+0:06', '-10:03', '-10:05']);
      expect(cells(body[1]).map(statusText)).toEqual(['+0:02', '+0:03', '-10:02', '-10:04', '']);
      expect(cells(body[0])[0].querySelector('.srk-prest-status-block-fb-star')).not.toBeNull();
      const hiddenFB = cells(body[0])[2];
      expect(hiddenFB.classList.contains('srk-prest-status-block-accepted')).toBe(true);
      expect(hiddenFB.classList.contains('srk-prest-status-block-fb')).toBe(false);
      expect(hiddenFB.querySelector('.srk-prest-status-block-fb-star')).toBeNull();
      hiddenFB.click();
      await view.flush();
      expect(clicks).toHaveLength(1);
      expect(clicks[0]).toMatchObject({
        problemIndex: 1,
        problemRevealed: false,
        status: { result: 'FB' },
        solutions: [{ result: 'FB' }],
      });
      expect(clicks[0].problem).toEqual(data.problems[1]);
      const headers = Array.from(view.container.querySelectorAll<HTMLElement>('thead .srk-problem-header'));
      headers.slice(2).forEach((header) => {
        expect(header.textContent).toBe('');
        expect(header.getAttribute('style')).toBeNull();
        expect(header.querySelector('a, [title], [data-tooltip]')).toBeNull();
        header.click();
      });
      await view.flush();
      expect(problems).toHaveLength(0);
      headers[1].click();
      await view.flush();
      expect(problems[0]?.problemIndex).toBe(2);
      expect(JSON.stringify(data)).toBe(before);
    });

    it('reacts to reveal, rewind and disabling without changing original cell identity', async () => {
      const data = makeCCPC26Ranklist();
      const props: CCPC26RanklistProps = { data, enableCCPC26: true, statusCellPreset: 'compact' };
      const view = await render(props);
      const later = makeCCPC26Ranklist();
      later.rows[1].statuses[1] = { result: 'AC', tries: 1, time: [7, 'min'] };
      await view.update({ ...props, data: later });
      expect(labels(view.container)).toEqual(['A', 'B', 'C', '', '']);
      expect(cells(rows(view.container)[0])[1].classList.contains('srk-prest-status-block-fb')).toBe(true);
      await view.update(props);
      expect(labels(view.container)).toEqual(['A', 'C', '', '', '']);
      await view.update({ ...props, enableCCPC26: false });
      expect(labels(view.container)).toEqual(['A', 'B', 'C', 'D', 'E']);
      expect(cells(rows(view.container)[0])[1].classList.contains('srk-prest-status-block-fb')).toBe(true);
      expect(view.container.querySelector('.srk-ccpc26-revealed-columns')).toBeNull();
    });

    it('aligns the partial-reveal footer and separator and removes the separator for all/none revealed', async () => {
      const props: CCPC26RanklistProps = {
        data: makeCCPC26Ranklist(),
        enableCCPC26: true,
        showProblemStatisticsFooter: true,
        splitOrganization: true,
        showDirtColumn: true,
        showSEColumn: true,
        columnBordered: true,
      };
      const view = await render(props);
      expect(Array.from(view.container.querySelectorAll('colgroup')).map((col) => col.getAttribute('span'))).toEqual([
        '5',
        '2',
        '5',
      ]);
      expect(view.container.querySelector('thead .srk-ccpc26-revealed-boundary')?.textContent).toContain('C');
      for (const row of Array.from(view.container.querySelectorAll('tfoot tr'))) {
        const values = Array.from(
          row.querySelectorAll('.srk-problem-statistics-footer-cell:not(.srk-extra-statistics-footer-cell)'),
        );
        expect(values).toHaveLength(5);
        expect(values.slice(2).map(text)).toEqual(['', '', '']);
      }
      await view.update({ ...props, data: makeCCPC26Ranklist(0) });
      expect(labels(view.container)).toEqual(['A', 'B', 'C', 'D', 'E']);
      expect(view.container.querySelector('.srk-ccpc26-revealed-columns, .srk-ccpc26-revealed-boundary')).toBeNull();
      await view.update({ ...props, data: makeCCPC26Ranklist(3) });
      expect(labels(view.container)).toEqual(['', '', '', '', '']);
      expect(view.container.querySelector('.srk-ccpc26-revealed-columns, .srk-ccpc26-revealed-boundary')).toBeNull();
    });

    it('keeps all columns for missing statuses and falls back to ordinary mode without configuration', async () => {
      const data = makeCCPC26Ranklist();
      data.rows[1].statuses = [];
      const view = await render({ data, enableCCPC26: true });
      expect(rows(view.container).map((row) => cells(row).length)).toEqual([5, 5]);
      const ordinary = makeCCPC26Ranklist();
      ordinary.sorter = { algorithm: 'ICPC', config: {} };
      await view.update({ data: ordinary, enableCCPC26: true });
      expect(labels(view.container)).toEqual(['A', 'B', 'C', 'D', 'E']);
    });

    it('updates modal anonymity and FB labels while preserving records and explicit titles', async () => {
      const data = makeCCPC26Ranklist();
      const props: CCPC26ModalProps = {
        open: true,
        user: data.rows[0].user,
        problem: data.problems[1],
        problemIndex: 1,
        solutions: data.rows[0].statuses[1].solutions!,
      };
      const before = JSON.stringify(props.solutions);
      const view = await modal(props);
      expect(text(view.container.querySelector('.srk-modal-title'))).toBe('Solutions of B (Alpha)');
      expect(text(view.container.querySelector('.srk-solution-result-text'))).toBe('First Blood');
      await view.update({ ...props, problemRevealed: false });
      expect(text(view.container.querySelector('.srk-modal-title'))).toBe('Solutions (Alpha)');
      expect(text(view.container.querySelector('.srk-solution-result-text'))).toBe('Accepted');
      expect(view.container.querySelector('.srk-preset-result-fb')).toBeNull();
      expect(view.container.querySelector('.srk-solutions-table')?.getAttribute('aria-label') || '').not.toContain('B');
      expect(JSON.stringify(props.solutions)).toBe(before);
      await view.update({ ...props, problemRevealed: false, title: 'Custom submissions' });
      expect(text(view.container.querySelector('.srk-modal-title'))).toBe('Custom submissions');
      await view.update({ ...props, problemRevealed: true });
      expect(text(view.container.querySelector('.srk-solution-result-text'))).toBe('First Blood');
    });

    it('keeps the anonymous modal title and records during close after the selection clears', async () => {
      const data = makeCCPC26Ranklist();
      const view = await modal({
        open: true,
        user: data.rows[0].user,
        problem: data.problems[1],
        problemIndex: 1,
        problemRevealed: false,
        solutions: data.rows[0].statuses[1].solutions!,
      });
      await view.update({ open: false, user: null, problemIndex: 0, solutions: [] });
      expect(text(view.container.querySelector('.srk-modal-title'))).toBe('Solutions (Alpha)');
      expect(text(view.container.querySelector('.srk-solution-result-text'))).toBe('Accepted');
      expect(view.container.querySelector('.srk-preset-result-fb')).toBeNull();
    });
  });
}
