import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { compile } from 'svelte/compiler';
import { tick } from 'svelte';
import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { afterEach, describe, expect, it } from 'vitest';
import Ranklist from '../Ranklist.svelte';
import WindowSlotsHost from './WindowSlotsHost.svelte';
import { makeCCPC26Ranklist } from '../../../../tests/shared/ccpc26-fixture';

function fixture() {
  const data = makeCCPC26Ranklist();
  data.markers = [{ id: 'marked', label: 'Visible marker', style: 'blue' }];
  data.rows.forEach(row => { row.user.avatar = 'https://example.com/avatar.png'; row.user.markers = ['marked']; });
  return data;
}
const widths = (split = false) => Array(split ? 10 : 9).fill(60);
afterEach(cleanup);

describe('Svelte controlled rich-cell window', () => {
  it('retains real identity Text nodes while the controlled window moves and becomes full', async () => {
    const data = fixture();
    const view = render(Ranklist, { props: { data, rowWindow: { start: 1, end: 2 }, retainUserText: true, columnWidths: widths(), rowHeight: 61 } });
    const rows = Array.from(view.container.querySelectorAll('tbody tr'));
    const names = rows.map(row => row.querySelector('[data-search-text="name"]')!);
    const organizations = rows.map(row => row.querySelector('[data-search-text="organization"]')!);
    const texts = [...names, ...organizations].map(node => node.firstChild);
    expect(rows).toHaveLength(2);
    expect(rows[0].getAttribute('data-thin-row')).toBe('true');
    expect(rows[0].children).toHaveLength(1);
    expect(rows[0].querySelector('td')?.getAttribute('colspan')).toBe('9');
    expect(rows[0].querySelectorAll('img,.srk-marker-dot,.srk-prest-status-block')).toHaveLength(0);
    expect(rows[1].querySelectorAll('img')).toHaveLength(1);
    expect(rows[1].querySelectorAll('.srk-marker-dot')).toHaveLength(1);
    expect(view.container.querySelectorAll('col')).toHaveLength(9);
    expect(view.container.querySelector('table')?.getAttribute('data-row-height')).toBe('61');
    for (const rowWindow of [{ start: 0, end: 1 }, undefined]) {
      view.component.$set({ rowWindow }); await tick();
      const next = [...view.container.querySelectorAll('[data-search-text="name"]'), ...view.container.querySelectorAll('[data-search-text="organization"]')];
      next.forEach((node, i) => { expect(node).toBe([...names, ...organizations][i]); expect(node.firstChild).toBe(texts[i]); });
    }
    expect(rows.every(row => row.getAttribute('data-rich-row') === 'true')).toBe(true);
  });

  it('keeps exactly one school text in split mode and uses real placeholder cells without valid widths', async () => {
    const view = render(Ranklist, { props: { data: fixture(), rowWindow: { start: 1, end: 2 }, retainUserText: true, splitOrganization: true, columnWidths: widths(true) } });
    const first = view.container.querySelector('tbody tr')!;
    const organization = first.querySelector('[data-search-text="organization"]')!;
    const text = organization.firstChild;
    expect(first.querySelectorAll('[data-search-text="organization"]')).toHaveLength(1);
    expect(first.children).toHaveLength(2);
    view.component.$set({ rowWindow: undefined }); await tick();
    expect(first.querySelector('[data-search-text="organization"]')).toBe(organization);
    expect(organization.firstChild).toBe(text);
    view.component.$set({ rowWindow: { start: 1, end: 2 }, columnWidths: [NaN] }); await tick();
    expect(first.hasAttribute('data-thin-row')).toBe(false);
    expect(first.children).toHaveLength(10);
    expect(view.container.querySelectorAll('col')).toHaveLength(0);
  });

  it('preserves user nodes across immutable reorder and updates language/data text', async () => {
    const data = fixture();
    data.rows[0].user.name = { fallback: 'Alpha', en: '<Alpha>', 'zh-CN': '甲队' };
    const view = render(Ranklist, { props: { data, retainUserText: true, rowWindow: { start: 0, end: 1 }, languages: ['en'] } });
    const name = view.container.querySelector('[data-search-text="name"]')!;
    const text = name.firstChild;
    expect(name.textContent).toBe('<Alpha>'); expect(name.children).toHaveLength(0);
    const next = JSON.parse(JSON.stringify(data)); next.rows.reverse();
    view.component.$set({ data: next, languages: ['zh-CN'] }); await tick();
    expect(view.container.querySelectorAll('[data-search-text="name"]')[1]).toBe(name);
    expect(name.firstChild).toBe(text); expect(name.textContent).toBe('甲队');
  });

  it('keeps global indexes/full ranklist payloads and rejects blank spanned-cell pointer hits', async () => {
    const data = fixture(); const users: any[] = []; const solutions: any[] = [];
    const view = render(Ranklist, { props: { data, retainUserText: true, rowWindow: { start: 1, end: 2 }, columnWidths: widths(), showProblemStatisticsFooter: true } });
    view.component.$on('userClick', event => users.push(event.detail));
    view.component.$on('solutionClick', event => solutions.push(event.detail));
    const cells = view.container.querySelectorAll('tbody .srk-user-cell');
    const header = view.container.querySelectorAll('thead th')[1];
    header.getBoundingClientRect = () => ({ left: 100, right: 200 } as DOMRect);
    await fireEvent.click(cells[0], { detail: 1, clientX: 250 }); expect(users).toHaveLength(0);
    await fireEvent.click(cells[0], { detail: 1, clientX: 150 });
    await fireEvent.click(cells[1]);
    await fireEvent.click(view.container.querySelectorAll('tbody tr')[1].querySelector('.srk-prest-status-block')!);
    expect(users.map(x => x.rowIndex)).toEqual([0, 1]); expect(users[1].ranklist).toBe(data);
    expect(solutions[0]).toMatchObject({ rowIndex: 1, problemIndex: 0, user: data.rows[1].user });
    expect(solutions[0].ranklist).toBe(data);
    expect(view.container.querySelector('table')?.getAttribute('aria-rowcount')).toBe('11');
    expect(view.container.querySelector('tfoot tr')?.getAttribute('aria-rowindex')).toBe('4');
  });

  it('renders only the rich status slots and falls back to full rendering for a custom user slot', () => {
    const data = fixture();
    const view = render(WindowSlotsHost, { props: { data } });
    expect(view.container.querySelectorAll('[data-custom-status]')).toHaveLength(5);
    expect([...view.container.querySelectorAll('[data-custom-status]')].every(el => el.getAttribute('data-custom-status') === '1' && el.textContent === '2')).toBe(true);
    view.unmount();
    const custom = render(WindowSlotsHost, { props: { data, customUser: true } });
    expect(custom.container.querySelectorAll('[data-custom-user]')).toHaveLength(2);
    expect(custom.container.querySelectorAll('[data-custom-status]')).toHaveLength(10);
    expect([...custom.container.querySelectorAll('tbody tr')].every(el => el.getAttribute('data-rich-row') === 'true')).toBe(true);
  });

  it('keeps CCPC26 disclosure global and preserves segmented fixed colgroups', () => {
    const data = fixture();
    const view = render(Ranklist, { props: { data, rowWindow: { start: 1, end: 2 }, retainUserText: true, columnWidths: widths(), enableCCPC26: true } });
    expect(view.container.querySelectorAll('thead .srk-problem-header').length).toBe(5);
    expect([...view.container.querySelectorAll('thead .srk-problem-header')].map(el => el.textContent?.replace(/\s+/g, ''))).toEqual(['A99', 'C99', '', '', '']);
    expect(view.container.querySelector('.srk-ccpc26-revealed-columns')?.querySelectorAll('col')).toHaveLength(2);
    expect(view.container.querySelectorAll('col')).toHaveLength(9);
  });

  it('normalizes invalid bounds/height and leaves no retained text when not requested', async () => {
    const view = render(Ranklist, { props: { data: fixture(), rowWindow: { start: 0, end: 0 }, rowHeight: -1 } });
    expect([...view.container.querySelectorAll('tbody tr')].every(row => row.children.length === 1 && !row.textContent?.trim())).toBe(true);
    expect(view.container.querySelector('table')?.hasAttribute('data-row-height')).toBe(false);
    view.component.$set({ rowWindow: { start: NaN, end: 2 } }); await tick();
    expect([...view.container.querySelectorAll('tbody tr')].every(row => row.getAttribute('data-rich-row') === 'true')).toBe(true);
  });

  it('SSR emits all real identity rows with the same controlled window and widths', () => {
    const source = readFileSync(resolve(process.cwd(), 'packages/svelte/src/Ranklist.svelte'), 'utf8');
    const compiled = compile(source, { generate: 'ssr', format: 'cjs' });
    const module = { exports: {} as any };
    const require = createRequire(resolve(process.cwd(), 'packages/svelte/package.json'));
    new Function('require', 'module', 'exports', compiled.js.code)(require, module, module.exports);
    const html = module.exports.default.render({ data: fixture(), languages: ['en'], rowWindow: { start: 1, end: 2 }, retainUserText: true, columnWidths: widths(), rowHeight: 61 }).html;
    const template = document.createElement('template'); template.innerHTML = html;
    expect(template.content.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(template.content.querySelectorAll('[data-search-text="name"]')).toHaveLength(2);
    expect(template.content.querySelector('tbody tr')?.getAttribute('data-rich-row')).toBe('false');
    expect(template.content.querySelectorAll('col')).toHaveLength(9);
  });
});
