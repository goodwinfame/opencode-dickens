---
description: 写下一章。自动确定章节序号，构建上下文，经过三轮审校。
agent: dickens
---

写小说的下一章。执行完整的 Dickens 工作流：

1. 用 `dickens_status` 确认当前进度
2. 从 `.writer-state.json` 确定下一章编号
3. 用 `dickens_context` 构建写作上下文
4. 读取弧段计划和角色档案
5. 调用 @weller 写作（注入完整上下文）
6. 调用 @jaggers 三轮审校（AI味→逻辑→文学性）
7. 审校通过后调用 @cratchit 记录摘要和状态
8. 保存检查点

项目路径：$ARGUMENTS
