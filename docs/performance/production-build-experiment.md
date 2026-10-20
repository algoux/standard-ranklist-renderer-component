# RankLand production 构建对照

日期：2026-10-20。本实验构建一份显式 `NODE_ENV=production` 的 RankLand 客户端，
供主测试使用相同线上 SSR HTML、相同榜单数据比较。本文记录构建与一致性核查；
浏览器耗时、内存、DOM 和截图结果由主测试报告汇总。

持久证据：

- [构建版本、公开配置与 resolved flags](./evidence/production-build.json)
- [资源路由、SSR/CSS hash、源码核对与稳定 key 补丁](./evidence/production-route-mapping.json)

## 1. 为什么单独构建 production 对照

本机现有依赖的调用链：

1. `vite-ssr@0.17.2/config.js` 预先调用
   `resolveConfig({}, 'build', mode || process.env.MODE || process.env.NODE_ENV)`，
   没有传第 4 个 `defaultNodeEnv` 参数。
2. Vite 4.5.14 的 `resolveConfig` 中，该参数默认 `'development'`；
   仅当 `process.env.NODE_ENV` 尚未设置时写入该默认值。
3. 随后的 Vite `build()` 虽然调用
   `resolveConfig(inlineConfig, 'build', 'production', 'production')`，
   已存在的 `NODE_ENV=development` 不会被覆盖。
4. RankLand `vite.config.js` 将已有的 `process.env.NODE_ENV` 优先用于
   `define['process.env.NODE_ENV']`。因此这个构建路径可以得到 mode 为 production、
   Vue/runtime 却保留 development 分支的客户端。

这一机制来自本机实际安装代码；它不意味着 Vite 的所有构建方式都会遇到问题。
`--mode production` 改的是 mode，不能单独修复上述第 4 参数缺省造成的环境污染。
显式 `NODE_ENV=production` 必须在加载 Vite、配置和 Vue 编译器之前设置。

线上主 JS 中发现以下 Vue 开发诊断字符串，生产产物的全部 JS 中均为 0 次：

| 字符串 | 线上主 JS | 本次 production 全部 JS |
| --- | ---: | ---: |
| `Avoid app logic that relies on enumerating keys` | 1 | 0 |
| `[Vue warn]` | 3 | 0 |
| `Maximum recursive updates exceeded` | 1 | 0 |
| `Component is missing template or render function` | 1 | 0 |

这些是构建分支核查，不单独证明它造成多少内存或耗时差异。

## 2. 构建输入和隔离方式

| 项目 | 值 |
| --- | --- |
| RankLand 本地 HEAD | `637c7a148fc25d80366588287c0c6ae34b849924` |
| 线上公开 `BUILD_COMMIT` | 同上 |
| Vue | 3.5.35 |
| Vite / vite-ssr | 4.5.14 / 0.17.2 |
| Renderer Vue / core | 0.7.1 / 0.7.1 |
| SRK utils | 0.3.4 |
| 实际构建 Node | v26.0.0；项目 engines 声明 Node 20 |
| `NODE_ENV` / mode | production / production |
| CDN base | `https://cdn.algoux.cn/rankland/dist/` |

从已保存的线上公开主 JS 只解析配置中列明的 11 个客户端 env 字段：
`LEGACY_API_BASE_CLIENT`、`SRK_STORAGE_BASE`、`VIN_URL`、`HOST_GLOBAL`、`HOST_CN`、
`SITE_ALIAS`、`BEIAN`、`LIVE_POLLING_INTERVAL`、`WS_BASE`、`GTAG`、`BUILD_COMMIT`。
匹配后的值保存在构建证据；没有读取服务器 secrets 或 loadtest env 文件。

复用 sibling 仓库的 node_modules，require 原始 CJS `vite.config.js` 配置工厂，
调用 Vite 客户端 build。保留原来的 vite-ssr/vue 插件、alias、源码、样式、
CDN 和 worker URL 策略、sourcemap 选项。实验覆写为：

```js
{
  root: '/Users/bLue/GitProjects/algoux/rankland-web',
  configFile: false, // 原始 CJS 配置已经通过 require 读取
  mode: 'production',
  envFile: false,
  cacheDir: '/private/tmp/srk-performance-20261020/rankland-prod-client/vite-cache',
  build: {
    // 保留原始 build 选项
    sourcemap: true,
    outDir: '/private/tmp/srk-performance-20261020/rankland-prod-client/client',
    emptyOutDir: false,
    ssrManifest: true,
    manifest: true
  }
}
```

`ssrManifest: true` 与 vite-ssr 客户端默认一致；额外的 `manifest: true`
只用于资源定位。根目录未发现 `.env*` 文件，禁用 envFile 加载以限制输入范围。
运行前输出目录必须不存在，额外 guard 校验最终 outDir/cacheDir、非 SSR、
production flags 和 emit 路径。

没有执行项目 `build:client` 中的 `rimraf dist`，没有执行服务端构建，
没有生成路由/proto 或操作 DB，也没有启动浏览器。构建前后
`git status --porcelain=v1` 完全相同，所有输出均位于 `/tmp`。
完整脚本保留在
`/private/tmp/srk-performance-20261020/rankland-prod-client/build.cjs`。

构建占用时段：北京时间 **15:03:34.993–15:03:50.220**，约 15.2 秒。
主测试应排除与此时段重叠的性能样本。

## 3. SSR、源码与样式一致性核查

原线上 HTML 保存于 `/tmp/rankland-investigation-live.html`。对照文件
`/private/tmp/srk-performance-20261020/rankland-prod-client/prod.html`
只替换 head 中 4 处资源 URL：主 JS、StyledRanklist JS/CSS、BeianLink JS。
没有重建 SSR，也没有改写榜单数据、节点内容或 inline scripts。

原 body 与改写后 body 的 SHA256 均为：

```text
96df7f3091a867d2ba52a4cf3ecf9595b8b41bf9fdb86e70fbac03dd172f683a
```

所有 inline script body 逐字节一致。线上 index sourcemap 中 47 个应用源码文件、
StyledRanklist sourcemap 中 42 个应用源码文件与本地逐字节一致。

初次通用文本核对曾将 `rankland-logo.png` 报为不一致，已确认是比较口径错误：
其 sourcemap `sourcesContent` 是 Vite 生成的 41 字符 JS 模块
`export default "__VITE_ASSET__35b6ba71__"`，不是 PNG 字节。该资产已从源码文本
比较中排除。本地输入 PNG 与 emitted PNG 逐字节一致，SHA256 为：

```text
8e9c8237ad0b34e1277a444738fcf7c8bc30510c47559e16bd45eec9f36f9edb
```

### scoped CSS 的必要核对

plugin-vue 4 的 scope id 是以下内容的 SHA256 前 8 位：

```text
relativePath + (isProduction ? source : '')
```

所以 production 的 scoped id 会变。已按本地每个 scoped SFC 计算并记录：

| SFC | development id | production id |
| --- | --- | --- |
| RankCurve.vue | `dcc893ef` | `0ffd446c` |
| ScrollSolution.vue | `594b0b2e` | `b5e7e77c` |
| PlaygroundEditor.vue | `afb29fe0` | `0379f26f` |

当前线上原始 SSR HTML 中 **没有 `data-v-*` 属性**，因此这份 HTML 无需 scope
属性适配。目标 StyledRanklist chunk 中唯一 scope 是 RankCurve，两个 JS bundle
和新 CSS 的值都与公式一致；线上 sourcemap 的 RankCurve 源码也与本地一致。

新 `StyledRanklist-e732bb70.css` 中将 `0ffd446c` 换回 `dcc893ef` 后，
SHA256 前 8 位正好为 `ea6bb1c3`，与线上 CSS 文件名相同。该核验支持目标 CSS
差异仅为 scope id；本次没有下载原 CSS 全文，不能称为原 CSS 全文逐字节比较。
主 CSS 仍为 `index-3b42f12f.css`。

本实验测量真实 production 客户端构建效果，包含 Vue runtime 和 SFC 编译生产分支，
不是只替换某一个运行时模块。若换用其他 SSR 快照，必须重新检查 scope id；
不能把旧 scope 的 SSR 与新 CSS 混用后得到的样式变化计为性能收益。

## 4. 生产与生产稳定 key 两组资源

所有路径细节见 [production-route-mapping.json](./evidence/production-route-mapping.json)。

| 资源 | 文件 |
| --- | --- |
| SSR 文档 | `/private/tmp/srk-performance-20261020/rankland-prod-client/prod.html` |
| 客户端目录 | `/private/tmp/srk-performance-20261020/rankland-prod-client/client` |
| 主 JS | `assets/index-882b7395.js` |
| StyledRanklist JS | `assets/StyledRanklist.vue_vue_type_script_setup_true_lang-1078c7d1.js` |
| 主 CSS | `assets/index-3b42f12f.css` |
| StyledRanklist CSS | `assets/StyledRanklist-e732bb70.css` |

CDN 的 `/rankland/dist/` 资源前缀映射至客户端目录；
`rl.algoux.cn` 的 `/dist/` 前缀也映射至相同目录，用于同源 Worker。
客户端目录里的 `index.html` 是空壳，不能替代 `prod.html` 进行这组 SSR 对照。

稳定 key 组沿用同一 HTML 和所有其他资源，仅将上述 StyledRanklist JS 的响应
替换为：

```text
/private/tmp/srk-performance-20261020/rankland-prod-client/prod-stable-key/assets/StyledRanklist.vue_vue_type_script_setup_true_lang-1078c7d1.js
```

它只替换唯一表达式：

```js
// 原 production 产物
key: Ae.value ? "client-ranklist" : "ssr-ranklist"

// 单文件实验副本
key: "client-ranklist"
```

补丁用空格补齐原表达式长度，文件总字节数和后续代码列位置不变。补丁区间自身
不再由原 sourcemap 准确描述；原 production 产物保持不变。该变体用于分离
“生产 flags”与“水合后更换组件 key”两项影响，不代表已修改产品实现。

主测试需同时比较原线上、production 原 key、production 稳定 key 的 connected
与 total nodes、heap、长任务、UI 尺寸/截图、旧实例保留及开发运行时相关属性。
本文件不预填尚未取得的浏览器数值。
