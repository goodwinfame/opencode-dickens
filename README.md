# Dickens

> 以连载小说之王查尔斯·狄更斯命名。正如狄更斯以章节连载的方式创作了《双城记》《远大前程》等不朽名著，Dickens 插件以章节为单位、多 Agent 协作的方式自动生成长篇小说。

**opencode-dickens** — 基于 [OpenCode](https://github.com/anomalyco/opencode) 的长篇小说写作 Agent 插件，参考 [oh-my-openagent](https://github.com/code-yeongyu/oh-my-openagent) 的多 Agent 编排架构设计。

## 特性

- **50万字+长篇写作**：分层摘要系统突破上下文窗口限制，支持生成超长篇小说
- **5个专业 Agent 协作**：Novelist（编排）、Architect（架构）、Scribe（写作）、Editor（审校）、Chronicler（记录）
- **自动写作循环**：`/write-loop` 命令实现章节连续写作，含质量门控和断点续写
- **一致性追踪**：角色状态、情节线索、时间线全程追踪，防止长篇连续性错误
- **灵活通用**：支持玄幻、都市、言情、科幻、推理等多种类型

## 安装

```bash
npm install opencode-dickens
```

在 `opencode.json` 中添加插件：

```json
{
  "plugin": ["opencode-dickens"]
}
```

## 快速开始

### 1. 创建新小说

```
/start-novel
```

Architect agent 会通过访谈模式收集你的小说构想，然后自动生成：
- 全书梗概和章节大纲
- 角色档案
- 世界观设定
- 文风指南

### 2. 开始写作

```
/write-next my-novel
```

按工作流自动完成一章：写作 → 审校 → 生成摘要 → 更新追踪

### 3. 自动循环写作

```
/write-loop --chapters 10
```

连续写10章，每章自动经过完整的写作-审校-记录流程。

### 4. 查看进度

```
/novel-status my-novel
```

## Agent 架构

```
用户 ──→ Novelist (编排者)
              ├── Architect (故事架构师) ── 规划大纲/角色/世界观
              ├── Scribe (写手) ── 生成章节正文
              ├── Editor (编辑) ── 审校质量和一致性
              └── Chronicler (记录者) ── 维护摘要和状态追踪
```

| Agent | 对标 oh-my-openagent | 职责 |
|---|---|---|
| Novelist | Sisyphus | 主编排者，管理整个写作流程 |
| Architect | Prometheus | 故事架构师，访谈模式规划 |
| Scribe | Hephaestus | 写作工匠，生成章节 |
| Editor | Oracle | 审校编辑，质量门控 |
| Chronicler | Explore/Librarian | 上下文管理，摘要生成 |

## 上下文管理

50万字远超任何 LLM 上下文窗口。Dickens 使用分层摘要系统：

- **Level 0**：完整章节文本（磁盘存储）
- **Level 1**：章节摘要（每章 500-800 字）
- **Level 2**：故事弧摘要（每 10-20 章）
- **Level 3**：全书概要

写作每一章时，系统自动组装：
- 全书大纲 + 当前弧段计划
- 相关角色档案
- 前2-3章详细摘要
- 当前弧段摘要 + 全书概要
- 文风指南

## 自定义工具

| 工具 | 说明 |
|---|---|
| `dickens_init` | 初始化小说项目 |
| `dickens_status` | 查看写作进度 |
| `dickens_outline` | 管理故事大纲 |
| `dickens_character` | 管理角色数据库 |
| `dickens_world` | 管理世界观设定 |
| `dickens_write_chapter` | 写作/保存章节 |
| `dickens_summary` | 管理分层摘要 |
| `dickens_consistency` | 一致性追踪 |
| `dickens_context` | 构建写作上下文 |
| `dickens_export` | 导出小说（TXT/Markdown）|

## 小说项目结构

```
my-novel/
├── novel.json              # 项目配置
├── outline/                # 大纲
│   ├── synopsis.md
│   ├── structure.md
│   └── chapters/arc-XX.md
├── characters/             # 角色
│   ├── index.json
│   └── profiles/*.md
├── worldbuilding/          # 世界观
├── chapters/               # 章节正文
│   └── 001.md ~ 200.md
├── summaries/              # 分层摘要
│   ├── chapters/
│   ├── arcs/
│   └── global.md
├── metadata/               # 追踪数据
│   ├── timeline.json
│   ├── threads.json
│   ├── character-states.json
│   └── style-guide.md
└── .writer-state.json      # 写作进度
```

## 开发

```bash
npm install
npm run build
npm run dev   # watch mode
```

## License

MIT
