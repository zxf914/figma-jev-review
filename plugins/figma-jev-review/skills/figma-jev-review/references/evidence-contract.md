# 证据契约

## Figma 事实

每项事实包含稳定 ID、类别、明确要求和来源。类别只使用：`layout`、`typography`、`asset`、`interaction`、`responsive`。

## 验收检查

每项检查包含：

- `id`：稳定且唯一，例如 `VIS-001`。
- `severity`：`blocking`、`required` 或 `scored`。
- `requirement`：可以观察或测量的通过条件。
- `status`：`passed`、`failed` 或 `unknown`。
- `evidenceKind`：证据来源，只能使用 `claim`、`source-inspection`、`dom-measurement`、`browser-interaction`、`automated-test` 或 `visual-comparison`。
- `evidence`：实际结果、测量值、文件路径或失败说明。

影响核心视觉、资源来源、页面可运行性或明确业务行为的检查使用 `blocking`。重要但不使整体结果无效的检查使用 `required`。允许按程度判断的质量项使用 `scored`。`claim` 只表示调用者主张，不能让视觉检查通过。视觉检查必须使用 `visual-comparison`，并提供成功读取的图片对。

不要把整页视觉一致性压缩成一个检查。按实际页面至少拆分为页头、指标区、内容面板、地图、关系图、表格、流程、资源等可独立定位的验收项。

## 视觉运行

每个规定视口和关键状态单独记录：

- 视口或设备。
- 页面状态和到达该状态的操作。
- `referenceScreenshotPath`：同一视口下参考 PNG 的绝对路径。
- `screenshotPath`：实现 PNG 的绝对路径。
- `maxChangedPixelRatio`：允许的变化像素比例，默认 `0.2`。
- `dynamicMasks`：可选动态区域矩形遮罩。
- 与 Figma 的实际比较结论，至少写出 3 个可观察偏差；没有偏差时写出实际核对的区域和测量值。
- DOM 测量、溢出和遮挡结果。
- 控制台错误。

插件会读取 PNG 并输出尺寸、RGB MAE、变化像素比例和遮罩像素数。图片缺失、无法解析、尺寸不同或差异超过阈值时，视觉通过状态会被覆盖。像素指标用于阻止明显误判，不能代替对结构、字体、资源和交互的人工诊断。

## 代码上下文

优先提供当前差异。只有理解行为确实需要周边代码时才附完整相关文件。不得发送密钥、环境文件、私钥、生成目录、依赖目录或无关仓库内容。
