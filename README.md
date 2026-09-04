# next-a2ui

Next generative UI —— 用 Next.js 渲染 [A2UI](https://a2ui.org/)（Agent-to-UI）生成式界面。

Agent 输出声明式 UI JSON，前端按协议流式渲染成原生组件，而不是把模型吐出的 HTML 直接塞进页面。

## 这个项目要做什么

- 用 Next.js（App Router）承载 A2UI renderer
- 消费 A2UI 消息流：`createSurface` / `updateComponents` / `updateDataModel` / `deleteSurface`
- 把 catalog 中的组件映射到 React 组件
- 把用户交互回传给 agent

## 现状

仓库刚完成初始化，应用代码尚未落地。

## 参考

- [A2UI Protocol](https://a2ui.org/specification/v1.0-a2ui/)
- [@a2ui/react](https://www.npmjs.com/package/@a2ui/react)
- [Renderer Development](https://a2ui.org/guides/renderer-development/)

## License

MIT
