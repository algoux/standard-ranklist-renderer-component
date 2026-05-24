import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import less from 'less';
import { describe, expect, it } from 'vitest';

describe('ranklist layout styles', () => {
  const source = readFileSync(join(process.cwd(), 'packages/styles/src/Ranklist.less'), 'utf8');
  const reactRanklistSource = readFileSync(join(process.cwd(), 'packages/react/src/Ranklist.tsx'), 'utf8');
  const normalizedSource = source.replace(/\s+/g, ' ');

  it('gates column separator borders behind the column-bordered table class', async () => {
    const css = (await less.render(source)).css.replace(/\s+/g, ' ');

    expect(css).toContain(
      '.srk-main table.srk-table-column-bordered thead > tr > th:not(:first-child), .srk-main table.srk-table-column-bordered tbody > tr > td:not(:first-child), .srk-main table.srk-table-column-bordered tfoot > tr > td:not(:first-child):not(.srk-extra-statistics-footer-cell) { box-shadow: inset 1px 0 0 var(--srk-table-column-border-color); }',
    );
    expect(css).not.toContain(
      '.srk-main table thead > tr > th:not(:first-child), .srk-main table tbody > tr > td:not(:first-child), .srk-main table tfoot > tr > td:not(:first-child) { box-shadow: inset 1px 0 0 var(--srk-table-column-border-color); }',
    );
    expect(css).not.toContain(
      '.srk-main table.srk-table-column-bordered tfoot > tr > td:not(:first-child) { box-shadow: inset 1px 0 0 var(--srk-table-column-border-color); }',
    );
  });

  it('keeps sticky problem headers above rows with an opaque base background', () => {
    expect(normalizedSource).toContain('--srk-table-head-solid-bg: #fff;');
    expect(normalizedSource).toContain('z-index: 1;');
    expect(normalizedSource).toContain(
      '&.srk-problem-header { background-color: var(--srk-table-head-solid-bg); transition: color 0.7s, background 0.7s; }',
    );
    expect(normalizedSource).toContain(
      '&.srk-problem-statistics-footer-problem-header { padding: 8px; background-color: var(--srk-table-head-solid-bg); background-clip: padding-box; font-weight: 700; transition: color 0.7s, background 0.7s; }',
    );
  });

  it('renders footer problem labels with the reversed problem header gradient', () => {
    expect(reactRanklistSource).toContain('getProblemHeaderBackgroundImage(problem.style, this.props.theme!, 0)');
  });

  it('positions footer statistics tooltips from the label text on the left side', () => {
    expect(normalizedSource).toContain('pointer-events: none;');
    expect(normalizedSource).toContain(
      '&.srk--c-tooltip::after { top: 50%; right: calc(100% + 8px); bottom: auto; left: auto; transform: translateY(-50%); }',
    );
  });

  it('lets footer statistics rows follow table striping and row borders', () => {
    expect(normalizedSource).toContain(
      'tfoot > tr:nth-child(even) > td.srk-problem-statistics-footer-cell:not(.srk-extra-statistics-footer-cell):not(.srk-problem-statistics-footer-problem-header)',
    );
    expect(normalizedSource).toContain(
      'tfoot > tr + tr > td.srk-problem-statistics-footer-cell:not(.srk-extra-statistics-footer-cell)',
    );
    expect(normalizedSource).toContain('tfoot > tr:first-child > td');
    expect(normalizedSource).toContain('border-top: 1px solid var(--srk-table-border);');
    expect(normalizedSource).toContain('border-top: 1px solid var(--srk-table-row-border-color);');
  });

  it('renders series segment markers without changing table border geometry', () => {
    expect(source).not.toContain('border-right: var(--srk-series-segment-border-width)');
    expect(normalizedSource).toContain('position: relative;');
    expect(normalizedSource).toContain('--srk-series-segment-content-gap: 8px;');
    expect(normalizedSource).toContain('--srk-series-segment-row-bleed: 1px;');
    expect(normalizedSource).toContain('--srk-series-segment-row-bleed: 0px;');
    expect(normalizedSource).toContain('&.srk-series-segmented-column');
    expect(normalizedSource).toContain(
      'padding-right: calc(var(--srk-series-segment-border-width) + var(--srk-series-segment-content-gap));',
    );
    expect(normalizedSource).toContain(
      '&::after { content: \'\'; position: absolute; top: 0; right: 0; bottom: calc(-1 * var(--srk-series-segment-row-bleed)); width: var(--srk-series-segment-border-width); background: var(--srk-series-segment-color); pointer-events: none; }',
    );
  });

  it('keeps split organization text ellipsizable when avatars are placed in the organization column', () => {
    expect(normalizedSource).toContain(
      '.srk-organization-cell-content { display: flex; align-items: center; min-width: 0;',
    );
    expect(normalizedSource).toContain(
      '.srk-organization-name-text { flex: 1 1 auto; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }',
    );
  });
});
