# figma-jev-review

Codex 插件：用结构化证据评审 Figma 页面实现，并借助 Jev 做可重复的质量评分循环。

## 安装

前置条件：Node.js >= 20，以及你自己的 Jev API Key。

```powershell
codex plugin marketplace add zxf914/figma-jev-review
codex plugin add figma-jev-review@figma-jev-review
setx JEV_API_KEY "你的 Jev API Key"
```

重启终端与 Codex，新建任务后即可使用 `figma_jev_review` 工具和 `figma-jev-review` Skill。

也可以克隆后注册本地路径：

```powershell
git clone https://github.com/zxf914/figma-jev-review.git
codex plugin marketplace add "<克隆目录的绝对路径>"
codex plugin add figma-jev-review@figma-jev-review
```

## 仓库结构

```
.agents/plugins/marketplace.json       # marketplace 清单
plugins/figma-jev-review/
  .codex-plugin/plugin.json            # 插件清单
  .mcp.json                            # MCP 服务定义
  dist/server.js                       # 已构建、可独立运行的 MCP 服务
  skills/figma-jev-review/             # Agent Skill 与参考文档
  src/                                 # TypeScript 源码
  test/                                # 测试
  build.mjs                            # 构建脚本
```

## 从源码构建

```powershell
cd plugins/figma-jev-review
npm install
npm run build      # 生成 dist/server.js
```

构建脚本会在 bundle 顶部注入 `createRequire(import.meta.url)`，让被打包成 ESM 的
CommonJS 依赖（pngjs）能够通过 `require()` 加载 Node 内置模块。缺少这个 shim 时，
服务启动即抛 `Error: Dynamic require of "util" is not supported` 并退出。

## 安全

不要提交或分享真实的 `JEV_API_KEY`；每位使用者配置自己的密钥。