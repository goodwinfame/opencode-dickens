import { tool } from "@opencode-ai/plugin"
import { promises as fs } from "fs"
import path from "path"
import { resolveProjectDir } from "./resolve-project.js"

export function createNovelOutlineTool(baseDir: string) {
  return tool({
    description:
      "Create or update the novel's story outline. Manages synopsis, story structure, and arc-level chapter plans. The Architect agent should use this to save planning results.",
    args: {
      projectPath: tool.schema.string("Path to the novel project directory"),
      action: tool.schema.string(
        "Action: 'set_synopsis', 'set_structure', 'set_arc', 'read_synopsis', 'read_structure', 'read_arc', 'list_arcs'",
      ),
      content: tool.schema.optional(
        tool.schema.string("Content to write (Markdown format). Required for set_* actions."),
      ),
      arcIndex: tool.schema.optional(
        tool.schema.number("Arc index (1-based). Required for set_arc/read_arc."),
      ),
    },
    async execute(args, context) {
      try {
        const { projectDir, diagnostics } = await resolveProjectDir(args.projectPath, context.directory, baseDir)
        if (!projectDir) return `Error: No novel project found. ${diagnostics}`

        const outlineDir = path.join(projectDir, "outline")

        switch (args.action) {
          case "set_synopsis": {
            if (!args.content) return "Error: content is required for set_synopsis"
            await fs.mkdir(outlineDir, { recursive: true })
            await fs.writeFile(
              path.join(outlineDir, "synopsis.md"),
              args.content,
              "utf-8",
            )
            return "Synopsis updated successfully."
          }

          case "read_synopsis": {
            try {
              const content = await fs.readFile(
                path.join(outlineDir, "synopsis.md"),
                "utf-8",
              )
              return content
            } catch {
              return "No synopsis found. Use set_synopsis to create one."
            }
          }

          case "set_structure": {
            if (!args.content) return "Error: content is required for set_structure"
            await fs.mkdir(outlineDir, { recursive: true })
            await fs.writeFile(
              path.join(outlineDir, "structure.md"),
              args.content,
              "utf-8",
            )
            return "Story structure updated successfully."
          }

          case "read_structure": {
            try {
              const content = await fs.readFile(
                path.join(outlineDir, "structure.md"),
                "utf-8",
              )
              return content
            } catch {
              return "No structure found. Use set_structure to create one."
            }
          }

          case "set_arc": {
            if (!args.content) return "Error: content is required for set_arc"
            if (!args.arcIndex) return "Error: arcIndex is required for set_arc"
            const arcNum = String(args.arcIndex).padStart(2, "0")
            await fs.mkdir(path.join(outlineDir, "chapters"), { recursive: true })
            await fs.writeFile(
              path.join(outlineDir, "chapters", `arc-${arcNum}.md`),
              args.content,
              "utf-8",
            )
            return `Arc ${args.arcIndex} outline updated successfully.`
          }

          case "read_arc": {
            if (!args.arcIndex) return "Error: arcIndex is required for read_arc"
            const arcNum = String(args.arcIndex).padStart(2, "0")
            try {
              const content = await fs.readFile(
                path.join(outlineDir, "chapters", `arc-${arcNum}.md`),
                "utf-8",
              )
              return content
            } catch {
              return `No outline found for arc ${args.arcIndex}.`
            }
          }

          case "list_arcs": {
            try {
              const files = await fs.readdir(path.join(outlineDir, "chapters"))
              const arcs = files
                .filter((f) => f.startsWith("arc-") && f.endsWith(".md"))
                .sort()
              if (arcs.length === 0) return "No arc outlines found."
              const summaries: string[] = ["# Arc Outlines", ""]
              for (const arc of arcs) {
                const content = await fs.readFile(
                  path.join(outlineDir, "chapters", arc),
                  "utf-8",
                )
                const firstLine = content.split("\n").find((l) => l.trim()) ?? arc
                summaries.push(`- **${arc}**: ${firstLine.replace(/^#+\s*/, "")}`)
              }
              return summaries.join("\n")
            } catch {
              return "No arc outlines directory found."
            }
          }

          default:
            return `Unknown action: ${args.action}. Valid actions: set_synopsis, read_synopsis, set_structure, read_structure, set_arc, read_arc, list_arcs`
        }
      } catch (e) {
        return `Error in dickens_outline: ${(e as Error).message}`
      }
    },
  })
}
