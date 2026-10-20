# P0 修复与复测结果

后续状态：已切换到正式 utils 0.3.5 并移除过渡补丁；正式运行时代码与本报告测量的补丁产物逐字节一致。见[版本接入与 P1 建议](utils-0.3.5-and-p1.md)。下文保留 P0 实施时的过程记录和测量。

日期：2026-10-20。已落实生产构建、重复挂载和排名曲线计算三项 P0，保留完整 2,535 行渲染。未实施虚拟列表、P1 单元格微优化或按需曲线；未 commit、发布包或部署。

## 实际改动

| 位置 | 修复 |
| --- | --- |
| RankLand `package.json`、`vite.config.js`、`scripts/production-client-guard.cjs` | 在 vite-ssr 预解析前显式设置 `NODE_ENV=production`；同时检查解析后的配置和最终 JS AST，阻止开发态 Vue 进入构建产物 |
| RankLand `StyledRanklistRenderer.vue` | 删除首屏变化的 key，在同一实例上应用客户端显示偏好；保留水合 reveal、帧等待和 Live CCPC26 时钟 gate |
| utils `js/src/ranklist.ts` | 每个 ICPC 榜列建立 ID Set，代替每行重复 `filteredRows.find`；保持过滤、official、并列和奖项语义 |
| RankLand `rank-time-data.util.ts` | 每分钟立即提取最终数值 points，只保留当前 staticRows，释放历史中间行 |
| 两个消费者的 `patches/` 与 pnpm 配置/锁文件 | 将 utils 修复持久接入现有 0.3.4，不依赖仅修改 node_modules，也不引用本机绝对库路径 |

utils 的源码构建结果与补丁后的 ESM/CJS 文件逐字节一致。RankLand 使用 pnpm 9、renderer 工作区使用 pnpm 11，各自 `--offline --frozen-lockfile --ignore-scripts` 安装成功；依赖版本没有升级。两项目从 root、core、Vue 三个入口解析的六条路径都使用 patched utils。

补丁只对这两个声明它的 pnpm 工作区生效，不代表所有外部 npm 消费者已经获得新版本。后续正式发布修复版 utils 后，应升级依赖并移除旧版本补丁及锁文件关联；本轮没有发布授权。

设计已沉淀到 RankLand：
`docs/implementation/2026-10-20-ranklist-p0-performance.md`。

## 正确性与回归

| 检查 | 结果 |
| --- | --- |
| utils JS 全套 | 92 项通过 |
| 补丁 ESM/CJS 的 ranklist 回归 | 44 项通过；与 producer build 字节一致 |
| RankLand 单元测试 | 697 项通过，21 项原有环境条件测试跳过 |
| renderer workspace | 200 项通过（不是全部其它框架套件的声明） |
| 正常 `scripts/e2e-build.cjs` | client、SSR、server 全部成功，产物通过生产守卫 |
| 榜单/主题/CCPC26 浏览器套件 | 41 项中 36 项通过，5 项既有失败；新增 SSR 节点复用和全部 9 项 CCPC26 通过 |
| 独立审查 | 未发现剩余 P0 产品缺陷；已修正审查发现的测试过滤配置覆盖缺口 |
| 定向 lint / 三仓库 diff check | 通过；未修改部分的旧 e2e 嵌套回调 lint 问题未扩大处理 |

5 项 E2E 失败必须单独保留，不能称为整套全绿：浏览次数本地增量、组织下拉宽度、桌面/手机提示层级、缺失比赛错误页。用 HEAD `637c7a1` 的组件、主线程/Worker 曲线、原 utils 0.3.4 和原 development 构建做隔离对照，五项以相同断言值复现；对应产品路径本轮未修改。详见[旧 E2E 对照分析](p0-existing-e2e-failures.md)和[机器摘要](evidence/p0/existing-e2e-failures.json)。

曲线语义 golden 在原实现上生成，覆盖真正的 `rule.options.filter`、并列、非正式队伍、FB、空分钟、末尾部分时间区间、count/ratio/noTied 分段。另有 120 组独立差分，完整输出及 Map 顺序一致，冻结输入未被修改。

完整 `demo2.json` 验证：

- 静态排名输出 SHA-256：`7b8e64a2eea333a32109105f9f2d62b8de82de91b78ef5e2ad853a5bfdef43c6`，旧 ESM、新 ESM、新 CJS 一致。
- 曲线完整输出 SHA-256：`9f3b6af0100c47bb929ef1d1d82ea2f1141e45263ad5c28dc0a1f6f85ceb419a`，与调查阶段原始实现一致。
- 全表可见文字 SHA-256：`8bb5d9b10832481ca53f9536faf4c3bbb802fd924cadcad9a4ef266a47315915`，Mac 三轮与修复前一致。
- 复杂度 getter 计数从 6,428,760 次 ID 读取降到 5,070 次；此为带探针计数，不作为普通数据的耗时基准。

## 复测产物与方法

使用本轮实际源码通过正常构建入口产生 client/SSR/Worker。离线生成器只将 `Collection.asyncData` 的数据获取替换为原公开页面 state（其中 SRK 与 demo2 深度相等），再执行真实新 SSR renderer；没有改写压缩 JS，也没有复用之前的实验优化脚本作为产品代码。

产物包含 8,641,274 字节 SSR HTML、全部 2,535 行和 14 题，入口为 `index-4f4b6864.js`，Worker 为 `rank-time-data.worker-f3bcf541.js`。Worker sourcemap 的曲线源码与当前源文件逐字节一致，包含 patched utils membership。Windows 上 72 个站点文件的 SHA/size 与 host 全部相符。

站点仅用 loopback 提供；E2E 构建的本地 VIN 地址由空公告夹具响应。无生产后端请求。浏览器与资源采样顺序执行，不与构建或其它性能基准并发。Mac 为三个独立 Chromium 进程；Windows 为三个 fresh target、禁用网络缓存，使用同一隔离 profile。

本机工具运行时包含 Node 24.19.0 和 26.0.0，项目 engines 声明 Node 20；实际正常构建在本机 Node 26 通过，未另行声称完成 Node 20 部署环境验证。曲线对比专门固定 Node 26，与此前基线保持一致。

## Mac 三轮

Chrome for Testing 151.0.7922.34 arm64，1440 × 900、DPR 1；与调查时使用同一 Mac。

| 指标 | 第 1 轮 | 第 2 轮 | 第 3 轮 |
| --- | ---: | ---: | ---: |
| 全量行数 | 2,535 | 2,535 | 2,535 |
| 最长主线程任务 | 385 ms | 381 ms | 383 ms |
| GC 后主页面 JS heap | 186.06 MiB | 186.06 MiB | 186.06 MiB |
| GC 后 CDP nodes | 199,507 | 199,507 | 199,507 |
| connected 全节点 | 199,495 | 199,495 | 199,495 |
| Worker prepare 往返 | 451.3 ms | 436.5 ms | 436.6 ms |
| hydration + Worker ready 观察点 | 1,692 ms | 1,636 ms | 1,687 ms |

三个页面均无开发态 HMR/DOM VNode 调试标记、运行错误或失败请求；队伍详情和曲线 canvas/Worker 选择响应通过。初次 hydration 和 Worker ready 是探针观察点，不是 LCP/INP，也不作为与线上网络时间的直接对比。

同 Node 26、同 demo2 的独立曲线函数三次为 383.9/396.1/397.8 ms，中位 **396.1 ms**，峰值 RSS 中位 **239.45 MiB**；原实现基线为 **4,530.4 ms / 369.31 MiB**。完整输出哈希一致。Node 24 的补充数据单独保存，不混入这个比较。

曲线最终 GC heap 仍约 64 MiB，代表全员结果缓存依然存在；这里降低了计算耗时及临时峰值，没有宣称缓存消失。

## Windows 三轮

同一 Windows 11 ARM64 VM：2 vCPU / 6 GiB，原生 Edge 154.0.4258.37，1440 × 900；未调整 VM、页文件、用户浏览器或施加人工压力。

| 指标 | 第 1 轮 | 第 2 轮 | 第 3 轮 |
| --- | ---: | ---: | ---: |
| 全量行数 | 2,535 | 2,535 | 2,535 |
| 最长主线程任务 | 904 ms | 907 ms | 828 ms |
| GC 后主页面 JS heap | 185.41 MiB | 185.67 MiB | 185.69 MiB |
| GC 后 CDP nodes | 199,507 | 199,486 | 199,486 |
| connected 全节点 | 未采集 | 199,475 | 199,475 |
| 原 SSR 行复用 | 未单独标记 | 2,535 | 2,535 |
| Worker prepare 往返 | 1,387.7 ms | 1,325.7 ms | 1,311.3 ms |

最长任务中位 **904 ms**、主 heap 中位 **185.67 MiB**；调查阶段同 VM 的线上页面为 **4,398 ms / 578.1 MiB**。旧约 19.9 万节点的第二份表没有再出现，后两轮确认所有原 SSR 行仍在文档中。首轮提示弹窗的状态与后两轮不同，不能把其 21 个额外节点视作旧表泄漏。

三轮均真实关闭 OK 提示（存在时），hit-test 后鼠标点击首队，收到 301 点的 Worker select 响应、显示完整曲线，Escape 关闭后仍有 2,535 行。所有本地请求为 200，无远端资源加载和运行错误。截图与完整资源采样见[Windows 复测报告](p0-windows-validation.md)。

**比较边界：**旧样本使用线上页面，新样本使用本地真实构建及数据夹具；可说明主线程任务、存活堆和节点保留明显改善，但不是相同网络传输条件下的导航耗时 A/B。

## 剩余成本与范围

- Windows 仍有约 **0.9 秒的主线程阻塞**。全量渲染的约 20 万节点、组件和布局成本仍在，本轮没有将其改为虚拟列表。
- Windows renderer 稳定 private 约 723–746 MiB，250 ms 采样的 private 峰值最高约 **1,123 MiB**；它包含主线程、Worker/native 等，不能用 186 MiB JS heap 代表总进程内存。采样还可能漏过更短峰值。
- 全员曲线预热与最终 points 缓存保持现有行为。未实施 P1 懒加载、序列化精简或单元格层级优化。
- 未证明极端内存压力下不会卡顿或崩溃；本轮没有重新施加人为压力，也没有发布到线上。
- 5 项既有 E2E 失败已与本轮回归分离，不在 P0 需求中顺带修改。

## 收尾与证据

Mac 的隔离 Chromium、loopback 站点与临时 MySQL 均已关闭。Windows 的测试 Edge、HTTP 4178/辅助 4322/CDP 9223 与资源 sampler 已关闭并验证。用户已有浏览器、VM 配置、原工作区数据和未提交修改均保留。

- [实施计划](p0-implementation-plan.md)
- [构建/数据指纹](evidence/p0/site-build.json)
- [utils demo2 验证](evidence/p0/utils-demo2.json)、[两种构建产物验证](evidence/p0/utils-dist.json)
- [Mac 第 1 轮](evidence/p0/mac-fixed-1.json)、[第 2 轮](evidence/p0/mac-fixed-2.json)、[第 3 轮](evidence/p0/mac-fixed-3.json)
- [曲线 Node 26 第 1 轮](evidence/p0/curve-fixed-node26-1.json)、[第 2 轮](evidence/p0/curve-fixed-node26-2.json)、[第 3 轮](evidence/p0/curve-fixed-node26-3.json)
- [Windows 汇总](evidence/p0-windows-summary.json)、[Windows 清理验证](evidence/p0-windows-cleanup-state.json)
- 临时构建、SSR 生成器、Mac 测量脚本和测试日志：`/private/tmp/srk-p0-20261020/`。Windows 可复跑诊断脚本位于本目录 `harness/windows/`。
