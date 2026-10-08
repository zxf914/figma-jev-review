# figma-jev-review

Codex 插件市场，包含两个互补的 Figma 插件：

| 插件 | 作用 | 依赖 |
|---|---|---|
| `figma-jev-review` | 用结构化证据评审 Figma 页面实现，并借助 Jev 做可重复的质量评分循环 | Node.js >= 20、Jev API Key |
| `figma-implementation-prompt` | 分析 Figma 节点与目标项目，生成有依据、可验收的页面实现提示词（纯文本 Skill，无 MCP） | 无 |

两个插件各自独立安装，也可以只装其中一个。

## 安装

前置条件：Node.js >= 20。只有 `figma-jev-review` 需要 Jev API Key。

```powershell
codex plugin marketplace add zxf914/figma-jev-review

# 评审插件（MCP + Skill）
codex plugin add figma-jev-review@figma-jev-review
setx JEV_API_KEY "你的 Jev API Key"

# 提示词插件（纯 Skill，可选）
codex plugin add figma-implementation-prompt@figma-jev-review
```

重启终端与 Codex，新建任务后即可使用。

也可以克隆后注册本地路径：

```powershell
git clone https://github.com/zxf914/figma-jev-review.git
codex plugin marketplace add "<克隆目录的绝对路径>"
codex plugin add figma-implementation-prompt@figma-jev-review
```

## 仓库结构

```
.agents/plugins/marketplace.json          # marketplace 清单
plugins/figma-jev-review/
  .codex-plugin/plugin.json               # 插件清单
  .mcp.json                               # MCP 服务定义
  dist/server.js                          # 已构建、可独立运行的 MCP 服务
  skills/figma-jev-review/                # Agent Skill 与参考文档
  src/ test/ build.mjs                    # 源码、测试、构建脚本
plugins/figma-implementation-prompt/
  .codex-plugin/plugin.json
  skills/figma-implementation-prompt/
    SKILL.md
    agents/openai.yaml
    references/                           # 表格、地图、资源、动效、输出模板等参考
```

## 从源码构建 figma-jev-review

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