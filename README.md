# translate-pot

一款面向英文论文阅读的 Windows 桌面划词翻译工具。打开本地 PDF，划选单词、一行或一段文字，即可在选区旁查看 DeepSeek 返回的中文译文。

## 功能

- 使用 PDF.js 打开本地 PDF，支持翻页、缩放和适应宽度。
- 基于 PDF 真实文字层读取选区，支持单词、一行和段落。
- 划选后自动调用 DeepSeek，并流式显示译文。
- 译文浮窗支持复制、重新翻译和关闭。
- 支持 `Alt+T` 主动翻译当前选区。
- 支持点击按钮或直接拖入 PDF。
- 使用 Electron `safeStorage` 加密保存 DeepSeek API Key。
- 翻译请求只由 Electron 主进程发出，并且只发送当前选中的文本。

## 开发环境

- Windows 10/11
- Node.js 20+
- npm

```bash
npm install
npm run dev
```

启动应用后，在右上角设置中填写 DeepSeek API Key。默认配置：

```text
Base URL: https://api.deepseek.com
Model: deepseek-chat
```

## 构建与测试

```bash
npm run typecheck
npm test
npm run build
npm run package
```

Windows 安装包会生成在 `release/PaperLens Setup 0.1.0.exe`。

## 当前限制

- 只支持带文字层的 PDF；扫描版 PDF 暂不支持 OCR。
- 当前采用单页阅读。
- 公式和特殊符号的提取质量取决于 PDF 自身的文字层。
- Windows 安装包暂未配置代码签名。

## 技术栈

- Electron
- React
- TypeScript
- PDF.js
- DeepSeek Chat Completions API

## 安全说明

- API Key 不会写入渲染进程的持久化存储。
- API Key 不写入日志或翻译请求之外的文件。
- 应用只将用户主动划选的文本发送给 DeepSeek。
- 不默认收集遥测数据。

更完整的设计说明见：

- [PDF划词翻译应用方案.md](./PDF划词翻译应用方案.md)
- [MVP技术实现方案.md](./MVP技术实现方案.md)
