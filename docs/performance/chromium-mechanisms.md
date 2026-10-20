# Chromium、V8 与 Windows：大型榜单的性能故障机制

调研日期：2026-10-20。本文使用 Chromium/V8 源码、Chrome/Vue 官方文档、
CSS 规范和 Microsoft 文档，解释故障路径并提出验证方法。**本文本身不包含
RankLand 的复现实验结果，也不把机制上的可能性当作本项目已经确认的根因。**
页面、数据和组件实测应与本文分开记录。

源码链接中的 `main`、`master` 会变化，且源码主干不等于用户安装的发行版。
本次读取的 Chromium `main` 页面显示提交
`875454c6f4e6122c1fc84e83d1c15e1ba62332aa`；
Windows 压力检测文件的 blob 为 `512f528ba0484c3d20f26307ae81df5610960572`，
输入超时处理文件的 blob 为 `421fa454dce53943cf90f1073f6938bb624f0c6d`。
解释具体故障时仍需记录浏览器完整版本、位数、GPU 后端、操作系统和实验参数。
[Chromium 主干提交](https://chromium.googlesource.com/chromium/src/+/refs/heads/main)

## 1. 调研结论与证据边界

大型全量榜单确实可能在配置较低或负载较高时，从可察觉卡顿变成长时间无响应，
而在高配置开发机上表现正常。至少需要区分以下四条路径：

| 路径 | 可能看到的表现 | 确认所需证据 |
| --- | --- | --- |
| 主线程忙于 JS、样式或布局 | 页面点击迟迟不处理、首屏停住，浏览器外壳仍可能响应 | 主线程 trace、输入延迟、最长任务、函数或渲染阶段耗时 |
| 分配量大、GC 频繁或压力下更激进地回收 | 一阵流畅一阵暂停，heap 呈锯齿变化 | GC 事件与暂停对齐、allocation profile、回收后存活对象 |
| 系统内存紧张与换页 | 包括浏览器外壳在内的应用都迟缓，磁盘活跃 | Windows 可用物理内存、硬缺页、磁盘 I/O、进程工作集 |
| 提交内存不足、V8/native/GPU 分配失败 | 标签崩溃、进程退出；系统也可能失灵 | crash/exit 原因、commit 用量和上限、进程/GPU 内存 |

Chrome 官方明确指出，没有适用于所有设备的“页面占用多少内存才算过高”阈值；
同一页面可能在高端设备正常、低端设备崩溃。因此“Mac 未复现”不能排除资源问题，
“JS heap 没到上限”也不能排除页面总占用过大。
[Chrome 内存问题诊断](https://developer.chrome.com/docs/devtools/memory-problems)

这些路径可以叠加。例如大量组件和 DOM 的首次建立既执行 JS，又产生对象分配，
接着触发样式/布局；系统剩余内存较少时，同一次打开操作还可能引起回收和换页。
这是待验证的组合假设，不能据此直接宣称 RankLand 有内存泄漏。

## 2. 主线程长任务足以造成“像卡死一样”的体验

JS 任务通常必须执行完才把主线程交回浏览器。超过 50ms 的任务被定义为长任务，
但 50ms 是诊断边界，不是崩溃阈值。连续执行大量转换、排序、响应式依赖读取、
组件挂载和 DOM 更新，会推迟用户输入与下一次绘制。把代码拆成多个同步函数
不会让浏览器获得调度机会；可验证的分段方案需要真正让出任务，例如
`scheduler.yield()`，并为不支持的环境提供适当后备。
[长任务与让出主线程](https://web.dev/articles/optimize-long-tasks)

Chromium 的 `RenderWidgetHostImpl::OnInputEventAckTimeout` 在满足可见性等条件时，
会调用 `RendererIsUnresponsive`。本次读取的源码中，默认 desktop
`kHungRendererDelay` 为 15 秒，Android 为 5 秒；`kRendererHangWatcherDelay`
又允许通过 feature 参数配置。**这不是“任何 JS 执行 15 秒必定弹窗”的规则，
更不是页面的最大合法加载时间。** 输入确认、页面可见性、版本和具体监控路径都会
影响表现；它说明“未响应”可以在没有 OOM 时发生。
[输入 ACK 超时处理](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/content/browser/renderer_host/render_widget_host_impl.cc)、
[默认常量](https://raw.githubusercontent.com/chromium/chromium/main/components/input/input_constants.h)、
[feature 参数](https://raw.githubusercontent.com/chromium/chromium/main/components/input/features.cc)

对本项目的验证方向：

- 将“网络下载完成”“SRK 转换完成”“Vue 挂载完成”“榜单首次可见”分别打点，
  避免把整段白屏都算作网络慢或都算作 Vue 慢。
- 在真实点击、筛选、时间回放、主题切换和滚动附近记录 trace。每种动作单独测，
  找到触发整表更新的动作，再定位 `Scripting`、`Style/Layout`、`Paint` 的占比。
- 同时记录页面外部 watchdog。页面中的 `setInterval`、`requestAnimationFrame`
  和 observer 回调也会被主线程阻塞，不能担任唯一的“页面是否还活着”证据。
- 单次自动化超时只能记为“在预算内未完成”；只有 crash/exit 证据才能记为崩溃。

## 3. 大 DOM、布局、绘制与合成需要分开测量

RenderingNG 将 DOM 更新到显示分为样式、布局、绘制、提交、分层、栅格化和合成等
阶段。主线程和 compositor 分离，允许部分滚动/动画绕过主线程，但不能让首次
大规模 DOM 建立与布局免费完成。GPU 加速不可用时还可能回落到 CPU 路径。
多个同站点页面也可能共用 renderer，因此一个标签的停顿不必严格局限于一个标签。
[RenderingNG 架构](https://developer.chrome.com/docs/chromium/renderingng-architecture)

DOM 数量增大会提高首次渲染及后续更新成本；真正影响一次交互的，还包括本次
失效涉及多少元素、选择器复杂度和布局范围。应查看 trace 中本次
`Recalculate Style`/`Layout` 的影响范围，不能仅凭 DOM 总数判断具体瓶颈。
另外，`document.querySelectorAll('*').length` 是元素数，
CDP `Memory.getDOMCounters().nodes` 还包含其他节点，二者不是同一统计口径。
[DOM 规模与交互性能](https://web.dev/articles/dom-size-and-interactivity)

### sticky 与图层的判断

固定表头/列可能影响合成，但 `position: sticky` 的声明数不等于 compositor
layer 数，也不能把所有单元格都算成独立 GPU 纹理。应检查真实图层树、
`Compositing Reasons`、`Sticky position constraint`、paint count 和 slow-scroll
regions。Chrome 的 Layers 面板提供这些字段；CDP 也提供 layer tree 和逐层合成原因。
[Layers 面板](https://developer.chrome.com/docs/devtools/layers)、
[LayerTree 协议](https://raw.githubusercontent.com/ChromeDevTools/devtools-protocol/master/pdl/domains/LayerTree.pdl)

可逆的诊断对照是：暂时取消 sticky、阴影、模糊、动画或额外的 `will-change`，
分别比较同一段滚动和首次加载的 trace。一次只改变一个因素，保留 DOM 和数据量。
如果没有改善，就不能把这些样式列为已确认的根因。尤其不要无差别地给每行添加
`translateZ(0)` 或 `will-change: transform`；Chrome 官方说明，过量图层反而
可能比局部重绘更慢。
[Chrome 合成与图层开销说明](https://developer.chrome.com/blog/inside-browser-part3)

图层的宽高可以帮助定位异常，但不能简单用“整张长表的 CSS 宽 × 高 × 4”当作
实际 GPU 驻留内存。RenderingNG 使用纹理 tiles，屏幕比例、可见区域、栅格策略
和资源复用都会影响实际结果。图层统计应与 GPU/进程测量相互印证。

## 4. JS heap、浏览器内存与 GC

### 至少保留三个观测层次

| 层次 | 关注内容 | 不能据此推出的结论 |
| --- | --- | --- |
| JS / V8 | 原始数据、派生快照、组件/VNode、闭包、缓存，回收后的存活量 | JS heap 小就代表 renderer 或整机占用小 |
| renderer/native | DOM、布局和绘制相关对象、native 分配及进程工作集/私有提交 | RSS 降低就代表对象已释放，或所有内存属于当前页面 |
| browser/GPU/系统 | browser 与 GPU 进程、共享资源、系统 commit、可用 RAM | 把进程值直接相加一定得到无重复的页面专属内存 |

Chrome Task Manager 的 memory footprint 和 JavaScript memory 本来就是不同指标。
排查泄漏应比较重复操作后、回收后的存活对象及引用链，特别是 detached DOM；
单次打开后的高稳定占用属于另一类问题。不要因 heap 高峰或正常的 GC 锯齿就判定泄漏。
[Chrome 内存诊断与 detached DOM](https://developer.chrome.com/docs/devtools/memory-problems)

V8 的 GC 有并行、增量和并发工作，**不能描述成每次回收全程暂停全部脚本**。
但并行的 stop-the-world 阶段仍会暂停执行，增量只是拆分工作，并未消除总成本；
可并发执行也不代表没有 CPU 和内存带宽消耗。
[V8 Orinoco 设计](https://v8.dev/blog/trash-talk)

V8 公共接口对 memory pressure 的描述更直接：`kModerate` 可加快增量回收并牺牲延迟，
`kCritical` 要尽快释放内存，可能有较大的回收暂停。因此“低内存时浏览器主动优化，
反而让页面明显停顿”在机制上成立；是否在 RankLand 发生，需要将压力信号和 GC
trace 对齐。GC 无法回收仍被榜单数据、组件和 DOM 正常引用的存活对象。
[V8 MemoryPressureLevel 与通知接口](https://raw.githubusercontent.com/v8/v8/main/include/v8-isolate.h)

实验中若强制 GC 或采集 heap snapshot，应单独标记。它们可以回答“哪些对象仍存活”，
不应把被干预后的耗时冒充自然加载耗时。V8 的测试 GC 接口也明确不用于生产回收调度。

## 5. Windows 低内存：物理内存与 commit 是不同约束

Windows 工作集是当前驻留物理内存的页。内存管理器可以裁剪工作集；之后重新访问时
发生 page fault。软缺页可由 RAM 满足，硬缺页需要从后备存储读取，后备存储可能是
pagefile，也可能是内存映射文件。**看到 page faults/sec 高，不足以证明正在严重换页**；
需要硬缺页和 I/O 证据。
[Microsoft Working Set](https://learn.microsoft.com/en-us/windows/win32/memory/working-set)

系统 committed memory 是系统承诺提供的内存，其上限受 RAM 和 pagefile 支持。
commit 接近 limit 时，新分配可能无法满足，Microsoft 明确将冻结、崩溃和其他异常
列为可能结果。应记录 `\Memory\Committed Bytes`、`\Memory\Commit Limit`、
可用物理内存，以及 renderer/browser 的 private bytes、working set。
“还有一点可用 RAM”和“提交额度是否耗尽”不能互相替代。
[Microsoft pagefile 与系统 commit](https://learn.microsoft.com/en-us/troubleshoot/windows-client/performance/introduction-to-the-page-file)

本次 Chromium Windows 源码的 `CalculateCurrentPressureLevel` 同时读取
`ullAvailPhys` 和 `ullAvailPageFile`，但基于 commit 的判定受
`kCommitAvailableMemoryPressureThresholds` feature 控制，源码默认关闭。
该分支的默认阈值是可用 commit 低于 500MiB/200MiB 时分别判定 moderate/critical；
它们是**该实现分支的系统压力阈值，不是页面内存预算或所有 Chrome 版本的行为保证**。
发布版本及实验分组可能不同。
[Windows memory pressure evaluator](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/components/memory_pressure/system_memory_pressure_evaluator_win.cc)

Memory Saver 回收不活跃标签，与当前标签中 DOM/JS 的工作量不是同一层问题。
用户重新访问标签会重新加载。源码中的 urgent discarding 又有自己的策略；
本次读取的普通桌面紧急回收路径调用 `DiscardAPage(URGENT)`，可见页面标为 protected，
helper 默认跳过 protected 候选。这不是“内存紧张时浏览器必定及时救活当前标签”的承诺，
也不能把 Android/ChromeOS 的策略直接套到 Windows。
[Chrome Memory Saver](https://support.google.com/chrome/answer/12929150?hl=en)、
[urgent discarding](https://raw.githubusercontent.com/chromium/chromium/main/chrome/browser/performance_manager/policies/urgent_page_discarding_policy.cc)、
[discard eligibility](https://raw.githubusercontent.com/chromium/chromium/main/chrome/browser/performance_manager/policies/discard_eligibility_policy.cc)、
[discard helper](https://raw.githubusercontent.com/chromium/chromium/main/chrome/browser/performance_manager/policies/page_discarding_helper.cc)

对低配置 Windows VM，应首先读取既有 RAM/vCPU、浏览器架构、GPU 加速状态、
pagefile 和宿主机内存压力，避免一开始就修改配置。若运行在 Apple Silicon 上，
还需记录 Windows/浏览器是原生 ARM64 还是涉及 x64 仿真；这属于实验环境混杂因素，
不能把单个 VM 的结果直接换算成某档 x86 PC。

## 6. 实验方法：区分降速、压力信号和真实内存不足

以下是建议的实验矩阵，**不表示已执行**。所有压力实验使用独立测试浏览器配置，
只操作测试页面；保留外部超时和退出方式，不对用户正在使用的浏览器注入全局压力。

| 实验 | 控制条件 | 能回答的问题 | 主要局限 |
| --- | --- | --- | --- |
| 生产构建基线 | 固定数据、viewport、DPR、浏览器版本；冷/热缓存分开 | 正常配置下哪个阶段最贵 | 不能代表低内存机器 |
| CPU 1×/4×/6×，必要时更高 | 同机、同数据、同构建；记录真实倍率 | 同步 JS/样式/布局是否对单核性能敏感 | 不模拟 GPU、RAM 容量、磁盘或热节流 |
| pressure notification | 页稳定后发 moderate/critical；记录通知时点 | 浏览器压力响应是否引入明显 GC/缓存重建暂停 | 没有制造真实 RAM/commit 上限 |
| 原始数据的行数切片 | 例如 25%/50%/100%，题数不变 | 数据/DOM/组件成本如何随行数增长 | 切片改变榜单；不能作为正确性对照 |
| 样式逐项关闭 | sticky、阴影、模糊等单独对照 | 栅格/图层/绘制是否为主要贡献者 | 这是定位实验，不是已接受的产品修改 |
| Windows VM 原配置 | 先测空闲状态，记录 guest 与 host | 是否能在已有低配置环境自然复现 | 虚拟 GPU 与调度区别于真实 PC |
| VM 中受控背景负载 | 分别增加 CPU 与实际触页的内存负载，设置硬预算和时限 | 是否出现换页放大、系统级迟缓 | 混合负载必须记录，否则不能归因 |
| 多次进出/交互后取快照 | 同一流程重复，回收前后分别比较 | 是否存在持续增长/保留旧表的泄漏 | 调试器和采样本身影响资源与时序 |

Chrome 官方说明 CPU throttling 不能覆盖 GPU 进程，也不能覆盖设备内存带宽、
磁盘和热节流差异。因此 Mac 上 6× CPU 测试流畅，不能排除 VM/用户机器上的 GPU
或内存问题；反之 20× 降速卡住，只证明受人为极慢 CPU 条件影响。
[CPU throttling 的准确性与局限](https://developer.chrome.com/blog/devtools-grounded-real-world)

`Memory.simulatePressureNotification` 的协议语义是向所有进程模拟发送通知。
它没有“将浏览器限制到 512MB”的参数；`forciblyPurgeJavaScriptMemory` 则模拟另一种
OOM intervention，更不能当作普通低内存模式。应在报告中明确压力是通知注入还是
实际资源不足。
[Memory 协议定义](https://raw.githubusercontent.com/ChromeDevTools/devtools-protocol/master/pdl/domains/Memory.pdl)

### 可用于现有 Playwright/CDP harness 的命令

下面只展示观测入口，动作、超时和写文件由测试 harness 负责。时长使用前后差值，
保留原始 metrics 名称和值；不同浏览器版本缺少字段时不要填成零。

```js
const cdp = await page.context().newCDPSession(page);
await cdp.send('Performance.enable', { timeDomain: 'timeTicks' });
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

const before = await cdp.send('Performance.getMetrics');
// 在这里执行一次固定的加载或用户交互，等待预先定义的完成条件。
const after = await cdp.send('Performance.getMetrics');
const dom = await cdp.send('Memory.getDOMCounters');
const heap = await cdp.send('Runtime.getHeapUsage');

await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
await cdp.detach();
```

`Performance` 支持 metrics 和时间口径，`Emulation` 支持 slowdown factor；
`Runtime.getHeapUsage` 的 used/total 是 V8 isolate 相关观测，不能当作整页 RSS。
命令失败或目标进程无响应时应记录失败本身，不能在页面内无限等待。
[Performance 协议](https://raw.githubusercontent.com/ChromeDevTools/devtools-protocol/master/pdl/domains/Performance.pdl)、
[Emulation 协议](https://raw.githubusercontent.com/ChromeDevTools/devtools-protocol/master/pdl/domains/Emulation.pdl)、
[JS/Runtime 协议](https://raw.githubusercontent.com/ChromeDevTools/devtools-protocol/master/pdl/js_protocol.pdl)

图层诊断可监听 `LayerTree.layerTreeDidChange` 后查询
`LayerTree.compositingReasons`，记录 layerId、backendNodeId、drawsContent、
尺寸、sticky 约束和原因。不要逐帧抓取完整 heap/DOM snapshot，以免测量本身
成为瓶颈。必要时另开 memory trace，通过 `Tracing.requestMemoryDump`
请求全局 dump；其 `deterministic: true` 会强制 GC，必须标注干预。
[LayerTree 协议](https://raw.githubusercontent.com/ChromeDevTools/devtools-protocol/master/pdl/domains/LayerTree.pdl)、
[Tracing 协议](https://raw.githubusercontent.com/ChromeDevTools/devtools-protocol/master/pdl/domains/Tracing.pdl)

Windows 观测至少同时保留：

- Chrome 任务管理器中的目标 renderer PID、memory footprint、JS memory，以及 GPU
  和 browser 进程；PID 用于关联系统采样。
- 系统可用 RAM、Committed/Limit、目标进程 private bytes/working set；
  卡顿区间的硬缺页与磁盘读取。
- `chrome://version` 和 `chrome://gpu` 的环境记录；Memory Saver/Energy Saver 状态。
- 自动化导航/输入开始、完成或超时；renderer crash、浏览器 disconnect/exit；
  页面是否恢复、浏览器外壳是否响应。

## 7. 基础优化与进阶优化的候选方向

下表是基于机制的候选，不代表本项目已确认存在这些缺陷。实施优先级应由
真实 trace 和一次只改变一项的对照实验决定。

| 层级 | 候选 | 最直接的验证信号 | 边界 |
| --- | --- | --- | --- |
| 基础：保留全部行 | 减少同一快照的重复转换、排序、深拷贝与不必要缓存 | Scripting/分配量下降；结果一致 | 缓存需有正确失效条件，不能积累全部历史快照 |
| 基础：保留全部行 | 对不可变大数据使用根级响应式，稳定子组件 props；拆开无关状态依赖 | dependency tracking、组件更新数量下降 | `shallowRef` 要求根替换；不能静默破坏现有深层修改语义 |
| 基础：保留全部行 | 精简高频单元格的重复组件、wrapper 和重复格式化 | 组件/节点/heap 与挂载时间下降 | 保持 slot、事件、样式和展示语义 |
| 基础：保留全部行 | 只在需要时构造详情内容，减少首屏派生对象 | 首屏分配和挂载时间下降 | 不改变用户点击后的数据完整性 |
| 基础：保留全部行 | 降低全表样式失效、重复布局读取和过量图层 | Style/Layout/Paint、图层与滚动延迟下降 | 不把关闭 sticky 当作已接受设计 |
| 基础的可选变体 | 分批建立全部行并让出主线程 | 最长任务下降、更早可交互 | 最终内存不降；可能增加重复布局和总耗时 |
| 进阶 | 行虚拟化，必要时再评估列虚拟化 | 常驻组件/DOM 随窗口大小而非总行数增长 | 需设计行高、列宽、sticky、搜索、定位、键盘/无障碍和打印 |
| 进阶 | 将纯转换/排序移到 Worker，传回必要结果 | 主线程脚本阻塞下降 | DOM 仍在主线程；复制/序列化可能增加峰值内存 |
| 进阶 | 更紧凑的数据模型、按需载入提交历史 | 数据与派生快照占用下降 | 涉及 API/回放/缓存契约，需跨项目设计 |

Vue 官方具体建议包括稳定 props、避免无效的新对象 computed、在大不可变数据上
降低深层响应式开销、减少大型列表中不必要的组件层次，以及列表虚拟化。
这些建议与全量榜单场景相关，但是否适用必须核对本项目的数据更新契约。
[Vue 性能指南](https://vuejs.org/guide/best-practices/performance.html)

### `content-visibility` 不是原生表格的通用一行修复

`content-visibility: auto` 可以跳过屏外子树的部分渲染工作，DOM 仍保留，
因此不同于虚拟化，也不能消除建立所有 Vue 组件的成本。占位尺寸、页面查找、
焦点和滚动定位需要一起验证；查询屏外子树布局的 API 还可能迫使浏览器执行
原本可以跳过的工作。
[content-visibility 官方说明](https://web.dev/articles/content-visibility)

CSS Containment 规范对 table/internal table boxes 存在明确限制：
size containment 不适用于内部 table box，layout/paint containment 也对其中
许多类型无效。不能未经测试就建议给每个 `<tr>` 添加 `content-visibility`
解决整表问题。若需要分块容器或改变 table 布局模型，应按结构性改造评估，
特别检查跨行列宽、表头、边框和辅助技术语义。
[CSS Containment Level 2](https://drafts.csswg.org/css-contain-2/)

## 8. 何时足以确认根因

建议将最终结论按强度区分：

1. **观测事实**：明确数据版本、构建、浏览器和机器配置，记录最长任务、
   DOM/组件量、内存和操作完成情况。
2. **定位证据**：trace 显示哪个函数/渲染阶段或系统资源等待主导停顿，
   并与用户可见症状时间对齐。
3. **因果对照**：移除一个因素或改一个实现后，相同条件的多次实验稳定改善，
   且展示与交互正确性不变。
4. **覆盖限制**：若没有复现 renderer/browser crash，应直接写“尚未复现崩溃”；
   即使已定位严重长任务，也不能把它替代为用户所说的浏览器整体卡死的确证。

因此，基础优化可以针对已量化的冗余先做；全量 DOM 的规模上限则需要通过
低配置环境确定。当省去冗余后仍无法满足交互和内存预算，才有足够依据决定
虚拟列表等结构改造的必要性与范围。
