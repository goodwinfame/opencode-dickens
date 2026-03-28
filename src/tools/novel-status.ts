import { tool } from "@opencode-ai/plugin"
import { promises as fs } from "fs"
import path from "path"
import type { NovelProject } from "../models/novel.js"
import type { WriterState } from "../models/outline.js"

export function createNovelStatusTool(baseDir: string) {
  return tool({
    description:
      "Show the current status and progress of a Dickens novel project. Displays word count, chapters completed, current position, and overall progress.",
    args: {
      projectPath: tool.schema.string(
        "Path to the novel project directory (absolute or relative to workspace)",
      ),
    },
    async execute(args, context) {
      const projectDir = path.isAbsolute(args.projectPath)
        ? args.projectPath
        : path.join(context.directory || baseDir, args.projectPath)

      const novelJsonPath = path.join(projectDir, "novel.json")
      const statePath = path.join(projectDir, ".writer-state.json")

      const novelExists = await fs
        .access(novelJsonPath)
        .then(() => true)
        .catch(() => false)
      if (!novelExists) {
        return `No novel project found at ${projectDir}. Use dickens_init to create one.`
      }

      const project: NovelProject = JSON.parse(
        await fs.readFile(novelJsonPath, "utf-8"),
      )

      let writerState: WriterState | null = null
      try {
        writerState = JSON.parse(await fs.readFile(statePath, "utf-8"))
      } catch {
        // State file may not exist yet
      }

      const chapterFiles = await fs
        .readdir(path.join(projectDir, "chapters"))
        .catch(() => [] as string[])
      const writtenChapters = chapterFiles.filter((f) => f.endsWith(".md"))

      let totalWords = 0
      for (const file of writtenChapters) {
        const content = await fs.readFile(
          path.join(projectDir, "chapters", file),
          "utf-8",
        )
        totalWords += countWords(content, project.language)
      }

      const characterIndex = await fs
        .readFile(path.join(projectDir, "characters", "index.json"), "utf-8")
        .then((c) => JSON.parse(c))
        .catch(() => ({ characters: [] }))

      const progress =
        project.targetWordCount > 0
          ? ((totalWords / project.targetWordCount) * 100).toFixed(1)
          : "0"

      const summaryFiles = await fs
        .readdir(path.join(projectDir, "summaries", "chapters"))
        .catch(() => [] as string[])

      const lines = [
        `# ${project.title} - Project Status`,
        "",
        `**Status**: ${project.status}`,
        `**Genre**: ${project.genre}${project.subGenre ? ` / ${project.subGenre}` : ""}`,
        `**Language**: ${project.language}`,
        "",
        "## Progress",
        `- Words written: ${totalWords.toLocaleString()} / ${project.targetWordCount.toLocaleString()} (${progress}%)`,
        `- Chapters written: ${writtenChapters.length} / ${project.chapterCount}`,
        `- Chapter summaries: ${summaryFiles.filter((f) => f.endsWith(".md")).length}`,
        `- Characters defined: ${characterIndex.characters?.length ?? 0}`,
      ]

      if (writerState) {
        lines.push(
          "",
          "## Writer State",
          `- Current chapter: ${writerState.currentChapter}`,
          `- Current arc: ${writerState.currentArc}`,
          `- Last written: ${writerState.lastWrittenAt}`,
          `- Checkpoints: ${writerState.checkpoints?.length ?? 0}`,
        )
      }

      const progressBar = buildProgressBar(
        totalWords,
        project.targetWordCount,
        30,
      )
      lines.push("", "## Progress Bar", progressBar)

      return lines.join("\n")
    },
  })
}

function countWords(text: string, language: string): number {
  if (language.startsWith("zh") || language.startsWith("ja") || language.startsWith("ko")) {
    return text.replace(/\s/g, "").length
  }
  return text.split(/\s+/).filter(Boolean).length
}

function buildProgressBar(current: number, total: number, width: number): string {
  const ratio = Math.min(current / Math.max(total, 1), 1)
  const filled = Math.round(ratio * width)
  const empty = width - filled
  const bar = "█".repeat(filled) + "░".repeat(empty)
  const pct = (ratio * 100).toFixed(1)
  return `[${bar}] ${pct}% (${current.toLocaleString()} / ${total.toLocaleString()})`
}
