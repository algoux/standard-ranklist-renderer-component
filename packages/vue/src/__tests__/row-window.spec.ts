import { mount } from '@vue/test-utils';
import { createSSRApp, h, nextTick, reactive, ref } from 'vue';
import { renderToString } from '@vue/server-renderer';
import { afterEach, describe, expect, it } from 'vitest';
import { EnumTheme } from '@algoux/standard-ranklist-utils';
import { resetModalInteractionStateForTests } from '@algoux/standard-ranklist-renderer-component-core';
import Ranklist from '../Ranklist.vue';
import { makeCCPC26Ranklist } from '../../../../tests/shared/ccpc26-fixture';

const fixedWidths = (split = false) => Array(9 + (split ? 1 : 0)).fill(72);
const rowSelector = (index: number) => `tbody tr[data-row-index="${index}"]`;
const nameSelector = (index: number) => `${rowSelector(index)} [data-search-text="name"]`;
const organizationSelector = (index: number) => `${rowSelector(index)} [data-search-text="organization"]`;
const mounted: { unmount(): void }[] = [];
function render(props: any, slots?: any) {
  const wrapper = mount(Ranklist, { props, slots });
  mounted.push(wrapper);
  return wrapper;
}
afterEach(() => {
  mounted.splice(0).forEach((wrapper) => wrapper.unmount());
  resetModalInteractionStateForTests();
});

describe('Vue controlled rich-row window', () => {
  it('retains the exact name and organization Text nodes while markers/avatars and complex cells mount and unmount', async () => {
    const data = makeCCPC26Ranklist();
    data.markers = [{ id: 'red', label: 'Red', style: 'red' }];
    data.rows[0].user.markers = ['red'];
    data.rows[0].user.avatar = 'https://example.com/avatar.png';
    const wrapper = render({
      data,
      retainUserText: true,
      rowWindow: { start: 0, end: 1 },
      columnWidths: fixedWidths(),
      rowHeight: 60,
    });
    const name = wrapper.get(nameSelector(0)).element;
    const organization = wrapper.get(organizationSelector(0)).element;
    const nameText = name.firstChild;
    const organizationText = organization.firstChild;
    expect(wrapper.findAll(`${rowSelector(0)} .srk-search-markers .srk-marker`)).toHaveLength(1);
    expect(
      (wrapper.get(`${rowSelector(0)} .srk-search-user-cell`).element as HTMLElement).style.getPropertyValue(
        '--srk-search-marker-space',
      ),
    ).toBe('20px');
    expect(wrapper.findAll(`${rowSelector(0)} img`)).toHaveLength(1);
    await wrapper.setProps({ rowWindow: { start: 1, end: 2 } });
    expect(wrapper.get(nameSelector(0)).element === name).toBe(true);
    expect(name.firstChild === nameText).toBe(true);
    expect(wrapper.get(organizationSelector(0)).element === organization).toBe(true);
    expect(organization.firstChild === organizationText).toBe(true);
    expect(wrapper.findAll(`${rowSelector(0)} img, ${rowSelector(0)} .srk-search-markers`)).toHaveLength(0);
    expect(wrapper.get(rowSelector(0)).attributes('data-thin-row')).toBe('true');
    expect(wrapper.findAll(`${rowSelector(0)} td`)).toHaveLength(1);
    expect(wrapper.get(`${rowSelector(0)} td`).attributes('colspan')).toBe('9');
    for (const rowWindow of [{ start: 0, end: 1 }, undefined, { start: 1, end: 2 }]) {
      await wrapper.setProps({ rowWindow });
      expect(name.firstChild === nameText).toBe(true);
      expect(organization.firstChild === organizationText).toBe(true);
    }
  });

  it('keeps split organization identity and correct global payloads, including anonymous solutions', async () => {
    const data = makeCCPC26Ranklist();
    data.rows[1].user.avatar = 'https://example.com/beta.png';
    const wrapper = render({
      data,
      retainUserText: true,
      splitOrganization: true,
      userAvatarPlacement: 'organization',
      enableCCPC26: true,
      rowWindow: { start: 0, end: 1 },
      columnWidths: fixedWidths(true),
    });
    const name = wrapper.get(nameSelector(1)).element.firstChild;
    const organization = wrapper.get(organizationSelector(1)).element.firstChild;
    expect(wrapper.findAll(`${rowSelector(1)} td`)).toHaveLength(2);
    expect(wrapper.get(`${rowSelector(1)} .srk-search-org-cell`).attributes('colspan')).toBe('2');
    expect(wrapper.get(`${rowSelector(1)} .srk-search-user-cell`).attributes('aria-colindex')).toBe('3');
    wrapper
      .get(nameSelector(1))
      .element.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1, clientX: 0 }));
    await nextTick();
    expect(wrapper.emitted('userClick')?.[0]?.[0]).toMatchObject({
      user: { id: 'beta' },
      rowIndex: 1,
      ranklist: { rows: data.rows },
    });
    await wrapper.setProps({ rowWindow: { start: 1, end: 2 } });
    expect(wrapper.get(nameSelector(1)).element.firstChild === name).toBe(true);
    expect(wrapper.get(organizationSelector(1)).element.firstChild === organization).toBe(true);
    expect(wrapper.findAll(`${rowSelector(1)} .srk-search-org-cell img`)).toHaveLength(1);
    await wrapper.get(`${rowSelector(1)} td.srk-prest-status-block.srk--cursor-pointer`).trigger('click');
    expect(wrapper.emitted('solutionClick')?.[0]?.[0]).toMatchObject({ user: { id: 'beta' }, rowIndex: 1 });
    await wrapper.setProps({ rowWindow: { start: 0, end: 1 } });
    const cells = wrapper.findAll(`${rowSelector(0)} td.srk-prest-status-block`);
    await cells[2].trigger('click');
    expect(wrapper.emitted('solutionClick')?.[1]?.[0]).toMatchObject({
      user: { id: 'alpha' },
      problemIndex: 1,
      problemRevealed: false,
      status: { result: 'FB' },
    });
  });

  it('preserves native column positions without valid fixed widths, including empty series', async () => {
    const data = makeCCPC26Ranklist();
    data.series = [];
    data.rows.forEach((row) => {
      row.rankValues = [];
    });
    const wrapper = render({ data, retainUserText: true, rowWindow: { start: 0, end: 1 } });
    expect(wrapper.get(rowSelector(1)).attributes('data-thin-row')).toBeUndefined();
    expect(wrapper.findAll(`${rowSelector(1)} td`)).toHaveLength(2);
    expect(wrapper.get(`${rowSelector(1)} .srk-search-user-cell`).attributes('aria-colindex')).toBe('1');
    expect(wrapper.find('[colspan="0"]').exists()).toBe(false);
    await wrapper.setProps({ columnWidths: [NaN] });
    expect((wrapper.get('table').element as HTMLElement).style.tableLayout).toBe('');
    expect(wrapper.get(rowSelector(1)).attributes('data-thin-row')).toBeUndefined();
  });

  it('renders blank lightweight rows only when identity retention is disabled, without changing statistics', () => {
    const data = makeCCPC26Ranklist();
    const wrapper = render({ data, rowWindow: { start: 0, end: 1 }, rowHeight: 60, showProblemStatisticsFooter: true });
    expect(wrapper.get(rowSelector(1)).text()).toBe('');
    expect(wrapper.findAll(`${rowSelector(1)} td`)).toHaveLength(1);
    expect(wrapper.get(`${rowSelector(1)} td`).attributes('colspan')).toBe('9');
    expect(wrapper.get('tfoot .srk-problem-statistics-footer-primary').text()).toBe('2');
    expect(wrapper.get('table').attributes('aria-rowcount')).toBe('11');
    expect((wrapper.get(rowSelector(1)).element as HTMLElement).style.height).toBe('60px');
  });

  it('falls back to full rendering for a custom user slot, including dynamically added slots', async () => {
    const data = makeCCPC26Ranklist();
    const custom = ref(false);
    const app = mount({
      setup: () => () =>
        h(
          Ranklist,
          { data, retainUserText: true, rowWindow: { start: 0, end: 1 } },
          custom.value
            ? { 'user-cell': (props: any) => h('td', { class: 'custom-user' }, props.user.name) }
            : undefined,
        ),
    });
    mounted.push(app);
    expect(app.findAll('tr[data-rich-row="true"]')).toHaveLength(1);
    custom.value = true;
    await nextTick();
    expect(app.findAll('.custom-user')).toHaveLength(2);
    expect(app.findAll('tr[data-rich-row="true"]')).toHaveLength(2);
    custom.value = false;
    await nextTick();
    expect(app.findAll('tr[data-rich-row="true"]')).toHaveLength(1);
  });

  it('updates light identity text and rich cells for reactive changes without stale callbacks', async () => {
    const data = reactive(makeCCPC26Ranklist());
    data.rows[1].user.name = { fallback: 'Beta', 'zh-CN': '乙队' };
    const base = ref('https://first.example/');
    data.rows[0].user.avatar = 'https://example.com/alpha.png';
    const wrapper = render({
      data,
      retainUserText: true,
      rowWindow: { start: 0, end: 1 },
      languages: ['zh-CN'],
      formatSrkAssetUrl: () => `${base.value}avatar.png`,
    });
    expect(wrapper.get(nameSelector(1)).text()).toBe('乙队');
    await wrapper.setProps({ languages: ['en'] });
    expect(wrapper.get(nameSelector(1)).text()).toBe('Beta');
    data.rows[1].user.name = 'Changed Beta';
    data.rows[1].user.organization = 'Changed School';
    data.rows[0].score.value = 99;
    base.value = 'https://second.example/';
    await nextTick();
    expect(wrapper.get(nameSelector(1)).text()).toBe('Changed Beta');
    expect(wrapper.get(organizationSelector(1)).text()).toBe('Changed School');
    expect(wrapper.get(rowSelector(0)).text()).toContain('99');
    expect(wrapper.get(`${rowSelector(0)} img`).attributes('src')).toBe('https://second.example/avatar.png');
    await wrapper.get(nameSelector(1)).trigger('click');
    expect(wrapper.emitted('userClick')?.[0]?.[0]).toMatchObject({
      user: { name: 'Changed Beta', organization: 'Changed School' },
      rowIndex: 1,
    });
    await wrapper.setProps({ theme: EnumTheme.dark, languages: ['en'], rowWindow: { start: 1, end: 2 } });
    expect(wrapper.get(nameSelector(1)).text()).toBe('Changed Beta');
  });

  it('normalizes invalid ranges/heights and preserves the unconfigured default markup', async () => {
    const wrapper = render({ data: makeCCPC26Ranklist() });
    expect(wrapper.find('[data-row-index]').exists()).toBe(false);
    expect(wrapper.find('[data-row-height]').exists()).toBe(false);
    await wrapper.setProps({ rowWindow: { start: NaN, end: 2 }, rowHeight: -1 });
    expect(wrapper.findAll('tr[data-rich-row="true"]')).toHaveLength(2);
    expect(wrapper.get('table').attributes('data-row-height')).toBeUndefined();
    await wrapper.setProps({ rowWindow: { start: -8, end: 1.8 } });
    expect(wrapper.findAll('tr[data-rich-row="true"]')).toHaveLength(1);
  });

  it('renders all retained identities and complete CCPC26 metadata in SSR without escaping regressions', async () => {
    const data = makeCCPC26Ranklist();
    data.rows[1].user.name = '<script>bad()</script>&"';
    const original = JSON.stringify(data);
    const html = await renderToString(
      createSSRApp({
        render: () =>
          h(Ranklist, {
            data,
            retainUserText: true,
            rowWindow: { start: 0, end: 1 },
            columnWidths: fixedWidths(),
            rowHeight: 60,
            enableCCPC26: true,
            showProblemStatisticsFooter: true,
          }),
      }),
    );
    expect(html).toContain('table-layout:fixed');
    expect(html).toContain('srk-ccpc26-revealed-columns');
    expect(html.match(/<col\s/g)).toHaveLength(9);
    expect(html.match(/data-search-text="name"/g)).toHaveLength(2);
    expect(html.match(/data-rich-row="true"/g)).toHaveLength(1);
    expect(html.match(/height:60px/g)).toHaveLength(2);
    expect(html).toContain('&lt;script&gt;bad()&lt;/script&gt;&amp;&quot;');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('Problem B');
    expect(JSON.stringify(data)).toBe(original);
  });
});
