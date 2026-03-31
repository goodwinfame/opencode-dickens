import { tool } from "@opencode-ai/plugin"
import { promises as fs } from "fs"
import path from "path"
import type { NovelProject } from "../models/novel.js"
import type { WriterState } from "../models/outline.js"
import { resolveProjectDir } from "./resolve-project.js"

export function createNovelWriteTool(baseDir: string) {
  return tool({
    description:
      "Write or update a chapter of the novel. Saves the chapter content to disk, updates writer state, and returns confirmation. The Scribe agent should call this after generating chapter text.",
    args: {
      projectPath: tool.schema.string("Path to the novel project directory"),
      chapterNumber: tool.schema.number("Chapter number (1-based)"),
      title: tool.schema.string("Chapter title"),
      content: tool.schema.string("Full chapter content in Markdown format"),
    },
    async execute(args, context) {
      try {
        const { projectDir, diagnostics } = await resolveProjectDir(args.projectPath, context.directory, baseDir)
        if (!projectDir) return `Error: No novel project found. ${diagnostics}`

        const novelPath = path.join(projectDir, "novel.json")
        let project: NovelProject
        try {
          project = JSON.parse(await fs.readFile(novelPath, "utf-8"))
        } catch {
          return `Error: No novel project found at ${projectDir}. Run dickens_init first.`
        }

        const chaptersDir = path.join(projectDir, "chapters")
        await fs.mkdir(chaptersDir, { recursive: true })

        const chapterNum = String(args.chapterNumber).padStart(3, "0")
        const chapterPath = path.join(chaptersDir, `${chapterNum}.md`)

        const chapterContent = [
          `# 第${args.chapterNumber}章 ${args.title}`,
          "",
          args.content,
        ].join("\n")

        await fs.writeFile(chapterPath, chapterContent, "utf-8")

        const wordCount = countChapterWords(args.content, project.language)

        const statePath = path.join(projectDir, ".writer-state.json")
        let state: WriterState
        try {
          state = JSON.parse(await fs.readFile(statePath, "utf-8"))
        } catch {
          state = {
            currentChapter: 0,
            currentArc: 0,
            totalChaptersWritten: 0,
            totalWordCount: 0,
            lastWrittenAt: new Date().toISOString(),
            chaptersCompleted: [],
            checkpoints: [],
          }
        }

        if (!state.chaptersCompleted.includes(args.chapterNumber)) {
          state.chaptersCompleted.push(args.chapterNumber)
          state.totalChaptersWritten = state.chaptersCompleted.length
        }

        state.currentChapter = args.chapterNumber
        state.lastWrittenAt = new Date().toISOString()

        const chapterFiles = await fs.readdir(chaptersDir).catch(() => [] as string[])
        let totalWords = 0
        for (const f of chapterFiles.filter((f) => f.endsWith(".md"))) {
          const c = await fs.readFile(path.join(chaptersDir, f), "utf-8")
          totalWords += countChapterWords(c, project.language)
        }
        state.totalWordCount = totalWords

        state.checkpoints.push({
          chapter: args.chapterNumber,
          timestamp: new Date().toISOString(),
          wordCount: totalWords,
        })

        await fs.writeFile(statePath, JSON.stringify(state, null, 2), "utf-8")

        if (project.status === "planning" || project.status === "outlining") {
          project.status = "writing"
          project.updatedAt = new Date().toISOString()
          await fs.writeFile(novelPath, JSON.stringify(project, null, 2), "utf-8")
        }

        const progress = (
          (totalWords / project.targetWordCount) *
          100
        ).toFixed(1)

        return [
          `Chapter ${args.chapterNumber} "${args.title}" saved successfully.`,
          `Words in chapter: ${wordCount.toLocaleString()}`,
          `Total progress: ${totalWords.toLocaleString()} / ${project.targetWordCount.toLocaleString()} (${progress}%)`,
          `Chapters completed: ${state.totalChaptersWritten} / ${project.chapterCount}`,
          "",
          "Next: Use dickens_summary to generate a summary for this chapter, then proceed to the next chapter.",
        ].join("\n")
      } catch (e) {
        return `Error in dickens_write_chapter: ${(e as Error).message}`
      }
    },
  })
}

function countChapterWords(text: string, language: string): number {
  if (language.startsWith("zh") || language.startsWith("ja") || language.startsWith("ko")) {
    return text.replace(/\s/g, "").length
  }
  return text.split(/\s+/).filter(Boolean).length
}
