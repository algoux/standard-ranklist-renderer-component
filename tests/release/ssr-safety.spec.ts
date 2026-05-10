import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const fixturePath = join(process.cwd(), 'tests/fixtures/basic-ranklist.json');

function readJson(path: string) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function makeRanklist() {
  return JSON.parse(JSON.stringify(readJson(fixturePath)));
}

describe('release SSR safety', () => {
  it('server-renders the React public components without browser globals', async () => {
    const React = await import('react');
    const { renderToString } = await import('react-dom/server');
    const reactEntry = await import(pathToFileURL(join(root, 'packages/react/dist/index.js')).href);
    const coreEntry = await import(pathToFileURL(join(root, 'packages/core/dist/index.js')).href);
    const staticRanklist = coreEntry.convertToStaticRanklist(makeRanklist());

    const ranklistHtml = renderToString(React.createElement(reactEntry.Ranklist, { data: staticRanklist }));
    const progressHtml = renderToString(React.createElement(reactEntry.ProgressBar, { data: makeRanklist() }));
    const modalHtml = renderToString(
      React.createElement(
        reactEntry.Modal,
        { open: true, title: 'SSR Modal' },
        React.createElement('div', null, 'SSR body'),
      ),
    );

    expect(ranklistHtml).toContain('Team Alpha');
    expect(progressHtml).toContain('srk-progress-bar-container');
    expect(modalHtml).toContain('SSR Modal');
    expect(modalHtml).toContain('SSR body');
  });

  it('server-renders the Solid public components through the server entry', async () => {
    const { renderToString } = await import('solid-js/web');
    const solidEntry = await import(pathToFileURL(join(root, 'packages/solid/dist/index.server.es.js')).href);
    const coreEntry = await import(pathToFileURL(join(root, 'packages/core/dist/index.js')).href);
    const staticRanklist = coreEntry.convertToStaticRanklist(makeRanklist());

    const ranklistHtml = renderToString(() => solidEntry.Ranklist({ data: staticRanklist }));
    const progressHtml = renderToString(() => solidEntry.ProgressBar({ data: makeRanklist() }));
    const modalHtml = renderToString(() =>
      solidEntry.Modal({
        open: true,
        title: 'SSR Modal',
        children: 'SSR body',
      }),
    );

    expect(ranklistHtml).toContain('Team Alpha');
    expect(progressHtml).toContain('srk-progress-bar-container');
    expect(modalHtml).toContain('SSR Modal');
    expect(modalHtml).toContain('SSR body');
  });

  it('server-renders the Vue public components without browser globals', async () => {
    const { createSSRApp, h } = await import('vue');
    const { renderToString } = await import('@vue/server-renderer');
    const vueEntry = await import(pathToFileURL(join(root, 'packages/vue/dist/index.js')).href);
    const coreEntry = await import(pathToFileURL(join(root, 'packages/core/dist/index.js')).href);
    const staticRanklist = coreEntry.convertToStaticRanklist(makeRanklist());

    const ranklistHtml = await renderToString(createSSRApp({ render: () => h(vueEntry.Ranklist, { data: staticRanklist }) }));
    const progressHtml = await renderToString(createSSRApp({ render: () => h(vueEntry.ProgressBar, { data: makeRanklist() }) }));
    const modalHtml = await renderToString(
      createSSRApp({
        render: () => h(vueEntry.Modal, { open: true, title: 'SSR Modal' }, { default: () => 'SSR body' }),
      }),
    );

    expect(ranklistHtml).toContain('Team Alpha');
    expect(progressHtml).toContain('srk-progress-bar-container');
    expect(modalHtml).toContain('SSR Modal');
    expect(modalHtml).toContain('SSR body');
  });

  it('imports the Svelte public components in Node without browser globals', async () => {
    const svelteEntry = await import(pathToFileURL(join(root, 'packages/svelte/dist/index.js')).href);

    expect(typeof svelteEntry.Ranklist).toBe('function');
    expect(typeof svelteEntry.ProgressBar).toBe('function');
    expect(typeof svelteEntry.Modal).toBe('function');
  });
});