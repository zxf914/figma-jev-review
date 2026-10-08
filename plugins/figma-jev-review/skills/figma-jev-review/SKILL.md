---
name: figma-jev-review
description: Use when a Web or App implementation derived from a Figma node needs evidence-based visual, interaction, asset, responsive, and code-quality review through the figma_jev_review MCP tool, including baseline and follow-up comparisons.
---

# Figma Jev Review

使用 `figma_jev_review` 评估已经形成可运行版本的 Figma 页面实现。该工具不能打开 Figma 或读取仓库，但会读取调用时提供的参考 PNG 与实现 PNG 的绝对路径，并执行确定性像素比较。

## 工作流

1. 读取实现提示词、Figma 事实、项目约束和验收项。缺少这些依据时先补充取证，不能让 Jev 猜测设计要求。
2. 在规定视口和状态运行页面，保存与 Figma 节点同尺寸的参考 PNG 和实现 PNG，采集 DOM 测量、控制台错误、相关测试和资源引用证据。
3. 按 `references/evidence-contract.md` 组装输入。视觉运行必须提供插件进程可读取的绝对路径，并写出至少 3 个实际观察到的偏差。
4. 将视觉验收拆为页头、指标区、面板、地图、关系图、表格、流程和资源等可定位检查，禁止只提交一个笼统的 `VIS-001`。
5. 本地验证完成后调用 `figma_jev_review` 建立基线。失败或未知的 `blocking` 检查始终阻塞交付，未知的 `required` 检查会降为 `needs_work`。
6. 检查最低且重要的指标，回到代码、Figma 事实和验证结果中确定原因。Jev 只提供分数和粗粒度弱项，Agent 负责诊断。
7. 做最小且有依据的修改，重新执行受影响的测试和视觉检查，再携带上一次完整结果作为 `previousEvaluation` 复评。
8. 按 `references/review-loop.md` 的停止条件结束，不能为追分增加需求外行为、无用抽象或形式化测试。

Jev 分数不能代替浏览器验证、视觉比较或用户要求。任何视觉、资源或交互结论都必须能够追溯到明确证据。视觉还原度置信度低于 `0.8`，或存在视觉事实却被判为不适用时，不得交付。
