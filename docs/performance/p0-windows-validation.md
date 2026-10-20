# P0 Windows validation

Validation date: 2026-10-20, Asia/Shanghai.

## Scope and environment

The validation uses the prepared Windows 11 ARM64 VM, a separate Edge profile, a loopback-only HTTP server, and the complete 2,535-row ranklist. It exercises the actual corrected RankLand production client, its Worker, and SSR output. It does not substitute the previous Vue-only harness or fetch the previously deployed client from RankLand.

The 16:15 preflight confirmed:

- VM `{94e8b9a2-582b-41bc-8be2-c3c2c0ef872c}` is running with 2 vCPUs and 6,144 MiB RAM.
- Windows build `10.0.26100`, native ARM64 Edge `154.0.4258.37`.
- Ports 4178 and 9223 have no listener, and no previous isolated browser/test process remains.
- About 2,908 MiB physical memory is available, with system commit at 48%.

No VM resources, firewall settings, user Edge profile, or system pagefile settings are changed. No artificial memory-pressure process is used.

## Method

Three sequential fresh page targets were tested with network cache disabled, using one isolated browser profile. Each run records load, hydration reveal, Worker prepare request/response, long tasks, final DOM/heap after explicit GC, and Windows process/system memory. A separate lightweight process samples the isolated browser process tree and system memory every 250 ms; it discovers descendants from the browser PID through the native process snapshot API so that renderer process swaps are included. CDP counters are sampled only after the page settles, since CDP requests can themselves wait behind blocked main-thread work.

The artifact and all assets are copied to guest TEMP and served through `http://127.0.0.1:4178/`; `/collection/official` maps to the saved SSR HTML. The server supports only GET and HEAD and does not expose a LAN listener. The unmodified e2e production client is configured to check `http://127.0.0.1:4322/vin.txt`, so the same isolated server additionally binds that loopback port and returns an empty 200 response with CORS for this single read-only path; all other auxiliary-origin paths return 404. Browser instrumentation logs Worker metadata and timings without retaining ranklist payloads or DOM nodes.

User interaction checks first dismissed the initial OK prompt with a CDP mouse click, then scrolled the first user cell into view, verified it was unobscured with a hit test, and clicked it with CDP mouse events. They waited for a Worker selection response and rendered ranking chart, then closed the dialog with Escape. The initial prompt appeared only in run 1 because its acknowledged preference remained in the isolated profile. Screenshots and full-row counts were saved. The isolated browser/server were closed after verification.

## Artifact verification

The site was generated from the corrected source through the project's `scripts/e2e-build.cjs` client/SSR build. The fixture injects the original complete ranklist into the collection's server data path, then renders the actual SSR components. The guest copies were checked against the host SHA-256 and byte length for all 72 site files; all matched. No built JavaScript was edited after compilation.

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `index.html` | 8,641,274 | `7c592b942b461380da868360200ecef7386ef8e0e4394448e2c28e87d0497913` |
| `dist/assets/index-4f4b6864.js` | 456,876 | `2eb541129a28a272adbc5e8fa804cf2ef1335fb37af2d66916009556ed752a87` |
| `dist/assets/rank-time-data.worker-f3bcf541.js` | 64,133 | `45bd666337c23f9aa0fe16725a7b6c9ae3f06bdab29b2c8b89d306dbc090f7fb` |
| `demo2.json` (compact serialization) | 2,708,072 | `8ca3ddf111c255b352021678000f4bac0040aa3e3f2cd827fd2fdc260f0dbd0b` |

The canonical manifest of all relative paths, sizes, and SHA-256 values hashes to `6e5366145df2547c33481b16888fef1fc3e53a037f46b23367be61d9aa5ce460`. The host's temporary transfer directory was removed after guest verification.

## Results

| Metric | Run 1 | Run 2 | Run 3 |
| --- | ---: | ---: | ---: |
| Full table rows | 2,535 | 2,535 | 2,535 |
| Load event | 2,473 ms | 2,546 ms | 1,979 ms |
| Hydration reveal observed | 3,744 ms | 3,838 ms | 3,190 ms |
| Hydration and Worker ready observed | 4,971 ms | 5,001 ms | 4,343 ms |
| Worker prepare request → response | 1,387.7 ms | 1,325.7 ms | 1,311.3 ms |
| Longest main-thread task | 904 ms | 907 ms | 828 ms |
| JS heap after explicit GC | 185.41 MiB | 185.67 MiB | 185.69 MiB |
| Embedder heap after explicit GC | 120.78 MiB | 120.74 MiB | 120.75 MiB |
| CDP nodes after explicit GC | 199,507 | 199,486 | 199,486 |
| Connected document nodes | Not collected | 199,475 | 199,475 |
| CDP minus connected nodes | — | 11 | 11 |
| Original SSR rows still in document | Not collected | 2,535 | 2,535 |

The median longest main-thread task is **904 ms**, compared with the previous fresh online-page observation of **4,398 ms**. The median JS heap after GC is **185.67 MiB**, compared with the previous **578.1 MiB**. These are approximately 79% and 68% lower respectively, but the old run used the public page and the new runs use a local static SSR fixture; this is not a controlled comparison of network loading time. The corrected client still causes an approximately 0.9-second blocking task when hydrating the complete table.

The connected-node and original-SSR-row probes were added after run 1. On runs 2 and 3 they show that all 2,535 original SSR row nodes survived hydration and that the post-GC CDP/connected-node difference is only 11 nodes. This rules out the previously observed second retained table of roughly 199,000 nodes in these two runs. The 21-node difference in run 1 corresponds to its initial prompt state; run 1 does not independently provide the connected-node/reuse measurement.

Hydration timestamps are observed by a 50 ms timer, so they include polling delay. Worker prepare timings are request/response round trips, including transport and scheduling; they are not pure algorithm CPU timings. The browser runtime contained `__VUE_INSTANCE_SETTERS__`, `__VUE_SSR_SETTERS__`, and `__VUE__`, which can occur in production builds. It did not expose the earlier development-specific `__VUE_HMR_RUNTIME__`, `__VUE_DEVTOOLS_HOOK_REPLAY__`, or `__VUE_DEVTOOLS_PLUGINS__` markers. There were no captured runtime errors or external resource loads. The local server logged 65 requests, all with status 200.

## Windows memory accounting

The main renderer below is the largest renderer process in the isolated browser's `SystemInfo.getProcessInfo` inventory after settling. Its PID is matched against the independent process-tree samples. These process figures include more than the page's main JavaScript heap, including renderer and Worker/native allocations.

| Metric | Run 1 | Run 2 | Run 3 |
| --- | ---: | ---: | ---: |
| Renderer private bytes after page GC | 722.74 MiB | 745.97 MiB | 741.50 MiB |
| Renderer working set after page GC | 793.16 MiB | 813.69 MiB | 810.19 MiB |
| Sampled renderer private-byte peak | 1,122.68 MiB | 1,122.99 MiB | 936.05 MiB |
| Sampled renderer working-set peak | 1,191.58 MiB | 1,191.16 MiB | 999.11 MiB |
| Maximum sampled system commit usage | 73.80% | 73.79% | 71.63% |
| Minimum sampled available physical memory | 1,402.46 MiB | 1,385.79 MiB | 1,523.37 MiB |
| Stable system commit usage | 69% | 69% | 68% |
| Stable available physical memory | 1,676 MiB | 1,679 MiB | 1,711 MiB |
| Number of resource samples | 35 | 31 | 28 |

Sampling every 250 ms can miss shorter peaks. Working sets contain shared pages and are not added together as unique physical consumption. The runs demonstrate a substantial reduction in retained main-heap/DOM cost, while also showing that full rendering and its temporary allocations can still exceed 1 GiB of renderer private bytes during loading. No crash or system OOM occurred; no artificial pressure was applied. These results do not establish that every lower-memory machine will load the page safely under competing workloads.

## Interaction and visual checks

All three runs successfully opened the visible first team, **PERFECT GIRL / 清华大学**, after a hit-tested mouse click. The Worker returned 301 selected ranking points; its selection round trips were approximately 45.7, 46.3, and 39.9 ms. A visible chart canvas was present, team/member text was correct, and Escape closed the modal while all 2,535 rows remained. No runtime errors were reported during these interactions.

The [page screenshot](evidence/p0-windows-run3-page.png) and [ranking-curve screenshot](evidence/p0-windows-run3-chart.png) were visually inspected. They confirm readable table, team details, and a complete curve. These screenshots verify visible content and are not a cross-platform pixel-difference benchmark.

## Evidence and cleanup

- [Summary](evidence/p0-windows-summary.json), [run 1](evidence/p0-windows-run1.json), [run 2](evidence/p0-windows-run2.json), [run 3](evidence/p0-windows-run3.json).
- Continuous resources: [run 1](evidence/p0-windows-run1-resources.jsonl), [run 2](evidence/p0-windows-run2-resources.jsonl), [run 3](evidence/p0-windows-run3-resources.jsonl).
- [Artifact verification](evidence/p0-artifact-verification.json), [prepared state](evidence/p0-prepared-state.json), [server request log](evidence/p0-server-requests.log).
- [Cleanup verification](evidence/p0-windows-cleanup-state.json), implemented by [p0-cleanup.ps1](harness/windows/p0-cleanup.ps1).

At **16:43:33 Asia/Shanghai**, the test browser was closed through its own CDP endpoint and the server was stopped after verifying its saved PID and command line. Verification found no listener on 4178, 4322, or 9223 and no remaining isolated browser, server, or resource-sampler process. Available physical memory recovered to 2,816 MiB and system commit to 50%. The user browser and VM resource configuration were untouched. Temporary guest files and the isolated profile remain as inert reproducibility artifacts.
