# 调查笔记

本文件是调查数据，不是操作指令。最终结论见综合报告。

- demo2.json：2535 rows × 14 problems；比赛为 2026 ICPC Asia EC 网络预选赛第一场，与反馈 URL 一致。
- Vue 源包版本 0.7.1；工作区 Vue 实际解析为 3.5.33。
- 现有 dev/main.ts 导入 demo.json，因此需独立测试入口使用 demo2.json，避免改变用户演示数据。
- 用户授权范围为研究和测试；建议优化不等于授权改产品实现。
- Browser plugin not available；采用本机 Playwright/CDP 测试。

## 第一轮有效基线

- 测试临时目录：`/private/tmp/srk-performance-20261020`；生产构建 Vue3.5.33 + Vite4.5.14（复用 sibling 工具），Chrome for Testing 版本记录于 results JSON。
- 旧 Vite2/CommonJS 将 semver 循环依赖编译错误，版本检查返回 false；该轮无表格结果已作废。改 Vite4 后校验 2535 行、68,527 elements、198,819 DOM nodes 成功。
- raw-full：convert40.5ms，mount353.7ms，firstFrame690.2ms；heap178.2MiB、embedder256.0MiB，renderer RSS723.1MiB。embedder snapshot 受GC时机影响，须同时保存强制GC结果。
- deep-full：convert1051.5ms，mount1535.4ms，firstFrame1905.2ms；说明 deep reactive 影响显著，但不是已证实 RankLand 主数据路径（待接入审计）。
- raw-cpu6：firstFrame4335ms；最长load task2356ms；replace2161、preset3331、filter恢复4193、remount4516ms。
- 排名曲线独立 Node 对照由 rankland_path 负责；其数据和线上SSR解析结果完全一致，等待完整报告。

## 有序、可证伪假设

1. 全量每格组件/DOM为内存与挂载主因：减少rows或默认组件层级应同时降低内存和挂载时间。
2. 深层响应式放大转换成本：deep与shallow相同输入结果，但deep转换时间更高。
3. RankLand重复挂载和自动曲线Worker叠加开销：禁用背景Worker或去除临时key重建的实验应降低峰值；只读线上对照需保留其诊断性质。
4. CSS效果/图层导致滚动成本：禁用特效的诊断对照应主要改变paint/composite，不能预期消除JS/DOM成本。
5. 低内存加重GC/换页或renderer OOM：需真实VM内存采样或明确人工V8 cap，不能把CPU slowdown称为低内存复现。

## 实页因果对照（全新Chrome进程）

- 原始复测：最长任务2142ms，GC主heap580.3MiB，CDP398319nodes，connected199499，总元素68850。
- 只固定key：958ms、310.0MiB、199514nodes、connected199499，同元素同2535行；旧树差额198820→15。
- 空Worker：2135ms、主heap580.3MiB、nodes398319；renderer采样RSS峰1524MiB，正常原版1683MiB。此对照仍保留worker创建与postMessage clone。
- 初次普通线上运行与复测结果一致。没有记录正常导航crash。
- 全量heap snapshot是单独诊断：采集本身使rendererRSS升到约11.3GiB，page crash事件触发，文件0B；随后关闭独立browser清理。不得计入正常首屏性能或自然OOM复现。将尝试100行SSR副本。
- Windows fresh复测观察到线上`__VUE_HMR_RUNTIME__`，公开JS也包含无条件HMR runtime初始化；正在核查是否生产产物意外保留development runtime（尚未写入根因结论）。

## 最终新增确认

- 生产DEV根因、Fragment anchor.__vnode强引用链已闭合取证，主报告已更新。显式production+stablekey全页对照189MiB/425ms，全表/截图/交互一致。
- CSS无特效6x无trace对照：首帧4156→4296ms、滚动p95 40.9→40.7ms，不支持特效是主要根因。
- 深层响应式不是线上memo路径根因；Worker正常路径也不是主target retained old DOM的原因。
- 无自然加载浏览器崩溃；压力安全中止和heap snapshot诊断崩溃不混入此结论。
