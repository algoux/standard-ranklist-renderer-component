# RankLand 接入路径与排名曲线性能调查

日期：2026-10-20。范围：本地 `../rankland-web` 与用户指定的线上榜单 `https://rl.algoux.cn/collection/official?rankId=icpc2026preliminary-1`。本次只读产品代码，实验变体全部位于 `/tmp`，未修改 RankLand、renderer 或 utils 的实现。

本文把“已确认的代码路径”“独立函数实验”“仍需浏览器验证的因果关系”分开。Node 函数耗时和内存不等于 Chrome 整页耗时和内存，也不证明已经重现用户的浏览器卡死。

## 1. 数据与线上代码一致性

### 实际数据

读取线上 HTML 后，提取内嵌的 `window.__INITIAL_STATE__` 并解析其中 `collectionPageData.ranklist.srk`，与本仓库 `demo2.json` 解析结果逐一序列化比较，完全一致。

| 项目 | 实测值 |
| --- | ---: |
| `demo2.json` 文件字节数（含格式化空白） | 8,689,875 |
| 同一 SRK 紧凑 JSON 字节数 | 2,708,072 |
| 队伍数 | 2,535 |
| 题数 | 14 |
| 榜列数 / ICPC 榜列数 | 3 / 1 |
| 提交记录数（`getSortedCalculatedRawSolutions`） | 30,772 |
| 时长 | 300 min |
| 线上响应 HTML 解码后字节数 | 8,641,908 |
| HTML 内 `<tr` 数量 | 2,536（表头 + 全量队伍） |
| 内嵌状态 JS 字符串表达式字节数 | 2,742,747 |

线上 SRK URL：`https://cdn.algoux.cn/rankland/file/94656957302009856/icpc2026preliminary-1.srk.json`。

`demo2.json` SHA-256：`07d450c50b2ced2b46a44f42194a2531361eca66aae83565c9fa9336a3fa6fa3`。

以上 HTML 字节数不是网络压缩传输大小，也不是浏览器内存占用。格式化 JSON 8.69 MB 也不能直接当作 JS 堆大小。

### 版本证据

本地 RankLand `package.json`、`pnpm-lock.yaml:21–29,5124–5129` 锁定：

- renderer Vue/core `0.7.1`，styles `0.7.0`；
- `standard-ranklist-utils` `0.3.4`；
- Vue `3.5.35`。本 renderer 仓库开发锁文件为 Vue `3.5.33`，测试结果仍应记录这项运行时差异。

本 renderer 仓库 Vue/core 的现有 `dist/index.js` 与 RankLand 安装的对应包逐字节一致；线上公开 sourcemap 进一步确认以下已部署资源的来源与本地一致：

| 线上资源 / sourcemap | 核实结果 |
| --- | --- |
| `index-1507c630.js(.map)` | Vue `3.5.35`；`hydration-flicker-guard.ts` 与本地逐字节一致 |
| `StyledRanklist-98a3b095.js(.map)` | `StyledRanklist.vue`、`StyledRanklistRenderer.vue`、`RanklistQualityAction.vue`、`ranklist-data-memo.ts`、`rank-time-data.util.ts` 与本地逐字节一致 |
| `BeianLink-df4d7eb5.js(.map)` | 打包来源为 Vue/core `0.7.1`、utils `0.3.4`，其 `sourcesContent` 与本地安装包逐字节一致 |
| `rank-time-data.worker-7cac9657.js(.map)` | Worker 源码、排名曲线计算源码与本地逐字节一致；utils 来源 `0.3.4` |

这些资源由页面实际引用。CDN 的 StyledRanklist sourcemap 返回 404，但网站原点 `https://rl.algoux.cn/dist/assets/<资源名>.map` 返回 200。不能仅因 CDN 没有 sourcemap 就认定无法核对部署版本。

关键源码摘要：

- Vue `dist/index.js` SHA-256：`2b1355ca81fa7ff954dd400158407b482c8a876c838105bfa3c5e3f8f2c33cc3`。
- core `dist/index.js` SHA-256：`596cc25b41ebb6be78d61031fe655d865c28d4da9377a56d3f9126bb576dffcb`。
- utils `dist/index.mjs` SHA-256：`9d4a734ce77ac2e3ba545447e8d842e1a22d3c8202d4ed59433a76730e6adbea`。
- `rank-time-data.util.ts` SHA-256：`5150c203395b4eed7022b6130b3e26a25be6889411a91329aeedfe2e984fd1a6`。

本地检查时 HEAD：renderer `33df73f0b9ddf60e6622ceea06ab2500a2ce5619`，RankLand `637c7a148fc25d80366588287c0c6ae34b849924`。HEAD 只是本地树标识；线上一致性结论来自具体源码/包内容比对，不能据此推导线上整站的 Git commit。

## 2. 页面实际执行路径

以下 `W/` 表示 `../rankland-web/`，`R/` 表示当前 renderer 仓库。行号对应调查时文件。

### 数据加载、SSR 与 hydration

1. `W/src/client/modules/collection/collection.view.vue:173–174,379–391` 声明 SSR 页面；`asyncData` 加载合集与目标榜单。
2. `W/src/client/modules/collection/page-data.ts:54–75` 先读合集，确认 `rankId` 存在，再取榜单。
3. `W/src/client/services/ranklist-api/api-service.ts:47–98` 获取 contest info → file metadata → SRK 文件文本 → `JSON.parse`。这里的 SSR Redis 缓存属于服务端；客户端 factory 没有提供 `cacheManager`（`factory.client.ts:6–15`）。
4. SSR 返回整张表以及内嵌的原始 SRK 状态。`vite-ssr/core/entry-client.js:9–12` 解析状态，`vite-ssr/vue/entry-client.js:27–34` 放进初始路由 state，`:45–49` 使用 `createSSRApp` hydration。`W/src/client/main.ts:84–86` 初始导航已有 state 时跳过再次请求，因此没有证据表明首次加载一定会重复下载 SRK。
5. `collection.view.vue:122–130` 将完整 SRK 传给 `StyledRanklist`，没有分页、可见区裁剪。
6. `StyledRanklist.vue:16–23` 在 computed 中同步执行完整 `ranklistChecker.check(props.data)`，完成才进入 renderer。校验结果有 computed 缓存，不是每帧无条件重跑。

### renderer 的数据层与筛选

`W/src/client/components/ranklist/StyledRanklistRenderer.vue`：

- `:181,209–223` 已经使用 `shallowRef(toRaw(props.data))` 保存 memo 数据；`ranklist-data-memo.ts:7–18` 没有 `_now` 时直接返回原引用，有 `_now` 时仅浅拷贝顶层。不能把此处误判为全量 deep reactive / 每次 JSON 深拷贝。
- `:254–264` 从 rows 计算并排序原始 solutions；回放时过滤提交、重建榜单，然后 `convertToStaticRanklist`。
- `:272–315` 组织/官方/marker 筛选生成真实 `filteredRows`；只在筛选导致列数改变时浅拷贝每行并裁剪 `rankValues`。没有把全部行留在 DOM 里再以 `display:none` 隐藏。
- `:316–330` 按筛选后的行重算题目统计，并浅拷贝 problems/顶层数据；filtered rows 中的 row 引用可复用。
- `:1512–1535` 把 `usingData` 传给组件。`R/packages/vue/src/Ranklist.vue:80–191` 用全量 `v-for` 创建全部行及各题格。

“上游 state 会不会成为 reactive”需要运行时验证，但 renderer 的 memo 层已经明确剥离顶层 proxy。外层 schema checker 在剥离前访问数据，值得分别记录 checker 与 renderer 的分配/耗时，不能笼统归咎 Vue 的深响应式。

### 首次 hydration 后的整表重挂载

`StyledRanklistRenderer.vue:161–167` 在 body 尚未标记 hydrated 时注册任务；`:410–417` mounted 后调用 `finishInitialRanklistHydrationRender`；`:541–552` 把 `ranklistClientRenderReady` 设为 true。

模板 `:1514` 的 key 随之从 `ssr-ranklist` 变为 `client-ranklist`。这意味着先 hydration SSR 表，再销毁旧组件并重建完整客户端表。语义和部署源码均已确认；额外几百毫秒/几秒以及内存峰值大小仍需浏览器对照测量。

`index.html:18` 初始 body `opacity:0`；`App.vue:61–64` 和 `hydration-flicker-guard.ts:46–55` 要等已注册的 hydration 任务及帧才显现。这会让上述额外工作表现为“页面一直未出现”。这不等于无限循环或浏览器死锁。

### 无需点击的排名曲线预计算

`StyledRanklistRenderer.vue:410–417` 在 mounted 后自动调用 `scheduleRankTimeDataPreparation`。非 CCPC26 模式下，`:498–508` 经 `requestAnimationFrame → setTimeout(0)` 排队，随后自动准备全员排名曲线。这个调度只是让出当前一帧，没有消除 CPU/内存负担，也不是持续检测系统是否有余力。

- 主线程 `:737–741,824–829` 先对整份 ranklist 与全部 solutions 分别做 `JSON.stringify → JSON.parse`。
- `:805–816` 对这些普通对象 `worker.postMessage`，再经过 structured clone；没有 transferable buffer。
- `rank-time-data.worker.ts:15–27` 调用 `getAllRankTimeData` 并常驻缓存返回数据集，直到换榜单/卸载导致 Worker 终止。
- 点击队伍时 `StyledRanklistRenderer.vue:926–935` 即使已有缓存，仍重新 JSON 拷贝并发送完整 `staticRows`、series、markers。可只发送选择所需的较小上下文，或让 worker 缓存相关元数据。
- worker 创建/执行失败后，只有队伍曲线选择路径 `:960–977` 才回退主线程 `selectRankTimeDataSync`；自动 prepare 失败的 catch 只返回 false，不会在首屏自动同步计算。因此不能把“worker 失败会立即在打开页时同步计算”当作已存在的路径。

纯 renderer Vue demo 不包含此 Worker、SSR 重挂载、schema checker、质量诊断，故纯组件基准不能覆盖全部 RankLand 首屏风险。

### 其他首屏任务与回放

- `RanklistQualityAction.vue:40–67` 首次 mounted 后双 rAF，随后同步 `diagnoseRanklist`。这只是推迟执行；若算法长，仍会形成主线程长任务。隐藏文档分支直接把 mounted 设 true。
- `StyledRanklistRenderer.vue:872–894` 预加载排名曲线图表模块，支持 idle callback 且 3 秒 timeout；不等于立即实例化图表。
- `R/packages/vue/src/progress/ProgressBar.vue:127–143` 只在鼠标/触摸/键盘结束时提交回放，不是拖动每个 input 都重算整榜。一次提交仍会触发过滤全部 solutions、regen、static、统计与全表更新。
- 此静态合集没有传 `isLive`，没有静态榜单每秒重算的证据。

## 3. 已验证的排名曲线热点

### O(N²) 的 ICPC membership 查询

实际部署 utils `0.3.4` 的 `dist/index.mjs:683–696` 为每行生成 ICPC rank 时执行：

```js
if (row.user.official === false ||
    !filteredRows.find((r) => r.user.id === row.user.id)) {
  return { rank: null, segmentIndex: null };
}
```

`convertToStaticRanklist` 在 `:763–767` 对每行/每个榜列调用该函数。单个 ICPC 榜列对 N 个 official 队伍做线性查找，形成 O(N²)。`demo2` 的 2,535 队全部 official，且该列没有缩小成员集合；一次完整 conversion 需要静态推导的 `N(N+1)/2 = 3,214,380` 次 ID 比较。

`W/src/client/utils/rank-time-data.util.ts:84–87,169–178` 给 5 小时榜单生成 301 个分钟时间点；`:282–284` 每个有新增提交的分钟再次 conversion。本数据 298 个分钟桶有提交（第 3–300 分钟）；第 0 分钟生成一次空榜，1、2 分钟复用。合计 299 次 conversion，约 **961,099,620 次 ID 比较**。这是由路径和数据推导的操作计数，不是浏览器 CPU 采样。

在构建 callback 时先建 `Set(filteredRows.map(row => row.user.id))`，随后 `has(row.user.id)`，可以把这部分降到 O(N)。这仍需要覆盖非法/重复/缺失 ID、marker、official、tie 和多个 series 的语义测试；当前实验只验证本数据与小规模切片一致。

### 历史快照的临时保留

`rank-time-data.util.ts:227–345` 先把各时间点 static rows 存入 `rowsGroupByTimePoints`；`:348–375` 再第二次遍历所有时间点，提取 `{ time, rank, solved }`。

不能将它称为“301 次完整 JSON 深拷贝”：

- utils `index.mjs:750–769` conversion 只创建 row 外壳、`rankValues` 数组及 rankValue 对象；user/statuses/score 引用共享。
- `:443–468` incremental regen 只浅拷贝当前分钟发生变化的 row、score、statuses 数组及对应 status/solutions 数组。旧 snapshots 会让这些过时版本继续存活，但不是整份 user/所有 submissions 每分钟全部复制。
- 本数据有 299 份不同 staticRows 数组、757,965 个不同静态 row 外壳；301 个时间点最终产出 763,035 个 point 对象。

可以在每个分钟得到 staticRows 后立刻提取 points、segments，仅保留本次 rows 和上一时刻 rows，避免为第二遍遍历存满历史 row graph。输出仍包含全员 301 个时间点，最终常驻缓存量不会自动消失。

## 4. 独立 Node 受控实验

执行环境：本机 macOS arm64，Node `v26.0.0`，通过 RankLand 本地 `tsx` 加载真实 TypeScript 和 utils `0.3.4`。每次进程限制 `--max-old-space-size=2048`，执行前后 `--expose-gc` 用于区分临时对象与返回结果存活量。最大 RSS 来自 `process.resourceUsage().maxRSS`（KiB 换算 MiB）；不是 V8 heap limit，也不包含浏览器 DOM。

先用前 200 行、60 分钟验证实验变体；随后使用完整 demo2，每种方案 3 个全新进程、顺序执行。没有并行制造 CPU 压力。

| 方案 | 三次计算时间 ms | 中位数 ms | 最大 RSS 中位数 MiB | 返回时 heapUsed 中位数 MiB | GC 后 heapUsed 中位数 MiB |
| --- | --- | ---: | ---: | ---: | ---: |
| 原始实现 | 4530.4 / 4473.2 / 4738.0 | 4530.4 | 369.31 | 227.79 | 64.00 |
| 仅 membership 改 Set | 493.1 / 506.4 / 506.0 | 506.0 | 372.34 | 230.42 | 64.42 |
| Set + 逐分钟提取 points | 439.6 / 404.2 / 418.5 | 418.5 | 239.38 | 116.60 | 64.43 |

原始计算前 heapUsed 中位数 19.33 MiB；返回后 227.79 MiB、GC 后 64.00 MiB，说明临时快照和垃圾占据很大峰值，结果缓存本身也仍有约 45 MiB 的增量。RSS 不必随 GC 立即回落。

受控结果支持：

- 单独修正查询，把该函数本机计算时间降到约 1/9；Set 本身不修复快照保留，所以 RSS 基本不变。
- 两项合并，相比原始实现时间减少约 90.8%，最大 RSS 减少约 35.2%。
- 全部方案的完整输出（Map 转 entries 后 JSON）SHA-256 都是 `9f3b6af0100c47bb929ef1d1d82ea2f1141e45263ad5c28dc0a1f6f85ceb419a`；小切片三个方案对应输出也一致。这是特定样本的行为等价证据，不是全 SRK 合约验证。

第一次包含其它准备动作的全量探索运行还记录到：solutions 排序 13.3 ms、一次 static conversion 49.1 ms、完整质量诊断 59.0 ms、两份 JSON clone 26.2 ms、曲线计算 5530.9 ms。此组是单次冷路径探索值，不能与三轮曲线专用实验混为同一基线；Chrome/低配置 Windows 下数值也不能照搬。

可复查的本地临时证据：

- `/tmp/rankland-time-bench.mts`：单次准备步骤和曲线计算。
- `/tmp/rankland-curve-bench.mts`：独立曲线函数测试。
- `/tmp/rankland-bench-prepare.cjs`：由只读原始源码生成 Set、逐分钟提取两个实验变体，带精确锚点检查。
- `/tmp/rankland-bench-run.cjs`：三方案三轮、独立进程顺序执行。
- `/tmp/rankland-curve-bench-results.json`：九轮原始内存/耗时/输出 hash。
- `/tmp/rankland-investigation-{live.html,styled.js,index.js,worker.js}` 及 `*-origin.js.map`、`*-worker.js.map`、`*-shared.js.map`：公开部署快照。

实验命令（替换到对应工作区路径即可）：

```sh
node --max-old-space-size=2048 --expose-gc \
  --import /Users/bLue/GitProjects/algoux/rankland-web/node_modules/tsx/dist/loader.mjs \
  /tmp/rankland-curve-bench.mts original 2535 300
```

临时文件不是产品改动；如需长期复跑，应将脚本作为性能实验工具归档并固定版本。本文已记录所有最终数值、关键变体和输入/输出摘要。

## 5. 优化方向与后续对照顺序

### 基础优化：保留整张表全量渲染

| 优先级 | 方向 | 证据与需要保留的语义 |
| --- | --- | --- |
| 高 | utils ICPC membership 用 Set/索引 | 独立函数实验已证实显著 CPU 收益；修复所属库为 utils，需覆盖所有榜列/markers/official/tie |
| 高 | 曲线按时间点直接收集结果 | 独立函数实验已证实显著临时内存收益；输出 point 顺序、段范围、AC/FB 事件保持一致 |
| 高 | 全员曲线改为按需启动，或明确限制预热 | 页面没有打开队伍详情也自动消耗资源已确认；先比较仅关闭预热的真实首屏曲线，保留点击时 loading/cancel，避免把成本简单转移为点击卡顿 |
| 高 | SSR 与客户端维持相同 key，避免无条件整表重挂载 | 已确认重复创建路径；需要同时验证 theme、用户显示设置、语言、时钟和首屏无闪烁需求，不能只删 key 就认为验收完成 |
| 中 | 减少 JSON clone + structured clone，精简 worker payload | 主线程两次 JSON 操作与 structured clone 已确认；纯 raw payload 能否直接 clone 要验证所有来源，选择单队时不必发送完整 staticRows |
| 中 | schema check、diagnostics 的职责/缓存/调度 | 均为同步全量扫描；schema checker 保留必要输入校验；可利用数据版本缓存、服务端已有诊断结果或 worker，不能仅用 rAF 延后就称为优化完成 |
| 中 | 减少首次 HTML/状态重复存储与保留 | 原始 JSON、内嵌状态字符串、SSR DOM、hydration VNode 同时存在；应先测 retained heap，并考虑初始化后释放全局原始状态字符串。保持 SSR、SEO 与客户端导航正确性 |
| 中 | 筛选/设置/回放时让稳定行和单元格避免无谓更新 | 当前筛选实际删除行，memo 已避免 `_now` 抖动；仍需渲染计数和 trace 证明哪些 props 使全部格子更新 |

特别注意：优化曲线不会减少 DOM/VNode 数量；优化组件全量挂载也不会消除自动 Worker 约 4.5 秒的单核 CPU 消耗和历史快照峰值。需要分别对照才能归因。

### 进阶优化

- 行虚拟化/分块渲染可降低全量 DOM、VNode、组件实例规模；要重新设计列宽测量、表头/列对齐、滚动定位、搜索、复制、打印、无障碍、SSR 与回放行为。它不会自动改变上述 worker 算法。
- 曲线仅计算当前请求用户、使用紧凑 typed arrays、稀疏变化点或服务器预计算，可继续降低全员曲线缓存。要说明采样精度、跨榜列/marker 的查询能力与缓存失效规则。
- 对首屏只返回展示所需摘要、提交明细按需加载，可以减少初始数据与内存；这是数据接口/回放能力的大改，不能伪装为组件小修。

### 浏览器对照矩阵

1. 原始生产快照 / 纯 Vue renderer / 关闭自动曲线预计算，分别记录首屏长任务、总 CPU、renderer+worker 内存与输入响应。
2. 原始 key 切换 / 稳定 key，记录 mounts/unmounts、DOM 数、峰值内存、hydrate/paint 时间；验证相同用户偏好。
3. Worker 原始 / Set / Set+流式提取，记录 worker CPU 时间、进程峰值 RSS/Private Bytes，确认 Node 收益在目标 Chromium 上保留。
4. 正常 worker / worker 创建失败，再点击队伍，测同步回退长任务。不能用这个人为故障声称首屏自然会走回退。
5. 完整 2535 行 / 官方或学校筛选后的行；首次进入 / 返回同一榜单 / 重复切换 10 次，检查旧 Worker 与旧表是否回收，区分峰值和泄漏。
6. 在低配 Windows VM 上记录虚拟 CPU/RAM、浏览器版本、页面内存、Windows commit/working set/page faults 与宿主压力，同时测量正常空闲与受控系统压力。浏览器 CPU throttling 不等价于内存压力；本 Node heap cap 也不等价于给 Windows 只分配低 RAM。

目前能确认“有足以解释明显卡顿和内存峰值的已部署实现路径”，并已有两项基础算法改进的受控证据。用户所述偶发卡死还需把这些路径与实际浏览器 trace/OS 内存证据对上；不能仅凭 Node 成功或失败就宣布复现整页浏览器卡死。

## 6. 后续发现：线上客户端包含 Vue 开发分支，构建配置原因已复现

**本项应先于单纯组件优化处理。** 生产 `index-1507c630.js` 中存在未加条件的 `__VUE_HMR_RUNTIME__` 赋值，以及 Vue warning/HMR/devtools 代码；这是实际执行分支，不只是 sourcemap 保留源码。Vue `3.5.35` 的 `runtime-core.esm-bundler.js:459–465` 仅在 `process.env.NODE_ENV !== "production"` 时设置这个全局，因此不能解释成仅启用了 production devtools。

本地只运行配置解析（不构建、不修改文件）已经复现原因：

1. `W/package.json:20` 的 `build:client` 直接运行 `vite-ssr build`，没有预设 NODE_ENV；CI `.github/workflows/ci.yml:59–73` 也未为构建设置它。
2. `W/node_modules/vite-ssr/build/index.js:38` 在实际 build 前先调用 `resolveViteConfig()`。
3. `W/node_modules/vite-ssr/config.js:17` 使用 `vite.resolveConfig({}, 'build', mode || process.env.MODE || process.env.NODE_ENV)`，省略第 4 个参数。
4. Vite `4.5.14` 的 `dist/node/chunks/dep-827b23df.js:66078–66087` 对 `resolveConfig` 的 `defaultMode` 和 `defaultNodeEnv` 都默认 `development`；NODE_ENV 未设置时立即把它写成 development。
5. `W/vite.config.js:44` 优先采用已设置的 `process.env.NODE_ENV`，因此编译定义也变成 development；`:66190` 的 `isProduction` 变成 false。
6. 后续 `vite.build` 虽以 production 为默认值（同文件 `:47982`），但不会覆盖已经设置的 NODE_ENV。

三个独立 Node 进程的 config-only 对照：

| 输入 | 解析后 NODE_ENV | mode | isProduction | `define['process.env.NODE_ENV']` | Vue plugin isProduction |
| --- | --- | --- | --- | --- | --- |
| NODE_ENV 未设置 | development | development | false | `"development"` | false |
| NODE_ENV 未设置，仅显式 mode=production | development | production | false | `"development"` | false |
| 进程预设 NODE_ENV=production | production | production | true | `"production"` | true |

这些实验中 `__VUE_PROD_DEVTOOLS__` 配置为 false。哈希文件名与 minify 并不能证明运行的是 production Vue，因为 build 命令仍然会输出压缩资源。

后续基础修复方向是从构建进程入口显式设定 production，例如在现有 `build:client` 中让 `cross-env NODE_ENV=production` 先于 `vite-ssr` 执行，并增加产物断言检查开发分支是否已消失。单独追加 `--mode production` 不够。Dockerfile `:11` 的 `ENV NODE_ENV=production` 在前端资源构建完成后才用于运行容器，不会改变已经嵌入 JS 的编译常量。

关于“开发分支是否就是旧表的保留者”，应继续区分证据：

- HMR 全局证明开发代码存在，但本次扫描线上入口和 StyledRanklist chunk 没有发现 `.__hmrId=`、`__hmrId:` 或组件 `createRecord` 调用；plugin-vue 只有存在 devServer 时才赋 HMR ID（其 `dist/index.cjs:2405–2408`）。不能仅凭全局对象就断言 HMR record Map 保存了旧表。
- Vue devtools 初始 event buffer 在无 hook 时设置 3 秒 timer 清空（runtime-core `:612–617`）。页面长任务会延迟 timer，构成峰值风险；若 timer 已执行，就不能继续把常驻旧表归因于这个初始 buffer。
- DEV hydration 会给 DOM 节点写 `__vnode` 与 `__vueParentComponent`（`:1945–1948`）；后续仅被实际 patch 的元素更新 `__vnode`（`:5747–5751`）。对保持连接但没被 patch 的静态祖先，应检查其 `__vnode.children` 是否仍引用 `key='ssr-ranklist'`、`component.isUnmounted=true` 的旧表。这一候选随后通过下节的 heap retainer 证据确认；最终定位到 Fragment 的起始注释节点。

### 6.1 已完成的旧表 retainer 取证

为避免全量 heap snapshot 自身造成过大诊断负担，使用生产 HTML 的前 100 行副本：内嵌 SRK 同步裁切，并用对应生产版本重新 SSR 表格与题目统计；新表前 100 行 body 与生产原前 100 行逐字节一致。主调查采集的 `/tmp/srk-performance-20261020/results/online-small-retainers.heapsnapshot` 已完成离线分析（1,276,346 个 heap nodes、7,451,713 条 edges）。

排除 weak 边、DevTools console root、WeakMap ephemeron 的合成 value 边后，仍找到以下真实强引用链：

```text
Window → HTMLDocument
  → connected div[data-id="collection-ranklist-content"] #1695249
  → connected Comment #1186615
  → __vnode → 初始 Fragment VNode #1753521
  → dynamicChildren[14] → Ranklist VNode #1753555（key="ssr-ranklist"）
  → el → detached div.srk-common-table #2019555
  → detached table #2019551
```

该旧 Ranklist VNode 的 `component` 指向 instance #277549，字段明确为 `isMounted=true, isUnmounted=true`；其活跃父 instance #266091 的 `isUnmounted=false`。Comment 的 native `detachedness=1`（仍连接），旧表容器和 table 的 `detachedness=2`（已分离）。因此旧表确实完成了 unmount，但通过仍连接的 Fragment 注释节点上的 DEV `__vnode` 属性继续可达。

Vue 对应路径：hydration 的 `hydrateNode` 给所有节点（包括 Fragment 注释）设置调试属性；`processFragment` 复用起始 anchor 并更新 children，但没有把这个 anchor 的 `__vnode` 更新成新 Fragment。旧 Fragment 的 `dynamicChildren` 留着被 key 切换替换掉的旧 Ranklist。这里的根链不是项目主动缓存的旧 Ranklist，也不依赖 HMR record Map 或 3 秒 devtools event buffer。

离线脚本 `/tmp/rankland-heap-retainers-filtered.cjs` 与输出 `/tmp/rankland-small-retainers-filtered.json` 保留了节点 ID、边类型和完整强链，方便在对应 snapshot 中复查。该结论与完整页面稳定 key 对照一起看，支持优先修正生产构建环境，再消除不必要的首屏重挂载。完整页面轻量 probe、生产构建对照和跨平台结果由主调查报告记录；不要把 heap snapshot 过程的峰值内存或诊断引发崩溃当作正常加载内存或自然崩溃证据。
