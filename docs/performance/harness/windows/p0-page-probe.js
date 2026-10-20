(() => {
  const probe = (window.__srkP0Probe = {
    longTasks: [],
    errors: [],
    workerEvents: [],
    marks: [],
  });
  const mark = (name, extra = {}) => probe.marks.push({ name, ms: performance.now(), ...extra });
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      probe.longTasks.push({ start: entry.startTime, duration: entry.duration });
    }
  }).observe({ type: 'longtask', buffered: true });
  addEventListener('error', (event) => probe.errors.push(String(event.message)));
  addEventListener('unhandledrejection', (event) => probe.errors.push(String(event.reason)));
  addEventListener('load', () => mark('load'));
  document.addEventListener('DOMContentLoaded', () => mark('DOMContentLoaded'));
  document.addEventListener('readystatechange', () => {
    if (document.readyState === 'interactive') {
      const rows = document.querySelectorAll('tbody tr');
      for (const row of rows) row.__srkP0OriginalSSR = true;
      mark('ssr-rows-observed', { rows: rows.length });
    }
  });
  const NativeWorker = window.Worker;
  window.Worker = class extends NativeWorker {
    constructor(url, options) {
      super(url, options);
      const workerUrl = String(url);
      probe.workerEvents.push({ type: 'created', ms: performance.now(), url: workerUrl });
      this.addEventListener('message', (event) => {
        probe.workerEvents.push({
          type: 'response', ms: performance.now(), url: workerUrl,
          kind: event.data?.kind, requestId: event.data?.requestId, error: event.data?.error,
          points: event.data?.data?.points?.length,
        });
      });
    }
    postMessage(data, ...rest) {
      probe.workerEvents.push({
        type: 'request', ms: performance.now(), kind: data?.kind, requestId: data?.requestId,
        rows: data?.ranklist?.rows?.length, solutions: data?.solutions?.length,
      });
      return super.postMessage(data, ...rest);
    }
  };
  let hydrated = false;
  const interval = setInterval(() => {
    if (!hydrated && document.body?.dataset.ranklandHydrated === 'true') {
      hydrated = true;
      mark('hydration-revealed', { rows: document.querySelectorAll('tbody tr').length });
    }
    if (hydrated && probe.workerEvents.some((event) => event.type === 'response' && event.kind === 'prepare')) {
      mark('hydration-and-worker-ready');
      clearInterval(interval);
    }
  }, 50);
})();
