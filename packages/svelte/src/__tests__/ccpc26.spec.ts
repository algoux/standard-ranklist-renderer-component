import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { tick } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';
import { resetModalInteractionStateForTests } from '@algoux/standard-ranklist-renderer-component-core';
import Ranklist from '../Ranklist.svelte';
import DefaultSolutionModal from '../DefaultSolutionModal.svelte';
import CCPC26SlotsHost from './CCPC26SlotsHost.svelte';
import {
  describeCCPC26Contract,
  type CCPC26RanklistProps,
  type CCPC26ModalProps,
} from '../../../../tests/shared/ccpc26-contract';
import { makeCCPC26Ranklist } from '../../../../tests/shared/ccpc26-fixture';

const ranklistProps = ({ onSolutionClick, ...props }: CCPC26RanklistProps) => ({
  enableCCPC26: false,
  statusCellPreset: 'classic' as const,
  statusColorAsText: false,
  showProblemStatisticsFooter: false,
  columnBordered: false,
  splitOrganization: false,
  showDirtColumn: false,
  showSEColumn: false,
  onProblemClick: undefined,
  ...props,
});
const modalProps = (props: CCPC26ModalProps) => ({
  title: undefined,
  problem: undefined,
  problemRevealed: true,
  ...props,
});

describeCCPC26Contract({
  target: 'Svelte',
  renderRanklist(props) {
    let current = props;
    const view = render(Ranklist, { props: ranklistProps(props) });
    view.component.$on('solutionClick', (event) => current.onSolutionClick?.(event.detail));
    return {
      container: view.container,
      async update(next) {
        current = next;
        view.component.$set(ranklistProps(next));
        await tick();
      },
      flush: tick,
      cleanup: view.unmount,
    };
  },
  renderModal(props) {
    const view = render(DefaultSolutionModal, { props: modalProps(props) });
    return {
      container: view.container,
      async update(next) {
        view.component.$set(modalProps(next));
        await tick();
      },
      flush: tick,
      cleanup: view.unmount,
    };
  },
});

afterEach(() => {
  cleanup();
  resetModalInteractionStateForTests();
});

describe('Svelte CCPC26 slots', () => {
  it('passes original identities and reveal metadata to slots, preserving mounted cells after reordering', async () => {
    const data = makeCCPC26Ranklist();
    const clicks: unknown[] = [];
    const view = render(CCPC26SlotsHost, { props: { data, enableCCPC26: true } });
    view.component.$on('solutionClick', (event) => clicks.push(event.detail));
    const headers = () => Array.from(view.container.querySelectorAll('[data-header-index]'));
    const rowCells = () =>
      Array.from(view.container.querySelectorAll('tbody tr')).map((row) =>
        Array.from(row.querySelectorAll('[data-problem-index]')),
      );
    expect(headers().map((header) => header.getAttribute('data-header-index'))).toEqual(['0', '2']);
    expect(headers()[1].classList.contains('srk-ccpc26-revealed-boundary')).toBe(true);
    expect(rowCells().map((cells) => cells.map((cell) => cell.getAttribute('data-problem-index')))).toEqual([
      ['0', '2', '1', '4', '3'],
      ['0', '2', '3', '1', '4'],
    ]);
    expect(rowCells()[0].map((cell) => cell.getAttribute('data-revealed'))).toEqual([
      'true',
      'true',
      'false',
      'false',
      'false',
    ]);
    expect(rowCells()[0][2].getAttribute('data-raw-result')).toBe('FB');
    expect(rowCells()[0][2].getAttribute('data-display-result')).toBe('AC');
    await fireEvent.click(rowCells()[0][2]);
    expect(clicks).toEqual([
      expect.objectContaining({ problemIndex: 1, problemRevealed: false, status: { ...data.rows[0].statuses[1] } }),
    ]);

    const later = makeCCPC26Ranklist();
    later.rows[1].statuses[1] = { result: 'AC', tries: 1, time: [7, 'min'] };
    view.component.$set({ data: later });
    await tick();
    expect(headers().map((header) => header.getAttribute('data-header-index'))).toEqual(['0', '1', '2']);
    rowCells()
      .flat()
      .forEach((cell) => expect(cell.getAttribute('data-mounted-for')).toBe(cell.getAttribute('data-problem-index')));
    expect(rowCells()[0][1].getAttribute('data-display-result')).toBe('FB');
    view.component.$set({ data, enableCCPC26: false });
    await tick();
    expect(headers()).toHaveLength(5);
    expect(rowCells()[0].map((cell) => cell.getAttribute('data-problem-index'))).toEqual(['0', '1', '2', '3', '4']);
  });
});

describe('Svelte unsupported ranklist guards', () => {
  it.each([
    ['custom', '0.3.14', 'srk type "custom" is not supported'],
    ['general', '999.0.0', 'srk version "999.0.0" is not supported'],
  ])('keeps the existing unsupported message for %s / %s without problems', async (type, version, message) => {
    const data = { type, version, rows: [], series: [] } as unknown as CCPC26RanklistProps['data'];
    const view = render(Ranklist, { props: { data, enableCCPC26: true } });
    expect(view.container.textContent).toContain(message);
    expect(view.container.querySelector('table')).toBeNull();
    view.component.$set({ data: makeCCPC26Ranklist() });
    await tick();
    expect(view.container.querySelectorAll('thead .srk-problem-header')).toHaveLength(5);
  });
});
