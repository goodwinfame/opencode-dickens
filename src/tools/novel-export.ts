import { tool } from "@opencode-ai/plugin"
import { promises as fs } from "fs"
import path from "path"
import type { NovelProject } from "../models/novel.js"
import { resolveProjectDir } from "./resolve-project.js"

export function createNovelExportTool(baseDir: string) {
  return tool({
    description:
      "Export the novel to a single file. Supports TXT (plain text) and Markdown formats. Combines all chapters in order with proper formatting.",
    args: {
      projectPath: tool.schema.string("Path to the novel project directory"),
      format: tool.schema.string("Export format: 'txt', 'markdown'"),
      outputPath: tool.schema.optional(
        tool.schema.string("Custom output file path. Defaults to project directory."),
      ),
      startChapter: tool.schema.optional(
        tool.schema.number("Start chapter number (inclusive). Defaults to 1."),
      ),
      endChapter: tool.schema.optional(
        tool.schema.number("End chapter number (inclusive). Defaults to last chapter."),
      ),
    },
    async execute(args, context) {
      try {
        const projectDir = await resolveProjectDir(args.projectPath, context.directory, baseDir)
        if (!projectDir) return `Error: No novel project found. Use dickens_init first.`

        const novelPath = path.join(projectDir, "novel.json")
        let project: NovelProject
        try {
          project = JSON.parse(await fs.readFile(novelPath, "utf-8"))
        } catch {
          return `No novel project found at ${projectDir}.`
        }

        const chaptersDir = path.join(projectDir, "chapters")
        let chapterFiles: string[]
        try {
          chapterFiles = (await fs.readdir(chaptersDir))
            .filter((f) => f.endsWith(".md"))
            .sort()
        } catch {
          return "No chapters found to export."
        }

        if (args.startChapter || args.endChapter) {
          const start = args.startChapter ?? 1
          const end = args.endChapter ?? 9999
          chapterFiles = chapterFiles.filter((f) => {
            const num = parseInt(f.replace(".md", ""), 10)
            return num >= start && num <= end
          })
        }

        if (chapterFiles.length === 0) return "No chapters in the specified range."

        const chapters: string[] = []
        let totalWords = 0

        for (const file of chapterFiles) {
          const content = await fs.readFile(
            path.join(chaptersDir, file),
            "utf-8",
          )
          chapters.push(content)
          totalWords += content.replace(/\s/g, "").length
        }

        const ext = args.format === "txt" ? "txt" : "md"
        const defaultOutput = path.join(
          projectDir,
          `${project.title}-export.${ext}`,
        )
        const outputPath = args.outputPath ?? defaultOutput

        let output: string
        if (args.format === "txt") {
          output = [
            project.title,
            "=".repeat(project.title.length * 2),
            "",
            ...chapters.map((c) => {
              return (
                c
                  .replace(/^#+\s*/gm, "")
                  .replace(/\*\*/g, "")
                  .replace(/\*/g, "") + "\n\n"
              )
            }),
          ].join("\n")
        } else {
          output = [
            `# ${project.title}`,
            "",
            `> ${project.genre}${project.subGenre ? ` / ${project.subGenre}` : ""}`,
            "",
            "---",
            "",
            ...chapters.map((c) => c + "\n\n---\n"),
          ].join("\n")
        }

        await fs.mkdir(path.dirname(outputPath), { recursive: true })
        await fs.writeFile(outputPath, output, "utf-8")

        return [
          `Novel exported successfully.`,
          `Format: ${args.format}`,
          `Output: ${outputPath}`,
          `Chapters: ${chapterFiles.length}`,
          `Total characters: ${totalWords.toLocaleString()}`,
        ].join("\n")
      } catch (e) {
        return `Error in dickens_export: ${(e as Error).message}`
      }
    },
  })
}
