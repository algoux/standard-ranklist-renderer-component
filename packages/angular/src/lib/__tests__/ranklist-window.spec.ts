import 'zone.js';
import '@angular/compiler';
import { Component, createComponent, SimpleChange, type Type } from '@angular/core';
import { createApplication } from '@angular/platform-browser';
import { describe, expect, it, vi } from 'vitest';
import { RanklistComponent, SrkStatusCellTemplateDirective, SrkUserCellTemplateDirective } from '../index';
import { makeCCPC26Ranklist } from '../../../../../tests/shared/ccpc26-fixture';

function fixture() {
  const data = makeCCPC26Ranklist();
  data.markers = [{ id: 'marked', label: 'Visible marker', style: 'blue' }];
  data.rows.forEach(row => { row.user.avatar = 'https://example.com/avatar.png'; row.user.markers = ['marked']; });
  return data;
}
const widths = (split = false) => Array(split ? 10 : 9).fill(60);
async function mount<T>(component: Type<T>, props: Record<string, unknown> = {}) {
  const container = document.createElement('div'); document.body.appendChild(container);
  const app = await createApplication();
  const ref = createComponent(component, { environmentInjector: app.injector, hostElement: container });
  app.attachView(ref.hostView);
  const update = (next: Record<string, unknown>) => { for (const [key, value] of Object.entries(next)) ref.setInput(key, value); ref.changeDetectorRef.detectChanges(); };
  update(props);
  return { container, ref, update, cleanup() { app.detachView(ref.hostView); ref.destroy(); app.destroy(); container.remove(); } };
}

@Component({ standalone: true, imports: [RanklistComponent, SrkStatusCellTemplateDirective], template: `
  <srk-ranklist [data]="data" [rowWindow]="{start:1,end:2}" [retainUserText]="true">
    <ng-template srkStatusCell let-rowIndex="rowIndex" let-problemIndex="problemIndex" let-ranklist="ranklist">
      <td [attr.data-custom-status]="rowIndex" [attr.data-problem]="problemIndex">{{ ranklist.rows.length }}</td>
    </ng-template>
  </srk-ranklist>` })
class StatusHost { data = fixture(); }
@Component({ standalone: true, imports: [RanklistComponent, SrkStatusCellTemplateDirective, SrkUserCellTemplateDirective], template: `
  <srk-ranklist [data]="data" [rowWindow]="{start:1,end:2}" [retainUserText]="true">
    <ng-template srkUserCell let-user="user" let-rowIndex="rowIndex"><td [attr.data-custom-user]="rowIndex">{{ user.name }}</td></ng-template>
    <ng-template srkStatusCell let-rowIndex="rowIndex"><td [attr.data-custom-status]="rowIndex"></td></ng-template>
  </srk-ranklist>` })
class UserHost { data = fixture(); }

describe('Angular controlled rich-cell window', () => {
  it('preserves actual identity elements/Text nodes across window movement and full mode', async () => {
    const view = await mount(RanklistComponent, { data: fixture(), retainUserText: true, rowWindow: { start: 1, end: 2 }, columnWidths: widths(), rowHeight: 61 });
    try {
      const rows = Array.from(view.container.querySelectorAll('tbody tr'));
      const names = rows.map(row => row.querySelector('[data-search-text="name"]')!);
      const organizations = rows.map(row => row.querySelector('[data-search-text="organization"]')!);
      const texts = [...names, ...organizations].map(node => node.firstChild);
      expect(rows).toHaveLength(2); expect(rows[0].getAttribute('data-thin-row')).toBe('true');
      expect(rows[0].children).toHaveLength(1); expect(rows[0].querySelector('td')?.getAttribute('colspan')).toBe('9');
      expect(rows[0].querySelectorAll('img,.srk-marker-dot,.srk-prest-status-block')).toHaveLength(0);
      expect(rows[1].querySelectorAll('img')).toHaveLength(1); expect(rows[1].querySelectorAll('.srk-marker-dot')).toHaveLength(1);
      expect(view.container.querySelectorAll('col')).toHaveLength(9);
      expect(view.container.querySelector('table')?.getAttribute('data-row-height')).toBe('61');
      for (const rowWindow of [{ start: 0, end: 1 }, undefined]) {
        view.update({ rowWindow });
        const next = [...view.container.querySelectorAll('[data-search-text="name"]'), ...view.container.querySelectorAll('[data-search-text="organization"]')];
        next.forEach((node, index) => { expect(node).toBe([...names, ...organizations][index]); expect(node.firstChild).toBe(texts[index]); });
      }
      expect(rows.every(row => row.getAttribute('data-rich-row') === 'true')).toBe(true);
    } finally { view.cleanup(); }
  });

  it('keeps one organization text per split row and falls back to physical placeholder columns', async () => {
    const view = await mount(RanklistComponent, { data: fixture(), rowWindow: { start: 1, end: 2 }, retainUserText: true, splitOrganization: true, columnWidths: widths(true) });
    try {
      const first = view.container.querySelector('tbody tr')!;
      const organization = first.querySelector('[data-search-text="organization"]')!; const text = organization.firstChild;
      expect(first.querySelectorAll('[data-search-text="organization"]')).toHaveLength(1); expect(first.children).toHaveLength(2);
      view.update({ rowWindow: undefined });
      expect(first.querySelector('[data-search-text="organization"]')).toBe(organization); expect(organization.firstChild).toBe(text);
      view.update({ rowWindow: { start: 1, end: 2 }, columnWidths: [NaN] });
      expect(first.hasAttribute('data-thin-row')).toBe(false); expect(first.children).toHaveLength(10);
      expect(view.container.querySelectorAll('col')).toHaveLength(0);
    } finally { view.cleanup(); }
  });

  it('keys retained rows by user identity through immutable reorder and locale updates', async () => {
    const data = fixture(); data.rows[0].user.name = { fallback: 'Alpha', en: '<Alpha>', 'zh-CN': '甲队' };
    const view = await mount(RanklistComponent, { data, retainUserText: true, rowWindow: { start: 0, end: 1 }, languages: ['en'] });
    try {
      const name = view.container.querySelector('[data-search-text="name"]')!; const text = name.firstChild;
      expect(name.textContent).toBe('<Alpha>'); expect(name.children).toHaveLength(0);
      const next = JSON.parse(JSON.stringify(data)); next.rows.reverse();
      view.update({ data: next, languages: ['zh-CN'] });
      expect(view.container.querySelectorAll('[data-search-text="name"]')[1]).toBe(name);
      expect(name.firstChild).toBe(text); expect(name.textContent).toBe('甲队');
    } finally { view.cleanup(); }
  });

  it('emits global indexes/full data, supports keyboard and rejects blank thin-cell clicks', async () => {
    const data = fixture(); const users: any[] = []; const solutions: any[] = [];
    const view = await mount(RanklistComponent, { data, rowWindow: { start: 1, end: 2 }, retainUserText: true, columnWidths: widths(), showProblemStatisticsFooter: true });
    view.ref.instance.userClick.subscribe(payload => users.push(payload)); view.ref.instance.solutionClick.subscribe(payload => solutions.push(payload));
    try {
      const cells = view.container.querySelectorAll('tbody .srk-user-cell'); const header = view.container.querySelectorAll('thead th')[1];
      header.getBoundingClientRect = () => ({ left: 100, right: 200 } as DOMRect);
      cells[0].dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1, clientX: 250 })); expect(users).toHaveLength(0);
      cells[0].dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1, clientX: 150 }));
      cells[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      view.container.querySelectorAll('tbody tr')[1].querySelector('.srk-prest-status-block')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(users.map(x => x.rowIndex)).toEqual([0, 1]); expect(users[1].ranklist).toBe(data);
      expect(solutions[0]).toMatchObject({ rowIndex: 1, problemIndex: 0, user: data.rows[1].user }); expect(solutions[0].ranklist).toBe(data);
      expect(view.container.querySelector('table')?.getAttribute('aria-rowcount')).toBe('11'); expect(view.container.querySelector('tfoot tr')?.getAttribute('aria-rowindex')).toBe('4');
    } finally { view.cleanup(); }
  });

  it('only invokes rich status templates, but preserves full custom-user template behavior', async () => {
    const status = await mount(StatusHost);
    try {
      expect(status.container.querySelectorAll('[data-custom-status]')).toHaveLength(5);
      expect([...status.container.querySelectorAll('[data-custom-status]')].every(el => el.getAttribute('data-custom-status') === '1' && el.textContent?.trim() === '2')).toBe(true);
    } finally { status.cleanup(); }
    const custom = await mount(UserHost);
    try {
      expect(custom.container.querySelectorAll('[data-custom-user]')).toHaveLength(2); expect(custom.container.querySelectorAll('[data-custom-status]')).toHaveLength(10);
      expect([...custom.container.querySelectorAll('tbody tr')].every(row => row.getAttribute('data-rich-row') === 'true')).toBe(true);
    } finally { custom.cleanup(); }
  });

  it('preserves globally computed CCPC26 disclosure and fixed reveal colgroups', async () => {
    const view = await mount(RanklistComponent, { data: fixture(), rowWindow: { start: 1, end: 2 }, retainUserText: true, columnWidths: widths(), enableCCPC26: true });
    try {
      expect([...view.container.querySelectorAll('thead .srk-problem-header')].map(el => el.textContent?.replace(/\s+/g, ''))).toEqual(['A99', 'C99', '', '', '']);
      expect(view.container.querySelector('.srk-ccpc26-revealed-columns')?.querySelectorAll('col')).toHaveLength(2); expect(view.container.querySelectorAll('col')).toHaveLength(9);
    } finally { view.cleanup(); }
  });

  it('keeps the existing mutable score.time behavior and updates window layout after in-place changes', async () => {
    const data = fixture(); data.rows.forEach(row => { delete row.score.time; });
    const view = await mount(RanklistComponent, { data });
    try {
      expect([...view.container.querySelectorAll('thead th')].some(el => el.textContent?.trim() === 'Time')).toBe(false);
      data.rows[0].score.time = [10, 'min'];
      view.update({ theme: 'dark' });
      expect(view.ref.instance.showTimeColumn()).toBe(true);
      expect([...view.container.querySelectorAll('thead th')].some(el => el.textContent?.trim() === 'Time')).toBe(true);
      view.update({ rowWindow: { start: 1, end: 2 }, retainUserText: true, columnWidths: widths() });
      data.rows.forEach(row => { delete row.score.time; }); view.update({ rowWindow: { start: 0, end: 1 } });
      expect([...view.container.querySelectorAll('thead th')].some(el => el.textContent?.trim() === 'Time')).toBe(false);
      expect(view.container.querySelectorAll('col')).toHaveLength(0);
    } finally { view.cleanup(); }
  });

  it('normalizes invalid bounds/height and renders empty light rows without retained text', async () => {
    const view = await mount(RanklistComponent, { data: fixture(), rowWindow: { start: 0, end: 0 }, rowHeight: -1 });
    try {
      expect([...view.container.querySelectorAll('tbody tr')].every(row => row.children.length === 1 && !row.textContent?.trim())).toBe(true);
      expect(view.container.querySelector('table')?.hasAttribute('data-row-height')).toBe(false);
      view.update({ rowWindow: { start: NaN, end: 2 } }); expect([...view.container.querySelectorAll('tbody tr')].every(row => row.getAttribute('data-rich-row') === 'true')).toBe(true);
    } finally { view.cleanup(); }
  });

  it('derives initial render controls without DOM globals for server rendering', () => {
    const component = new RanklistComponent(); const data = fixture();
    component.data = data; component.rowWindow = { start: 1, end: 2 }; component.columnWidths = widths(); component.retainUserText = true;
    const originalWindow = globalThis.window; const originalDocument = globalThis.document;
    vi.stubGlobal('window', undefined); vi.stubGlobal('document', undefined);
    try {
      component.ngOnChanges({ data: new SimpleChange(undefined, data, true) });
      expect(component.isRichRow(0)).toBe(false); expect(component.isRichRow(1)).toBe(true);
      expect(component.tableLayout?.totalColumns).toBe(9); expect(component.tableStyle.tableLayout).toBe('fixed');
    } finally { vi.stubGlobal('window', originalWindow); vi.stubGlobal('document', originalDocument); }
  });
});
