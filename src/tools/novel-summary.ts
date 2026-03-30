import { tool } from "@opencode-ai/plugin"
import { promises as fs } from "fs"
import path from "path"
import { resolveProjectDir } from "./resolve-project.js"

export function createNovelSummaryTool(baseDir: string) {
  return tool({
    description:
      "Manage chapter and arc summaries for context continuity. The Chronicler agent uses this to maintain the hierarchical summary system that enables writing across hundreds of chapters.",
    args: {
      projectPath: tool.schema.string("Path to the novel project directory"),
      action: tool.schema.string(
        "Action: 'set_chapter_summary', 'read_chapter_summary', 'set_arc_summary', 'read_arc_summary', 'set_global_summary', 'read_global_summary', 'read_recent_summaries'",
      ),
      chapterNumber: tool.schema.optional(
        tool.schema.number("Chapter number. Required for chapter summary actions."),
      ),
      arcIndex: tool.schema.optional(
        tool.schema.number("Arc index. Required for arc summary actions."),
      ),
      content: tool.schema.optional(
        tool.schema.string("Summary content in Markdown. Required for set_* actions."),
      ),
      count: tool.schema.optional(
        tool.schema.number("Number of recent chapter summaries to read (default: 3)."),
      ),
    },
    async execute(args, context) {
      try {
        const projectDir = await resolveProjectDir(args.projectPath, context.directory, baseDir)
        if (!projectDir) return `Error: No novel project found. Use dickens_init first.`

        const summariesDir = path.join(projectDir, "summaries")

        switch (args.action) {
          case "set_chapter_summary": {
            if (!args.chapterNumber || !args.content)
              return "Error: chapterNumber and content required"
            const num = String(args.chapterNumber).padStart(3, "0")
            const dir = path.join(summariesDir, "chapters")
            await fs.mkdir(dir, { recursive: true })
            await fs.writeFile(path.join(dir, `${num}.md`), args.content, "utf-8")
            return `Chapter ${args.chapterNumber} summary saved.`
          }

          case "read_chapter_summary": {
            if (!args.chapterNumber) return "Error: chapterNumber required"
            const num = String(args.chapterNumber).padStart(3, "0")
            try {
              return await fs.readFile(
                path.join(summariesDir, "chapters", `${num}.md`),
                "utf-8",
              )
            } catch {
              return `No summary found for chapter ${args.chapterNumber}.`
            }
          }

          case "set_arc_summary": {
            if (!args.arcIndex || !args.content)
              return "Error: arcIndex and content required"
            const arcNum = String(args.arcIndex).padStart(2, "0")
            const dir = path.join(summariesDir, "arcs")
            await fs.mkdir(dir, { recursive: true })
            await fs.writeFile(
              path.join(dir, `arc-${arcNum}.md`),
              args.content,
              "utf-8",
            )
            return `Arc ${args.arcIndex} summary saved.`
          }

          case "read_arc_summary": {
            if (!args.arcIndex) return "Error: arcIndex required"
            const arcNum = String(args.arcIndex).padStart(2, "0")
            try {
              return await fs.readFile(
                path.join(summariesDir, "arcs", `arc-${arcNum}.md`),
                "utf-8",
              )
            } catch {
              return `No summary found for arc ${args.arcIndex}.`
            }
          }

          case "set_global_summary": {
            if (!args.content) return "Error: content required"
            await fs.mkdir(summariesDir, { recursive: true })
            await fs.writeFile(
              path.join(summariesDir, "global.md"),
              args.content,
              "utf-8",
            )
            return "Global summary updated."
          }

          case "read_global_summary": {
            try {
              return await fs.readFile(
                path.join(summariesDir, "global.md"),
                "utf-8",
              )
            } catch {
              return "No global summary found."
            }
          }

          case "read_recent_summaries": {
            const count = args.count ?? 3
            const chapDir = path.join(summariesDir, "chapters")
            let files: string[]
            try {
              files = (await fs.readdir(chapDir))
                .filter((f) => f.endsWith(".md"))
                .sort()
            } catch {
              return "No chapter summaries found."
            }

            const recent = files.slice(-count)
            const results: string[] = []
            for (const f of recent) {
              try {
                const content = await fs.readFile(path.join(chapDir, f), "utf-8")
                results.push(content)
                results.push("---")
              } catch {
                results.push(`(Failed to read ${f})`)
              }
            }
            return results.join("\n")
          }

          default:
            return `Unknown action: ${args.action}. Valid: set_chapter_summary, read_chapter_summary, set_arc_summary, read_arc_summary, set_global_summary, read_global_summary, read_recent_summaries`
        }
      } catch (e) {
        return `Error in dickens_summary: ${(e as Error).message}`
      }
    },
  })
}
