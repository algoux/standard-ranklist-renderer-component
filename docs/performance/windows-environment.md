# Windows VM environment and measurements

Investigation date: 2026-10-20, Asia/Shanghai. These are measurements of the user-provided VM, not an emulation of a particular affected user's computer.

## Environment

| Item | Observed value |
| --- | --- |
| Parallels VM | `Windows 11`, `{94e8b9a2-582b-41bc-8be2-c3c2c0ef872c}` |
| Virtual CPU / RAM | 2 logical CPUs, 6,144 MiB configured |
| Guest OS | Windows 11 Professional, build `10.0.26100`, ARM64 |
| Guest visible RAM | 6,284,992 KiB |
| Browser | Edge `154.0.4258.37`, V8 `15.4.11.5` |
| Browser binary | `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe` |
| Browser architecture | PE machine `0xAA64`: native ARM64. The UA says `Win64; x64`; that UA is not proof of x64 emulation. |
| Pagefile | System managed; currently allocated 384 MiB, not a fixed maximum |
| Initial memory snapshot | 2,426 MiB available; 3,414,683,648 bytes committed / 6,838,484,992 bytes commit limit, 49% |
| Guest free C: space | 146,090,987,520 bytes |
| Test viewport | 1440 × 900 CSS pixels, device scale factor 1 |

This VM has two relatively fast Apple Silicon virtual CPUs. It can demonstrate Windows memory accounting and a constrained total CPU/RAM budget, but does not reproduce an old x86 CPU's single-thread performance, driver stack, or memory bandwidth. No CPU throttling, RAM pressure, VM resource changes, or pagefile changes were applied in these runs.

## Isolated, loopback-only test setup

The existing user Edge instance was left in place. A separate Edge instance used:

```text
--user-data-dir=C:\Users\bLue\AppData\Local\Temp\srk-performance-20261020\edge-profile
--remote-debugging-address=127.0.0.1
--remote-debugging-port=9223
--no-first-run
--no-default-browser-check
--new-window
--window-size=1280,900
about:blank
```

The CSS viewport was subsequently overridden through CDP. The browser process was PID 4176 when launched. A PowerShell `HttpListener` served the copied production build from `%TEMP%\srk-performance-20261020\dist` at `http://127.0.0.1:4178/`. `Get-NetTCPConnection` confirmed that both 4178 and 9223 listened on `127.0.0.1` only. HTTP.sys owns the HTTP listener socket, so its reported owning PID is 4, not the PowerShell PID.

The corrected Vite production build was identified by `assets/index-e2c04943.js` and `assets/index-0db36689.css`. It contains the same 8,689,875-byte `demo2.json` used by the macOS harness. An earlier build was replaced before any Windows page benchmark was run.

Static files were transferred through the existing `\\Mac\Home` shared folder: a temporary directory in this repository was copied into guest TEMP and immediately removed from the host. No LAN listener, firewall rule, port forwarding, browser policy, or persistent Windows execution-policy change was introduced. Our PowerShell processes use the process-scoped `-ExecutionPolicy Bypass` argument to execute the investigation scripts.

## Vue production component baseline

One 100-row run and one 2,535-row run were executed sequentially, using the harness's `reactive=raw` mode. Both runs fetched and parsed all of `demo2.json` before slicing rows. Thus, the row comparison isolates much of the rendering cost without claiming to reduce the initial download or parse cost.

| Measurement | 100 rows | 2,535 rows |
| --- | ---: | ---: |
| Harness first frame, from navigation | 471.7 ms | 1,559.3 ms |
| `app.mount` interval | 62.9 ms | 670.0 ms |
| Ranklist conversion | 1.1 ms | 50.1 ms |
| Long tasks | 82, 115 ms | 688, 711 ms |
| Attached DOM elements | 2,782 | 68,527 |
| CDP DOM nodes after explicit GC | 8,532 | 198,819 |
| JS event listeners after GC | 1,106 | 15,634 |
| JS heap before GC | 13.1 MiB | 168.4 MiB |
| JS heap after GC | 10.2 MiB | 168.3 MiB |
| Embedder heap after GC | 6.3 MiB | 117.6 MiB |
| Main renderer working set after GC | 117.1 MiB | 550.3 MiB |
| Main renderer private bytes after GC | 65.5 MiB | 491.8 MiB |
| System available physical memory | 2,146 MiB | 1,717 MiB |
| System commit | 55% | 62% |

The full table produced two consecutive long tasks totaling about 1.4 seconds. Parsing the JSON took approximately 17 ms in each run; it did not explain most of the local first-frame delay. Full-table allocation remained substantial after explicit GC, so this allocation is not all promptly collectible temporary garbage.

Neither run crashed. The sampled Windows `PageReadsPersec` and `PageWritesPersec` were zero. These are end-of-run snapshots, not continuous peak measurements; they do not establish that no paging ever occurred.

Raw results are in [windows-baseline.json](evidence/windows-baseline.json). These are single-run observations, not benchmark medians.

## Public RankLand page, after hydration settles

The same isolated browser loaded the user-supplied [RankLand page](https://rl.algoux.cn/collection/official?rankId=icpc2026preliminary-1). Waiting for 2,535 table rows and `document.readyState === "complete"` only detected the server-rendered document: the larger hydration task started later. The first [early sample](evidence/windows-online-early.json) is retained as a record of that timing pitfall, not as a complete loading-performance result.

A second run waited an additional 30 seconds after the SSR-ready condition:

| Measurement | Stable public page |
| --- | ---: |
| SSR rows + document ready observed | 3,693.2 ms |
| Longest observed main-thread task | 4,504 ms, starting at 3,703.2 ms |
| Other long tasks | 218, 74, 80, 137 ms |
| Attached DOM elements | 68,846 |
| CDP documents / nodes / listeners after GC | 1 / 398,319 / 31,609 |
| JS heap before / after GC | 578.4 / 578.1 MiB |
| Embedder heap after GC | 144.7 MiB |
| Main renderer working set after GC | 1,222.3 MiB |
| Main renderer private bytes after GC | 1,238.0 MiB |
| System physical memory available | 1,436 MiB |
| System commit | 73% |

This reproduced a multi-second unresponsive renderer interval without crashing the browser or exhausting system commit. The public page retained roughly twice the component-only DOM node count even after explicit GC. This is a retained-allocation observation; distinguishing connected nodes, detached nodes, and their retaining references requires the main investigation's DOM/heap analysis. It is not evidence that GC is broken.

One dedicated Worker target remained in the public page. The renderer accumulated 0.234 CPU seconds over a later three-second observation, so the 4.5-second task was not still continuously running at the stable snapshot. No runtime errors were captured by the injected error listener.

The stable run contained one real RankLand target and one extra blank target. A PowerShell JSON-array enumeration issue prevented the intended old-tab replacement, so this Windows sample should not be described as a fresh-browser run. `Memory.getDOMCounters` still reported a single document in the measured renderer. The main investigation independently reproduced the retained-node count in a fresh macOS browser/context/page. Subsequent tests should use explicit target IDs and close the completed target, not rely only on navigating to `about:blank`.

After measurement, all test tabs were explicitly returned to blank and the completed RankLand tab was closed. `/json/list` then contained only one `about:blank` page and no Worker. Available memory recovered to 2,688 MiB and system commit to 54%. This also avoids keeping previous pages or Workers alive through browser history during later comparisons.

Raw stable results: [windows-online-stable.json](evidence/windows-online-stable.json).

## Fresh target confirmation and bounded pressure

The corrected script then created exactly one fresh page target, closed the previous test target, and selected the new target by its explicit ID. The same retained-node result reproduced: **398,319 nodes after GC, 578.1 MiB JS heap, and a 4,398 ms main-thread task**. This removes the earlier tab-history caveat from the Windows conclusion. The measured target list contained one RankLand page and its Worker.

The fresh runtime exposed `__VUE_HMR_RUNTIME__`, `__VUE_DEVTOOLS_HOOK_REPLAY__`, and `__VUE_DEVTOOLS_PLUGINS__` on `window`, while `__VUE_DEVTOOLS_GLOBAL_HOOK__` was undefined. These are diagnostic observations for checking the deployed Vue build and retention paths; they do not alone establish that a DevTools extension or hook caused the issue.

A subsequent bounded-pressure experiment used one temporary process, restricted to one logical CPU, with one busy thread and up to 1 GiB of explicitly filled byte arrays. The arrays were filled with deterministic noise so that the test did not merely reserve virtual address space or touch highly compressible zero pages. Runtime overhead made the process working set approximately 1.1 GiB; the requested array allocation remained exactly 1,073,741,824 bytes.

The helper read system memory through [`GetPerformanceInfo`](https://learn.microsoft.com/en-us/windows/win32/api/psapi/nf-psapi-getperformanceinfo). The [counter definitions](https://learn.microsoft.com/en-us/windows/win32/api/psapi/ns-psapi-performance_information) distinguish committed pages, the current commit limit, and immediately available physical pages. Its guards were:

- Refuse to begin if system commit headroom is below 1.8 GiB.
- Inspect the counters between 16 MiB allocation chunks and approximately every 200 ms while holding the allocation.
- Release immediately at commit usage ≥ 90% or available physical memory < 256 MiB.
- Enforce a 120-second workload deadline, followed by releasing the arrays and exiting, or stop earlier when the investigation's stop file appears.
- Write one-second samples and explicit allocation/release events to a local log.

The page was navigated at `06:57:44.709Z`. Its 4,200 ms long task ran from approximately `06:57:47.991Z` through `06:57:52.191Z`, while the pressure process was still active. At `06:57:52.237Z`, the guard observed **6,171,037,696 / 6,838,484,992 committed bytes (90.24%)** and **391.2 MiB available physical memory**, then released its allocation by `06:57:52.498Z`. The test was deliberately not extended to system OOM.

| Measurement | Fresh baseline | Bounded-pressure run |
| --- | ---: | ---: |
| Longest main-thread task | 4,398 ms | 4,200 ms |
| DOM nodes after GC | 398,319 | 398,319 |
| JS heap after GC | 578.1 MiB | 578.1 MiB |
| Browser/renderer crash observed | No | No |
| Pressure outcome | Not applied | Automatically released at 90% commit |

The single pressure run did **not** demonstrate an additional latency regression: the two task durations are close and can vary with scheduling, cache state, and background work. It did demonstrate that a 1 GiB competing allocation plus this page can bring this 6 GiB Windows VM close to its current system commit limit. The stable memory sample was taken after the guard released the artificial pressure and must not be presented as a stable state under sustained load.

Final verification found the pressure process exited, one blank test tab, no Worker target, 2,654 MiB available memory, and 55% system commit. The current system-managed pagefile allocation remained 384 MiB; current/peak pagefile usage was 102/149 MiB. Those pagefile observations include all VM activity and are not exclusively attributable to this page.

Evidence: [fresh baseline](evidence/windows-online-fresh.json), [pressure page measurements](evidence/windows-online-pressure.json), [pressure safety timeline](evidence/windows-pressure-log.json), and [final recovered state](evidence/windows-final-state.json).

## Cleanup

At 2026-10-20 15:02:34 Asia/Shanghai, the isolated test Edge browser was closed through its own CDP endpoint, and the PowerShell HTTP server was stopped after its command line was verified against this investigation's temporary directory. The pressure process had already exited.

Verification found no listeners on guest ports 4178 or 9223, no remaining process using this test browser profile/server/pressure script, and no process with the pressure PID. The VM stayed running and the user's original Edge processes were not targeted. Temporary test files, the isolated profile directory, and the compiled helper were retained for reproducibility; retaining those files does not leave a running pressure process or server.

Evidence: [windows-cleanup-state.json](evidence/windows-cleanup-state.json). The corresponding cleanup script is preserved in [harness/windows/cleanup.ps1](harness/windows/cleanup.ps1).

## Running additional measurements

Host-side scripts used during this investigation are under `/private/tmp/srk-windows-tools`. The corresponding guest helpers are under `%TEMP%\srk-performance-20261020`. The browser and HTTP server are now stopped; they must be started again before running the CDP samplers.

The principal scripts are preserved under [harness/windows](harness/windows): the host runner, guest CDP helper and HTTP server, component and online samplers, and the bounded-pressure C#/PowerShell sources. The host runner contains the VM ID and shared-folder mapping observed on this machine; these must be checked before reuse on a different machine.

Run a local PowerShell script in the guest user's session:

```sh
python3 /private/tmp/srk-windows-tools/guest-ps.py /private/tmp/example.ps1
```

The runner uses `prlctl exec ... --current-user powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass`. Short scripts use a UTF-16LE `-EncodedCommand`; longer scripts briefly stage a uniquely named file in this repository's existing shared folder and remove it in a `finally` block. This avoids a misleading Parallels “Unable to open new session” error observed with a long command string.

Minimal CDP example, executed inside the guest:

```powershell
$root = Join-Path $env:TEMP 'srk-performance-20261020'
. (Join-Path $root 'cdp.ps1')
Open-SrkCdp
try {
    Send-SrkCdp 'Runtime.evaluate' @{
        expression = '({url: location.href, rows: document.querySelectorAll("tbody tr").length})'
        returnByValue = $true
    } | ConvertTo-Json -Depth 10 -Compress
} finally {
    Close-SrkCdp
}
```

The helper communicates with the guest-local CDP WebSocket using .NET `ClientWebSocket`; the host does not need access to the guest's debug port. `Open-SrkCdp` accepts the browser WebSocket URL from `/json/version` when browser-level commands such as `SystemInfo.getProcessInfo` or `Target.getTargets` are needed.

For new output containing Chinese text, set `[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding` in the guest script. The first online result used the guest's legacy code page and was explicitly decoded as GB18030 before being saved as UTF-8.

Only process IDs obtained from this isolated browser's `SystemInfo.getProcessInfo` should be attributed to these tests. Windows working sets contain shared pages; adding all browser process working sets does not yield unique physical memory consumption. CDP JS heap, embedder heap, process private bytes, working set, and system commit measure different things and should not be substituted for one another.
