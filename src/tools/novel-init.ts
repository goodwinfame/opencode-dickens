import { tool } from "@opencode-ai/plugin"
import type { NovelProject } from "../models/novel.js"
import { DEFAULT_NOVEL_CONFIG } from "../models/novel.js"
import { promises as fs } from "fs"
import path from "path"

const NOVEL_DIR_STRUCTURE = [
  "outline",
  "outline/chapters",
  "characters",
  "characters/profiles",
  "worldbuilding",
  "chapters",
  "summaries",
  "summaries/chapters",
  "summaries/arcs",
  "metadata",
]

export function createNovelInitTool(baseDir: string) {
  return tool({
    description:
      "Initialize a new Dickens novel project in the current working directory. Creates the directory structure, config file, and template files needed for long-form novel generation. The project is created directly in the current directory (not a subdirectory). Call this before starting any novel writing work.",
    args: {
      title: tool.schema.string("The title of the novel"),
      genre: tool.schema.string(
        "Primary genre (e.g. fantasy, sci-fi, romance, mystery, wuxia, urban, historical)",
      ),
      subGenre: tool.schema.optional(
        tool.schema.string("Sub-genre for more specific categorization"),
      ),
      language: tool.schema.optional(
        tool.schema.string("Writing language, defaults to zh-CN"),
      ),
      targetWordCount: tool.schema.optional(
        tool.schema.number("Target total word count, defaults to 500000"),
      ),
      chapterCount: tool.schema.optional(
        tool.schema.number("Planned number of chapters, defaults to 200"),
      ),
      pov: tool.schema.optional(
        tool.schema.string(
          "Point of view: first, third-limited, third-omniscient, multiple",
        ),
      ),
      tense: tool.schema.optional(
        tool.schema.string("Narrative tense: past or present"),
      ),
      tone: tool.schema.optional(
        tool.schema.string("Overall tone description (e.g. dark, humorous, epic)"),
      ),
    },
    async execute(args, context) {
      try {
        const novelDir = context.directory || baseDir

        const existing = await fs
          .access(path.join(novelDir, "novel.json"))
          .then(() => true)
          .catch(() => false)
        if (existing) {
          return `A novel project already exists in ${novelDir}. Use dickens_status to check its state.`
        }

        for (const dir of NOVEL_DIR_STRUCTURE) {
          await fs.mkdir(path.join(novelDir, dir), { recursive: true })
        }

        const wordCount = args.targetWordCount ?? DEFAULT_NOVEL_CONFIG.targetWordCount!
        const chapterCount = args.chapterCount ?? DEFAULT_NOVEL_CONFIG.chapterCount!

        const project: NovelProject = {
          title: args.title,
          genre: args.genre,
          subGenre: args.subGenre,
          language: args.language ?? DEFAULT_NOVEL_CONFIG.language!,
          targetWordCount: wordCount,
          chapterCount: chapterCount,
          wordsPerChapter: Math.round(wordCount / chapterCount),
          style: {
            tone: args.tone ?? "to be defined",
            pov: (args.pov as NovelProject["style"]["pov"]) ?? "third-limited",
            tense: (args.tense as "past" | "present") ?? "past",
            description: "to be defined by Architect agent",
          },
          status: "planning",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        await fs.writeFile(
          path.join(novelDir, "novel.json"),
          JSON.stringify(project, null, 2),
          "utf-8",
        )

        await fs.writeFile(
          path.join(novelDir, "outline", "synopsis.md"),
          `# ${args.title} - 故事梗概\n\n> 待 Architect agent 完善\n\n`,
          "utf-8",
        )

        await fs.writeFile(
          path.join(novelDir, "outline", "structure.md"),
          `# ${args.title} - 故事结构\n\n## 结构类型\n\n> 待定义\n\n## 幕次划分\n\n> 待 Architect agent 规划\n`,
          "utf-8",
        )

        await fs.writeFile(
          path.join(novelDir, "characters", "index.json"),
          JSON.stringify({ characters: [], lastUpdated: new Date().toISOString() }, null, 2),
          "utf-8",
        )

        await fs.writeFile(
          path.join(novelDir, "worldbuilding", "settings.md"),
          `# ${args.title} - 世界观设定\n\n> 待 Architect agent 完善\n`,
          "utf-8",
        )

        await fs.writeFile(
          path.join(novelDir, "worldbuilding", "rules.md"),
          `# ${args.title} - 世界规则\n\n> 待定义（力量体系、社会规则等）\n`,
          "utf-8",
        )

        await fs.writeFile(
          path.join(novelDir, "worldbuilding", "locations.md"),
          `# ${args.title} - 地点设定\n\n> 待 Architect agent 完善\n`,
          "utf-8",
        )

        await fs.writeFile(
          path.join(novelDir, "summaries", "global.md"),
          `# ${args.title} - 全书概要\n\n> 随写作进度自动更新\n`,
          "utf-8",
        )

        await fs.writeFile(
          path.join(novelDir, "metadata", "style-guide.md"),
          `# ${args.title} - 文风指南\n\n## 叙事视角\n${args.pov ?? "第三人称有限视角"}\n\n## 时态\n${args.tense === "present" ? "现在时" : "过去时"}\n\n## 风格描述\n${args.tone ?? "待定义"}\n\n## 对话风格\n> 待定义\n\n## 禁忌\n> 待定义\n`,
          "utf-8",
        )

        await fs.writeFile(
          path.join(novelDir, "metadata", "timeline.json"),
          JSON.stringify([], null, 2),
          "utf-8",
        )

        await fs.writeFile(
          path.join(novelDir, "metadata", "threads.json"),
          JSON.stringify([], null, 2),
          "utf-8",
        )

        await fs.writeFile(
          path.join(novelDir, "metadata", "character-states.json"),
          JSON.stringify([], null, 2),
          "utf-8",
        )

        await fs.writeFile(
          path.join(novelDir, "metadata", "glossary.json"),
          JSON.stringify([], null, 2),
          "utf-8",
        )

        await fs.writeFile(
          path.join(novelDir, "metadata", "relationships.json"),
          JSON.stringify([], null, 2),
          "utf-8",
        )

        await fs.writeFile(
          path.join(novelDir, "metadata", "world-state.json"),
          JSON.stringify([], null, 2),
          "utf-8",
        )

        await fs.writeFile(
          path.join(novelDir, "metadata", "factions.json"),
          JSON.stringify([], null, 2),
          "utf-8",
        )

        await fs.writeFile(
          path.join(novelDir, "metadata", "secrets.json"),
          JSON.stringify([], null, 2),
          "utf-8",
        )

        const writerState = {
          currentChapter: 0,
          currentArc: 0,
          totalChaptersWritten: 0,
          totalWordCount: 0,
          lastWrittenAt: new Date().toISOString(),
          chaptersCompleted: [],
          checkpoints: [],
        }
        await fs.writeFile(
          path.join(novelDir, ".writer-state.json"),
          JSON.stringify(writerState, null, 2),
          "utf-8",
        )

        return [
          `Novel project "${args.title}" initialized at ${novelDir}`,
          `Genre: ${args.genre}${args.subGenre ? ` / ${args.subGenre}` : ""}`,
          `Target: ${wordCount.toLocaleString()} words across ${chapterCount} chapters (~${project.wordsPerChapter} words/chapter)`,
          `Language: ${project.language}`,
          `POV: ${project.style.pov} | Tense: ${project.style.tense}`,
          "",
          "All subsequent dickens_* tool calls should use projectPath = \".\" since the project lives in the current directory.",
        ].join("\n")
      } catch (e) {
        return `Error in dickens_init: ${(e as Error).message}`
      }
    },
  })
}
