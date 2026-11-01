import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCCPC26ProblemLayout } from '@algoux/standard-ranklist-utils';
import { Ranklist, type RanklistProps, type StatusCellProps, type UserCellProps } from '../Ranklist';
import { makeCCPC26Ranklist } from '../../../../tests/shared/ccpc26-fixture';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
function fixture() {
  const data = makeCCPC26Ranklist();
  data.markers = [{ id: 'member', label: 'Member', style: 'pink' }];
  const extra = clone(data.rows[1]);
  extra.user = {
    id: 'gamma',
    name: { en: 'Gamma', 'zh-CN': '伽马', fallback: 'Gamma' },
    organization: { en: 'School G', 'zh-CN': '伽马大学', fallback: 'School G' },
    avatar: 'https://example.com/gamma.png',
    markers: ['member'],
  };
  data.rows.push(extra);
  return data;
}
const widths = (data: RanklistProps['data'], split = false) =>
  Array(data.series.length + 2 + 1 + data.problems.length + (split ? 1 : 0)).fill(72);
const rows = (root: ParentNode) => Array.from(root.querySelectorAll<HTMLTableRowElement>('tbody > tr'));
const identities = (root: ParentNode) => Array.from(root.querySelectorAll<HTMLElement>('[data-search-text]'));
const statuses = (row: ParentNode) =>
  Array.from(row.querySelectorAll<HTMLElement>('.srk-prest-status-block, .srk-status-placeholder-cell'));
const cleanups: Array<() => void> = [];
afterEach(() => {
  cleanups
    .splice(0)
    .reverse()
    .forEach((dispose) => dispose());
  vi.restoreAllMocks();
});

function mount(initial: RanklistProps) {
  let current = initial;
  const view = render(<Ranklist {...current} />);
  cleanups.push(view.unmount);
  return {
    container: view.container,
    update(next: Partial<RanklistProps>) {
      current = { ...current, ...next };
      view.rerender(<Ranklist {...current} />);
    },
  };
}

describe('React controlled row windows', () => {
  it('keeps actual identity elements and Text nodes through window/full/re-entry while decorations stay rich-only', () => {
    const data = fixture();
    const before = JSON.stringify(data);
    const view = mount({
      data,
      retainUserText: true,
      rowWindow: { start: 1, end: 2 },
      columnWidths: widths(data),
      rowHeight: 61,
      languages: ['en'],
    });
    const nodes = identities(view.container);
    const texts = nodes.map((node) => node.firstChild);
    expect(rows(view.container).length).toBe(3);
    expect(nodes.map((node) => node.textContent)).toEqual([
      'Alpha',
      'School A',
      'Beta',
      'School B',
      'Gamma',
      'School G',
    ]);
    expect(statuses(rows(view.container)[0]).length).toBe(0);
    expect(statuses(rows(view.container)[1]).length).toBe(5);
    expect(view.container.querySelectorAll('.srk-search-user-avatar, .srk-search-markers').length).toBe(0);
    for (const rowWindow of [{ start: 2, end: 3 }, undefined, { start: 0, end: 1 }]) {
      view.update({ rowWindow });
      const next = identities(view.container);
      expect(next.length).toBe(nodes.length);
      next.forEach((node, index) => {
        expect(node).toBe(nodes[index]);
        expect(node.firstChild).toBe(texts[index]);
      });
      if (rowWindow?.start === 2) {
        expect(
          Array.from(rows(view.container)[2].querySelector('.srk-user-cell')!.children).map((node) => node.className),
        ).toEqual([
          'srk-user-name-text',
          'srk-marker-dot-group srk-search-markers',
          'srk-user-secondary-text srk-search-organization',
          'srk-search-user-avatar',
        ]);
      }
    }
    expect(JSON.stringify(data)).toBe(before);
  });

  it('preserves identity across immutable reorder/filter snapshots and keeps current global event indices and languages', () => {
    const data = fixture();
    const onUserClick = vi.fn();
    const onSolutionClick = vi.fn();
    const view = mount({
      data,
      retainUserText: true,
      rowWindow: { start: 1, end: 2 },
      columnWidths: widths(data),
      languages: ['en'],
      onUserClick,
      onSolutionClick,
    });
    const gamma = rows(view.container)[2].querySelector<HTMLElement>('[data-search-text="name"]')!;
    const gammaText = gamma.firstChild;
    const next = clone(data);
    next.rows = [next.rows[2], next.rows[0], next.rows[1]];
    view.update({ data: next, rowWindow: { start: 0, end: 1 } });
    expect(rows(view.container)[0].querySelector('[data-search-text="name"]')).toBe(gamma);
    expect(gamma.firstChild).toBe(gammaText);
    fireEvent.click(gamma);
    expect(onUserClick.mock.calls[0][0]).toMatchObject({ user: { id: 'gamma' }, rowIndex: 0 });
    expect(onUserClick.mock.calls[0][0].row).toBe(next.rows[0]);
    expect(onUserClick.mock.calls[0][0].ranklist).toBe(next);
    fireEvent.click(statuses(rows(view.container)[0])[0]);
    expect(onSolutionClick.mock.calls[0][0]).toMatchObject({ user: { id: 'gamma' }, rowIndex: 0, problemIndex: 0 });
    const filtered = { ...next, rows: [next.rows[0], next.rows[2]] };
    view.update({ data: filtered, languages: ['zh-CN'] });
    expect(rows(view.container).length).toBe(2);
    expect(rows(view.container)[0].querySelector('[data-search-text="name"]')).toBe(gamma);
    expect(gamma.firstChild).toBe(gammaText);
    expect(gamma.textContent).toBe('伽马');
    expect(view.container.querySelectorAll('[data-search-text="organization"]').length).toBe(2);
  });

  it('keeps cell alignment without valid widths and only treats the real Name region as a light-cell pointer target', () => {
    const data = fixture();
    const clicked = vi.fn();
    const view = mount({
      data,
      retainUserText: true,
      rowWindow: { start: 0, end: 0 },
      columnWidths: [40],
      onUserClick: clicked,
    });
    const name = rows(view.container)[1].querySelector('[data-search-text="name"]');
    expect(rows(view.container)[1].cells.length).toBe(3);
    expect(Array.from(rows(view.container)[1].cells).reduce((sum, cell) => sum + cell.colSpan, 0)).toBe(9);
    expect(rows(view.container)[1].getAttribute('data-thin-row')).toBeNull();
    expect((view.container.querySelector('table') as HTMLTableElement).style.tableLayout).toBe('');
    view.update({ columnWidths: widths(data) });
    const cell = rows(view.container)[1].querySelector<HTMLTableCellElement>('.srk-user-cell')!;
    expect(cell.colSpan).toBe(9);
    expect(rows(view.container)[1].querySelector('[data-search-text="name"]')).toBe(name);
    const header = view.container.querySelectorAll('thead th')[1];
    vi.spyOn(header, 'getBoundingClientRect').mockReturnValue({ left: 100, right: 200 } as DOMRect);
    fireEvent.click(cell, { detail: 1, clientX: 50 });
    expect(clicked).not.toHaveBeenCalled();
    fireEvent.click(cell, { detail: 1, clientX: 150 });
    expect(clicked.mock.calls[0][0].rowIndex).toBe(1);
    fireEvent.click(name!, { detail: 1, clientX: 250 });
    expect(clicked).toHaveBeenCalledTimes(2);
    view.update({ splitOrganization: true, columnWidths: widths(data, true) });
    expect(rows(view.container)[1].querySelector('[data-search-text="name"]')).toBe(name);
    expect(rows(view.container)[1].cells.length).toBe(2);
    expect(Array.from(rows(view.container)[1].cells).map((td) => td.colSpan)).toEqual([2, 8]);
    expect(view.container.querySelectorAll('[data-search-text="organization"]').length).toBe(3);
    view.update({ splitOrganization: false, columnWidths: widths(data) });
    expect(view.container.querySelectorAll('[data-search-text="organization"]').length).toBe(3);
  });

  it('leaves non-retained light rows blank and preserves total row/column and footer accessibility indices', () => {
    const data = fixture();
    const view = mount({
      data,
      rowWindow: { start: 1, end: 2 },
      columnWidths: widths(data),
      rowHeight: 61,
      showProblemStatisticsFooter: true,
    });
    expect(rows(view.container).length).toBe(3);
    expect(rows(view.container)[0].textContent).toBe('');
    expect(rows(view.container)[0].cells.length).toBe(1);
    expect(rows(view.container)[0].cells[0].colSpan).toBe(9);
    expect(rows(view.container)[1].textContent).toContain('Beta');
    expect(rows(view.container)[1].style.height).toBe('61px');
    expect(rows(view.container)[1].getAttribute('aria-rowindex')).toBe('3');
    expect(view.container.querySelector('table')?.getAttribute('aria-rowcount')).toBe('12');
    expect(view.container.querySelector('tfoot tr')?.getAttribute('aria-rowindex')).toBe('5');
    expect(view.container.querySelector('tfoot tr:last-child')?.getAttribute('aria-rowindex')).toBe('12');
    view.update({ rowWindow: { start: -3, end: 1.9 }, rowHeight: Infinity });
    expect(rows(view.container)[0].textContent).toContain('Alpha');
    expect(rows(view.container)[1].textContent).toBe('');
    expect(rows(view.container)[0].style.height).toBe('');
    view.update({ rowWindow: { start: NaN, end: 2 } });
    expect(rows(view.container).every((row) => row.dataset.richRow === 'true')).toBe(true);
  });

  it('uses full data for CCPC26 layout/footer and keeps original anonymous problem indices inside a row window', () => {
    const data = makeCCPC26Ranklist();
    const layout = getCCPC26ProblemLayout(data)!;
    const clicked = vi.fn();
    const view = mount({
      data,
      retainUserText: true,
      rowWindow: { start: 1, end: 2 },
      columnWidths: widths(data),
      enableCCPC26: true,
      ccpc26ProblemLayout: layout,
      onSolutionClick: clicked,
      showProblemStatisticsFooter: true,
    });
    const labels = () =>
      Array.from(view.container.querySelectorAll('thead th.srk-problem-header')).map(
        (cell) => cell.querySelector('span')?.textContent || '',
      );
    expect(labels()).toEqual(['A', 'C', '', '', '']);
    expect(Array.from(view.container.querySelectorAll('colgroup')).map((group) => group.children.length)).toEqual([
      4, 2, 3,
    ]);
    expect(view.container.querySelectorAll('colgroup.srk-ccpc26-revealed-columns col').length).toBe(2);
    expect((view.container.querySelectorAll('col')[1] as HTMLElement).style.width).toBe('auto');
    expect(statuses(rows(view.container)[0]).length).toBe(0);
    fireEvent.click(statuses(rows(view.container)[1])[3]);
    expect(clicked.mock.calls[0][0]).toMatchObject({
      rowIndex: 1,
      problemIndex: 1,
      problemRevealed: false,
      user: { id: 'beta' },
    });
    expect(view.container.querySelector('tfoot .srk-problem-statistics-footer-cell')?.textContent).toContain('2');
    const alpha = rows(view.container)[0].querySelector('[data-search-text="name"]');
    view.update({ data: { ...data, rows: [data.rows[0]] }, rowWindow: { start: 0, end: 1 } });
    expect(labels()).toEqual(['A', 'C', '', '', '']);
    expect(rows(view.container)[0].querySelector('[data-search-text="name"]')).toBe(alpha);
  });

  it('treats identity strings as text and avoids empty marker line boxes', () => {
    const data = makeCCPC26Ranklist();
    data.rows[0].user.name = '<img src=x onerror=alert(1)>';
    data.rows[0].user.organization = '<script>bad</script> & school';
    const view = mount({ data, retainUserText: true, rowWindow: { start: 0, end: 1 } });
    expect(rows(view.container)[0].querySelector('[data-search-text="name"]')?.textContent).toBe(
      '<img src=x onerror=alert(1)>',
    );
    expect(view.container.querySelector('script, img[onerror]')).toBeNull();
    expect(view.container.querySelector('.srk-search-markers')).toBeNull();
  });

  it('only invokes custom status components in rich rows and falls back to complete rendering for custom user cells', () => {
    const data = fixture();
    const calls: StatusCellProps[] = [];
    const CustomStatus = (props: StatusCellProps) => {
      calls.push(props);
      return <td data-custom-status>{props.problemIndex}</td>;
    };
    const view = mount({
      data,
      retainUserText: true,
      rowWindow: { start: 1, end: 2 },
      components: { statusCell: CustomStatus },
    });
    expect(view.container.querySelectorAll('[data-custom-status]').length).toBe(5);
    expect(calls.every((call) => call.rowIndex === 1 && call.user.id === 'beta')).toBe(true);
    const CustomUser = (props: UserCellProps) => <td data-custom-user>{props.user.id}</td>;
    view.update({ components: { userCell: CustomUser, statusCell: CustomStatus } });
    expect(view.container.querySelectorAll('[data-custom-user]').length).toBe(3);
    expect(view.container.querySelectorAll('[data-custom-status]').length).toBe(15);
    expect(rows(view.container).every((row) => row.dataset.richRow === 'true')).toBe(true);
    expect(identities(view.container).length).toBe(0);
  });
});
