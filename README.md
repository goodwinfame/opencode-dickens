# Dickens

> 以连载小说之王查尔斯·狄更斯命名。正如狄更斯以章节连载的方式创作了《双城记》《远大前程》等不朽名著，Dickens 以章节为单位、多 Agent 协作的方式自动生成长篇小说。

**opencode-dickens** — 基于 [OpenCode](https://github.com/anomalyco/opencode) 的长篇小说写作 Agent 系统，支持生成 50 万字以上的高质量长篇小说。

## 特性

- **50万字+长篇写作**：分层摘要系统突破上下文窗口限制
- **6个专业 Agent 协作**：每个 Agent 使用最适合其任务的独立模型和温度
- **六阶段工作流**：灵感碰撞 → 世界与角色设计 → 结构设计 → 章节创作 → 三轮审校 → 记录归档
- **去 AI 味**：跨模型族审校策略（Claude 写 → Gemini 审），配合知识库指南
- **人物先行**：传记法 + 心理画像 + 非功能性特征，拒绝模板化角色
- **增量归档**：每轮产出即时持久化，版本化存档，会话中断不丢失
- **会话恢复**：`/resume` 命令自动重建上下文，重启后无缝继续
- **一致性追踪**：角色状态、情节线索、伏笔链、时间线全程追踪

## Agent 团队

```
用户 ──→ Dickens (总指挥)
              ├── Micawber (米考伯) ── 创意脑暴，发散 → 聚焦 → 结晶
              ├── Wemmick (威米克) ── 世界/角色/结构设计，整体审查
              ├── Weller  (维勒)   ── 章节写作，Anti-AI 自检
              ├── Jaggers (贾格斯) ── 三轮审校：AI味/逻辑/文学性
              └── Cratchit (克拉奇特) ── 摘要、状态追踪、伏笔管理
```

| Agent | 模型 | 角色 |
|-------|------|------|
| Dickens | `github-copilot/claude-sonnet-4.6` | 总指挥，编排六阶段流程 |
| Micawber | `github-copilot/claude-opus-4.6` | 创意引擎，脑暴概念方案 |
| Wemmick | `github-copilot/claude-sonnet-4.6` | 世界建筑师，角色/结构设计 |
| Weller | `github-copilot/claude-opus-4.6` | 写作匠人，生成章节正文 |
| Jaggers | `github-copilot/gemini-3.1-pro` | 质量守门人，跨模型族审校 |
| Cratchit | `github-copilot/claude-haiku-4.5` | 编年史官，上下文管理 |

## 安装

将本项目的 Agent 和知识库部署到 OpenCode 全局配置目录：

```
~/.config/opencode/
├── opencode.json          # Agent 定义和模型配置
├── agents/                # 6 个 Agent 提示词
├── commands/              # 5 个命令
└── knowledge-base/        # 5 个写作知识库
```

确保已配置 GitHub Copilot 认证（OpenCode 中运行 `/connect`）。

## 快速开始

### 1. 启动创作

```
/start-novel
```

Dickens 调用 Micawber 进行创意脑暴，生成 3-5 个差异化概念方案，通过 What-if 推演聚焦，最终产出创意简报。

### 2. 恢复项目

```
/resume
```

重新打开已有项目时，自动读取所有已保存的设定、大纲、角色、摘要，重建完整上下文。

### 3. 写下一章

```
/write-next
```

完整流程：构建上下文 → Weller 写作 → Jaggers 三轮审校 → Cratchit 归档。

### 4. 连续写作

```
/write-loop --chapters 10
```

连续写 10 章，每章自动经过写作-审校-归档流程。弧段边界自动暂停审核。

### 5. 查看进度

```
/novel-status
```

## 六阶段工作流

```
Phase 1: 灵感碰撞        Micawber 脑暴 → 概念方案 → 创意简报
    ↓
Phase 2: 世界与角色设计    Wemmick 设计 → 人物先行 → 整体审查
    ↓
Phase 3: 结构设计         Wemmick 规划 → 弧段/爆点/伏笔链
    ↓
Phase 4: 章节创作         Weller 写作 → Anti-AI 自检
    ↓
Phase 5: 三轮审校         Jaggers 审校 → AI味/逻辑/文学性
    ↓
Phase 6: 记录归档         Cratchit 摘要 → 状态追踪 → 伏笔管理
```

## 知识库

| 文件 | 用途 |
|------|------|
| `anti-ai-patterns.md` | 去 AI 味指南：黑名单词汇、句式、情感、对话检测 |
| `prose-craft.md` | 文笔锤炼：五感描写、电影感动作、间接心理、节奏控制 |
| `character-depth.md` | 角色塑造：人物先行、传记法、心理画像、非功能性特征 |
| `plot-design.md` | 情节设计：爆点类型、三层伏笔、张力管理、信息不对称 |
| `chinese-fiction.md` | 中文写作：节奏美感、避免翻译腔、高级爽感、章末钩子 |

## 三大铁律

1. **谁产出谁修改** — Dickens 绝不直接修改创意/设定/正文，委派给对应 Agent
2. **每轮必存** — 所有产出即时持久化，版本化存档（`brainstorm_v{N}.md`）
3. **单决策点** — 每次只向用户抛出一个决策点，等待回复后再推进

## 自定义工具

| 工具 | 说明 |
|------|------|
| `dickens_init` | 初始化小说项目 |
| `dickens_status` | 查看写作进度 |
| `dickens_outline` | 管理故事大纲（梗概、结构、弧段） |
| `dickens_character` | 管理角色数据库 |
| `dickens_world` | 管理世界观设定 |
| `dickens_write_chapter` | 写作/保存章节 |
| `dickens_summary` | 管理分层摘要（章节、弧段、全局） |
| `dickens_consistency` | 一致性追踪（线索、伏笔、时间线） |
| `dickens_context` | 构建写作上下文 |
| `dickens_export` | 导出小说（TXT/Markdown） |

## 上下文管理

50 万字远超任何 LLM 上下文窗口。Dickens 使用分层摘要系统：

- **Level 0**：完整章节文本（磁盘存储）
- **Level 1**：章节摘要（每章 500-800 字）
- **Level 2**：弧段摘要（每弧段结束时生成）
- **Level 3**：全书概要（每 5 章刷新）

写作每一章时，ContextBuilder 自动组装：当前弧段计划 + 相关角色档案 + 前 2-3 章摘要 + 全书概要 + 文风指南。

## 开发

```bash
npm install
npm run build
npm run dev   # watch mode
```

## License

MIT
