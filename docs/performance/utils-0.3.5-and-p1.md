# utils 0.3.5 接入与 P1 建议

日期：2026-10-20。本次只升级正式依赖并给出建议，未实施 P1。

## 正式版本接入

- 已从 npm 核实 `@algoux/standard-ranklist-utils@0.3.5`。
- RankLand、renderer 根工作区和 core/react/vue/solid/svelte/angular 六个包的依赖下限更新为 `^0.3.5`，锁定实际版本 0.3.5。
- 删除两处 0.3.4 补丁文件和 `patchedDependencies` 声明；两边冻结锁文件安装成功。
- renderer 发布年龄例外只允许本次明确指定的 0.3.5，没有全局关闭检查。
- 10 条 root/框架依赖解析路径均使用 0.3.5。正式 ESM/CJS 文件与 P0 补丁产物逐字节相同，demo2 完整静态排名输出 SHA 仍为 `7b8e64a2eea333a32109105f9f2d62b8de82de91b78ef5e2ad853a5bfdef43c6`。
- 本次重跑 renderer workspace：200 项通过；RankLand：697 项通过、21 项原有环境测试跳过。补充六包 patch changeset，未运行版本升级、commit 或发布。

RankLand 的旧 `standard-ranklist-convert-to@0.2.2` 仍按自身兼容范围使用 utils 0.2.13；未强行跨版本覆盖该转换依赖。此次渲染与排名热路径均已解析到 0.3.5。

证据：[依赖路径与文件哈希](evidence/utils-035-verification.json)。

## P0 前后对比

下面沿用此前已完成的同机实测；本次升级未重跑 Windows。由于正式 0.3.5 与已测补丁代码逐字节相同，这次接入没有新增运行时代码差异。

| 指标 | P0 前 | P0 后 | 变化 |
| --- | ---: | ---: | ---: |
| Windows 最长主线程任务 | 4,398 ms | 904 ms（三轮中位） | 约 −79% |
| Windows GC 后主页面 JS heap | 578.1 MiB | 185.67 MiB（三轮中位） | 约 −68% |
| Mac 最长主线程任务 | 2,142 ms | 383 ms（三轮中位） | 约 −82% |
| Node 26 完整曲线计算 | 4,530.4 ms | 396.1 ms（三轮中位） | 约 −91% |
| Node 26 曲线计算峰值 RSS | 369.31 MiB | 239.45 MiB（三轮中位） | 约 −35% |

全量 2,535 行保留，原先额外保留的约 19.9 万个旧表节点已消除。前样本是线上页面、后样本是实际构建的本地 SSR 夹具，这不是网络导航总耗时的严格 A/B。Windows 仍有约 0.9 秒主线程阻塞、约 20 万 DOM 节点，renderer private 峰值仍可达约 1.1 GiB。

## 是否继续 P1

建议继续一轮有边界的 P1，目标是进一步减少分配、后台工作和低配设备的内存压力。优先做不改变功能时机的 Worker 传输和组件结构优化；曲线按需启动需要单独权衡首次点击体验。不期待再取得 P0 那样的数倍改善。

| 方向 | 证据与估算 | 边界 |
| --- | --- | --- |
| 精简队伍选择请求 | demo2 首队的当前 select 元数据 JSON 为 **2,998,934 bytes**；改为当前 user 加原有必要 metadata 的候选约 **586 bytes**，请求体量理论下降 **99.98%** | 这是 JSON 尺寸测算，尚未实现，不是 structured clone 耗时测试。现有 Windows select 总往返约 40–46 ms，最多只节省其中复制/传输部分 |
| 共享 StatusBody 组件类型 | 之前三轮原型存活 JS heap 少 **10.2 MiB** | 整页 186 MiB 主堆可粗略外推到约 **176 MiB**；首帧改善很小 |
| 内联 StatusBody 内容 | 之前三轮原型 heap 少 **21.5 MiB**，mount 少 **25.2 ms（7.3%）**，首帧少 **19.7 ms（3.0%）** | 整页主堆粗估约 **165 MiB**，首屏收益按个位数百分比期待；不能直接把此比例应用到 Windows 的 904 ms |
| 曲线按需启动、明确缓存保留策略 | 不看曲线的访问可避免约 **0.44 s（Mac）/1.33 s（Windows）** 的后台 prepare 往返及结果缓存；Node 结果缓存增量约 **45 MiB** 可作为量级参考 | Worker 成本不能从 904 ms 主线程任务或 186 MiB 主页面 heap 中扣除；首次查看曲线可能多等待约秒级，需保留异步 loading/cancel。单纯延后执行不会减少总工作 |
| 更新传播、slot 参数、solutions 懒计算 | lazy-slot-props 原型 mount 少约 21 ms，但首帧和存活堆未改善；lazy-solutions 首帧收益难以辨认 | 应先测设置切换、筛选、回放的更新范围，不将这些小优化列为高收益承诺 |

共享与内联 StatusBody 是替代方案，不能把 10.2 与 21.5 MiB 相加。上述不同方向也没有联合实验，不给出“总共还能降低多少”的虚假精度。JS heap、Worker heap、进程 private/RSS 是不同口径，不混合相加。

当前切榜和卸载时已终止旧 Worker；P1 的生命周期工作是避免无需求预热、决定关闭详情后何时回收缓存，不是重新实现已有取消逻辑。即使只返回一个队伍的曲线，排名仍需参考其它队伍，不能按 1/2,535 比例推算计算量。

建议验收继续使用 demo2 和相同 Windows VM，分别记录主线程长任务、Worker 准备/选择往返、GC 后主堆和进程峰值，并验证首次点击曲线的体验。保留全量 DOM 的 P1 无法保证消除所有秒级阻塞；若目标是显著降低 DOM/native 内存或稳定达到更短响应预算，仍需后续另行评估行虚拟化。

证据：[组件原型三轮中位数](evidence/component-variant-medians.json)、[select 请求体量测算](evidence/p1-select-payload-estimate.json)、[P0 实测](p0-implementation-report.md)、[Windows 数据](p0-windows-validation.md)。
