---
name: figma-implementation-prompt
description: Use when a node-specific Figma prototype must be analyzed against an existing Web or App project to produce a detailed implementation specification or coding prompt instead of immediate page code.
---

# Figma 实现提示词

## 目标

读取 Figma 与目标项目，生成有证据、可执行、可验收的页面实现提示词。Figma 没画且项目没有规范的关键样式或交互必须询问，不能用常见做法补齐。

## 工作流

1. 确认 URL 是 `/design/` 链接且包含 `node-id`；解析 `fileKey` 和规范化后的 `nodeId`。
2. **REQUIRED SUB-SKILL:** 加载 `figma-design-to-code`，先调用 `get_design_context`。节点过大时调用 `get_metadata`，按表格、筛选、分页、地图、弹窗、侧栏、图表、面板等语义子层继续读取。截图判断视觉与遮挡，节点属性提供精确值。
3. 动效存在或用户描述动效时加载 `figma-implement-motion`。`get_motion_context` 为空表示 Figma 没有可读取时间轴；不得补造持续时间、缓动或关键帧。
4. 扫描当前项目的框架、样式、组件、相似页面、地图、图表、字体、资源目录、数据层和适配规范。只引用真实存在的路径。
5. 按顺序取证：Figma 明确内容 → 项目同类实现 → 用户已确认内容 → 项目组件库或平台规范 → 询问用户。
6. 按页面特征读取参考文件：
   - 表格、筛选、分页、CRUD：`references/table-pages.md`
   - 地图、点位、地图弹窗：`references/map-pages.md`
   - 页面含任何图片、插画、图标、纹理、复杂矢量、遮罩或其他非文本视觉资源：必须读取 `references/complex-assets.md`
   - 轮播、定时切换、跨区域联动：`references/linked-motion.md`
   - Web 或 App：`references/web-and-app.md`
7. 发现缺失样式、超量数据、长文本或交互歧义时读取 `references/uncertainty-rules.md`。
8. 写文件前读取 `references/output-template.md`。
9. 当前环境提供 `figma_jev_review`，或用户明确要求使用 Figma Jev Review 时，读取 `references/jev-handoff.md`，在实现提示词中增加结构化验收契约和评审交接要求。Jev 评审不能替代截图、DOM 测量、浏览器交互和控制台检查。

## 输出门禁

- 无阻塞项：写入 `docs/figma-prompts/<页面名称>.md`。
- 有阻塞项：只写入 `docs/figma-prompts/<页面名称>.draft.md`，集中询问用户；回答后生成正式文件并移除对应草稿。
- 不得把未经确认的假设包装成“工程默认值”写进正式文件。
- 资源清单中的每个 Figma 视觉资源必须写明原始来源、获取动作和本地路径。除非项目已有视觉一致的资源或用户明确授权代码重绘，提示词必须要求实现者先导出或下载原资源，再从本地文件引用；不得用手写 SVG、CSS、Canvas 或近似图标替代。
- 下载原资源不等于完成还原。提示词还必须逐层记录资源节点及其父级的透明度、填充透明度、混合模式、滤镜、效果、裁切、缩放、偏移、圆角、遮罩和层级；实现阶段按图层属性合成，不能把原图不带样式地直接铺上去。
- 无法取得原资源且项目没有可复用资源时，属于阻塞项，只能生成草稿并询问用户。
- 不覆盖无关同名文件；必要时添加节点 ID。
- 使用 UTF-8 无 BOM，中文直接写入。
- 启用 Figma Jev Review 时，每个验收项必须有稳定 ID、严重程度、可观察要求和验证方法；实现阶段再记录状态和实际证据。失败或未知的 `blocking` 项不能被 Jev 分数覆盖。

本 Skill 只生成提示词，不实现页面、不修改 Figma，也不执行 Git 提交或发布操作。Skill 本身不下载资源；它生成的提示词必须明确要求页面实现阶段把 Figma 原资源导出或下载到项目本地。
