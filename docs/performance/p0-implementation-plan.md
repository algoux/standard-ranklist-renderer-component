# P0 基础优化实施计划

日期：2026-10-20。依据本目录已完成的性能调查；本计划是后续实施阶段，历史调查文档与证据保留。

## 范围与约束

- 用户已授权修复生产构建、重复挂载和排名曲线计算，并要求 demo2.json 和 Windows VM 复测。
- 保留完整 2535 行渲染，不实施虚拟列表，不顺带做 P1 组件微优化或按需曲线改造。
- 不创建分支/工作树，不 commit、不推送、不发布包或部署。
- 修改 RankLand 与 utils 实际源码。当前依赖仍为 utils 0.3.4 时以持久化 pnpm patch 接入，避免只修改 node_modules 或依赖未发布版本。
- 保留 renderer 的 demo.json/demo2.json、CCPC26 文档；RankLand 的 loadtest/文档/迁移工具及 utils 原有文档均不动。

## 实施阶段

1. **已完成：回归与实现**。
   - 构建入口显式 production，增加能发现最终客户端 DEV runtime 的检查。
   - 保持 Ranklist 实例身份，保留 SSR 默认设置→客户端偏好应用、hydration reveal 和 Live CCPC26 时钟边界。
   - utils ICPC membership 使用索引；曲线逐分钟生成最终 points，释放历史 staticRows。
   - 以真实输入/输出与生命周期回归验证，不用计时阈值代替正确性测试。
2. **已完成：依赖和产品集成**。
   - 持久化库补丁，验证正常安装/构建能使用修复；不留绝对本机依赖。
   - 执行适当单元测试、客户端/SSR构建及榜单相关浏览器回归。
3. **已完成：性能复测**。
   - 新构建真实页面 + demo2，确认完整行数、文字/点击/曲线和无 DEV/旧表保留。
   - Mac 与 Windows 使用相同修复产物，明确版本、原始测量及基线可比边界。
   - Windows 保持 2 vCPU / 6 GiB，不改变 VM 配置；隔离浏览器、loopback 服务，收尾清理。
4. **已完成：审查与设计沉淀**。
   - 独立审查最终差异，修正发现后复验。
   - 保存设计、依赖补丁生命周期、测试结果和复测证据；报告剩余风险。

## 初始工作区状态

- renderer：demo.json 已修改；demo2.json、CCPC26 文档和本轮调查目录未跟踪。
- RankLand：loadtest 子模块脏；已有 docs、scripts/data-migrate 未跟踪。
- utils：docs/python-go-diagnostics-patch-sync.md 未跟踪。

## 验收要点

- 原始曲线完整输出与修复后一致；覆盖并列、非正式队伍、过滤榜列、空分钟、分段和最终不足整单位。
- SSR hydration 不替换默认表格；保存的设置仍在首屏 reveal 前生效；Live CCPC26 不泄露匿名题目。
- 正常 build:client 产物没有 Vue DEV runtime，客户端/SSR 使用一致构建模式。
- 依赖补丁可复现，源码修复与产物补丁语义一致。
- Windows 和 Mac 实测不再出现历史约 398k 节点/580 MiB 主堆的旧树保留，完整表格和曲线可用。

## 最终结果

- 真实源码已修复，普通 client/SSR/server 构建通过；两消费者冻结锁文件离线安装通过。
- utils 92项、RankLand 697项、renderer workspace 200项通过；21项环境测试原样跳过。浏览器41项中36项通过，5项既有失败在完整HEAD前端/Worker对照同值复现，另行记录。
- Mac三轮最大任务中位383ms、GC主heap约186MiB；Windows三轮904ms、185.67MiB，保留全部2535行且旧整表不再残留。
- 独立审查完成，已纠正测试fixture过滤位置；未发现剩余P0产品缺陷。
- 设计沉淀在RankLand docs/implementation/2026-10-20-ranklist-p0-performance.md；详见p0-implementation-report.md和p0-windows-validation.md。
- Mac/Windows自建测试进程、端口和临时数据库已清理；没有commit、发布或部署。

## utils 0.3.5 正式接入

用户发布0.3.5后，已完成两消费者及六个组件包依赖下限升级、删除过渡补丁、冻结安装和10条依赖路径验证；ESM/CJS与原P0补丁字节一致，897项消费者单元测试通过（另21项原环境测试跳过）。P1仅给出建议和理论估算，未实施；未commit或发布组件包。
