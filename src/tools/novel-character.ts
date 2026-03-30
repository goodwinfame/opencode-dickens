import { tool } from "@opencode-ai/plugin"
import { promises as fs } from "fs"
import path from "path"
import type { Character, CharacterIndex } from "../models/character.js"
import { resolveProjectDir } from "./resolve-project.js"

export function createNovelCharacterTool(baseDir: string) {
  return tool({
    description:
      "Manage the novel's character database. Add, update, read, or list characters. Each character has a profile with name, role, personality, background, goals, and relationships.",
    args: {
      projectPath: tool.schema.string("Path to the novel project directory"),
      action: tool.schema.string(
        "Action: 'add', 'update', 'read', 'list', 'delete'",
      ),
      id: tool.schema.optional(
        tool.schema.string(
          "Character ID (lowercase, hyphenated). Required for add/update/read/delete.",
        ),
      ),
      name: tool.schema.optional(tool.schema.string("Character's display name")),
      role: tool.schema.optional(
        tool.schema.string("Role: protagonist, antagonist, supporting, minor"),
      ),
      profileContent: tool.schema.optional(
        tool.schema.string(
          "Full character profile in Markdown. Used for add/update actions.",
        ),
      ),
    },
    async execute(args, context) {
      try {
        const projectDir = await resolveProjectDir(args.projectPath, context.directory, baseDir)
        if (!projectDir) return `Error: No novel project found. Use dickens_init first.`

        const charsDir = path.join(projectDir, "characters")
        const indexPath = path.join(charsDir, "index.json")
        const profilesDir = path.join(charsDir, "profiles")

        let index: CharacterIndex
        try {
          index = JSON.parse(await fs.readFile(indexPath, "utf-8"))
        } catch {
          index = { characters: [], lastUpdated: new Date().toISOString() }
        }

        switch (args.action) {
          case "add": {
            if (!args.id || !args.name)
              return "Error: id and name are required for add"
            if (index.characters.find((c) => c.id === args.id))
              return `Error: Character with id "${args.id}" already exists. Use 'update' instead.`

            const character: Character = {
              id: args.id,
              name: args.name,
              aliases: [],
              role: (args.role as Character["role"]) ?? "supporting",
              description: "",
              personality: "",
              background: "",
              goals: [],
              relationships: [],
            }
            index.characters.push(character)
            index.lastUpdated = new Date().toISOString()
            await fs.mkdir(charsDir, { recursive: true })
            await fs.writeFile(indexPath, JSON.stringify(index, null, 2), "utf-8")

            if (args.profileContent) {
              await fs.mkdir(profilesDir, { recursive: true })
              await fs.writeFile(
                path.join(profilesDir, `${args.id}.md`),
                args.profileContent,
                "utf-8",
              )
            }

            return `Character "${args.name}" (${args.id}) added. Total characters: ${index.characters.length}`
          }

          case "update": {
            if (!args.id) return "Error: id is required for update"
            const charIdx = index.characters.findIndex((c) => c.id === args.id)
            if (charIdx === -1)
              return `Error: Character "${args.id}" not found.`

            if (args.name) index.characters[charIdx].name = args.name
            if (args.role)
              index.characters[charIdx].role = args.role as Character["role"]
            index.lastUpdated = new Date().toISOString()
            await fs.mkdir(charsDir, { recursive: true })
            await fs.writeFile(indexPath, JSON.stringify(index, null, 2), "utf-8")

            if (args.profileContent) {
              await fs.mkdir(profilesDir, { recursive: true })
              await fs.writeFile(
                path.join(profilesDir, `${args.id}.md`),
                args.profileContent,
                "utf-8",
              )
            }

            return `Character "${args.id}" updated.`
          }

          case "read": {
            if (!args.id) return "Error: id is required for read"
            const char = index.characters.find((c) => c.id === args.id)
            if (!char) return `Error: Character "${args.id}" not found.`

            let profile = ""
            try {
              profile = await fs.readFile(
                path.join(profilesDir, `${args.id}.md`),
                "utf-8",
              )
            } catch {
              profile = "(No detailed profile file)"
            }

            return [
              `# ${char.name}`,
              `**ID**: ${char.id}`,
              `**Role**: ${char.role}`,
              `**Aliases**: ${char.aliases.length > 0 ? char.aliases.join(", ") : "none"}`,
              "",
              "## Profile",
              profile,
            ].join("\n")
          }

          case "list": {
            if (index.characters.length === 0)
              return "No characters defined yet. Use 'add' to create characters."

            const grouped: Record<string, Character[]> = {}
            for (const c of index.characters) {
              const r = c.role || "other"
              if (!grouped[r]) grouped[r] = []
              grouped[r].push(c)
            }

            const lines = ["# Characters", ""]
            for (const [role, chars] of Object.entries(grouped)) {
              lines.push(`## ${role.charAt(0).toUpperCase() + role.slice(1)}`)
              for (const c of chars) {
                lines.push(`- **${c.name}** (${c.id})`)
              }
              lines.push("")
            }
            lines.push(`Total: ${index.characters.length} characters`)
            return lines.join("\n")
          }

          case "delete": {
            if (!args.id) return "Error: id is required for delete"
            const delIdx = index.characters.findIndex((c) => c.id === args.id)
            if (delIdx === -1)
              return `Error: Character "${args.id}" not found.`

            const removed = index.characters.splice(delIdx, 1)[0]
            index.lastUpdated = new Date().toISOString()
            await fs.mkdir(charsDir, { recursive: true })
            await fs.writeFile(indexPath, JSON.stringify(index, null, 2), "utf-8")

            try {
              await fs.unlink(path.join(profilesDir, `${args.id}.md`))
            } catch {
              // Profile file may not exist
            }

            return `Character "${removed.name}" (${args.id}) deleted.`
          }

          default:
            return `Unknown action: ${args.action}. Valid: add, update, read, list, delete`
        }
      } catch (e) {
        return `Error in dickens_character: ${(e as Error).message}`
      }
    },
  })
}
