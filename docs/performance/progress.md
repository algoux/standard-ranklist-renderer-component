# 调查进度

## 2026-10-20

- 完成仓库状态与数据规模检查，读取诊断、调研、浏览器测试和文件计划技能。
- 并行分派 Chromium 机制调研和 RankLand 接入路径审计；主会话负责可重复性能实验。
- 现有未提交变更为 demo.json、demo2.json 和三份 CCPC26 文档；未改动。
- 完成有效组件 production baseline，6x CPU slowdown 已复现首次和交互秒级阻塞；正在进行行数/deep/raw/trace顺序对照。
- 测试构建问题：Vite2 top-level-await target，macOS /tmp realpath，semver循环依赖；改为esnext + /private/tmp + sibling Vite4，未改产品配置。
- 全网卡测试服务被自动审批拒绝（LAN暴露）；已采用获批127.0.0.1服务。VM用guest loopback服务，避免LAN监听。
- 已完成raw/deep、100/500/2535行、6x CPU和Chromium trace对照。deep+6x首次15.4s，替换数据18.6s；它是深响应式消费方式风险，RankLand已使用shallowRef，不能直接当RankLand根因。
- Trace首屏Layout约149ms、UpdateLayoutTree约49ms；样本含测试末尾强制GC，GC总时长不可当自然GC耗时。Layers事件未提供有效树，未据此推断GPU层数。
- Windows 2 vCPU/6GiB真实环境纯组件基线已完成：100行约472ms首帧，全表1559ms，无崩溃/换页；继续观察真实RankLand稳定态。
- 三个单变量组件实验副本已准备并生产构建：shared-status-body、lazy-slot-props、lazy-solutions，均只位于临时目录。
- 完成原始/固定key/空worker真实线上浏览器对照，已确认旧表detached保留及稳定key收益。
- 全量heap snapshot采集导致诊断renderer退出（采集期RSS约11.3GiB），已清理，仅记录工具开销失败。正在准备100行SSR等价副本的较小快照。
- Windows压力测试已开始，最多1GiB内存/1核/120s，设90%commit与256MiB available保护退出，不追求系统OOM。
- 综合报告初稿已写入README.md，组件实验/压力结果/构建模式核查继续补充。

- 最终确认：vite-ssr预解析污染NODE_ENV，使线上包含Vue DEV；100行heap及完整2535行DOM探针均证实Fragment Comment.__vnode强持有已unmount旧表。
- 显式production整页临时构建+稳定key：最长任务425ms（复测424ms）、GC主heap约189MiB；原版约2142ms/580MiB。所有原SSR body/state不变，首屏像素相同，全表文字SHA一致，队伍详情/曲线交互通过。
- 组件4种单变量各3轮及baseline3轮完成；内联StatusBody约省21.5MiB，首帧收益有限。相同无trace条件的特效禁用对照无实质收益。
- Windows fresh正常最大任务4398ms；1GiB+单核压力最大任务4200ms，commit90.24%触发守卫自动释放，没有自然崩溃，不能宣称压力使耗时增加。
- 原始证据汇总为evidence/browser-experiments.json（36组浏览器记录，排除无效构建和heap snapshot诊断），另有9轮算法与Windows证据。
- 全量snapshot失败已隔离记录；100行snapshot成功（137MiB，保留临时目录），不将诊断峰值计入正常页面资源。
- 最终核验：JSON可解析、内部文件链接可定位、文档数字交叉核对；Mac/Windows自建进程和监听完成清理，用户既有修改保留。

## 后续 P0 实施

- 用户随后授权落实P0、保留全量渲染、禁止commit。独立计划与报告见p0-implementation-plan.md / p0-implementation-report.md。
- 三项源修复与持久化utils 0.3.4补丁已集成；正常生产构建、回归、HEAD旧失败对照、Mac/Windows三轮复测完成。
- 已保存源/产物/数据指纹、曲线完整输出hash和Windows连续采样，所有自建资源清理完成。
