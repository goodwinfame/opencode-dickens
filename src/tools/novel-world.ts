import { tool } from "@opencode-ai/plugin"
import { promises as fs } from "fs"
import path from "path"

export function createNovelWorldTool(baseDir: string) {
  return tool({
    description:
      "Manage worldbuilding documents for the novel. Read or update settings, rules (power systems, social structure), and location descriptions.",
    args: {
      projectPath: tool.schema.string("Path to the novel project directory"),
      action: tool.schema.string(
        "Action: 'read_settings', 'set_settings', 'read_rules', 'set_rules', 'read_locations', 'set_locations'",
      ),
      content: tool.schema.optional(
        tool.schema.string("Markdown content to write. Required for set_* actions."),
      ),
    },
    async execute(args, context) {
      const projectDir = path.isAbsolute(args.projectPath)
        ? args.projectPath
        : path.join(context.directory || baseDir, args.projectPath)

      const worldDir = path.join(projectDir, "worldbuilding")

      const fileMap: Record<string, string> = {
        read_settings: "settings.md",
        set_settings: "settings.md",
        read_rules: "rules.md",
        set_rules: "rules.md",
        read_locations: "locations.md",
        set_locations: "locations.md",
      }

      const fileName = fileMap[args.action]
      if (!fileName) {
        return `Unknown action: ${args.action}. Valid: read_settings, set_settings, read_rules, set_rules, read_locations, set_locations`
      }

      const filePath = path.join(worldDir, fileName)

      if (args.action.startsWith("read_")) {
        try {
          return await fs.readFile(filePath, "utf-8")
        } catch {
          return `No ${fileName} found. Use set_${args.action.replace("read_", "")} to create it.`
        }
      }

      if (!args.content) return `Error: content is required for ${args.action}`
      await fs.mkdir(worldDir, { recursive: true })
      await fs.writeFile(filePath, args.content, "utf-8")
      return `${fileName} updated successfully.`
    },
  })
}
