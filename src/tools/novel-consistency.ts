import { tool } from "@opencode-ai/plugin"
import { promises as fs } from "fs"
import path from "path"
import type { PlotThread, TimelineEvent } from "../models/outline.js"
import type { CharacterState } from "../models/character.js"

export function createNovelConsistencyTool(baseDir: string) {
  return tool({
    description:
      "Track and check consistency across the novel. Manages plot threads, timeline events, and character states to prevent continuity errors across hundreds of chapters.",
    args: {
      projectPath: tool.schema.string("Path to the novel project directory"),
      action: tool.schema.string(
        "Action: 'add_thread', 'update_thread', 'list_threads', 'add_event', 'list_events', 'set_character_state', 'get_character_state', 'check_open_threads'",
      ),
      data: tool.schema.optional(
        tool.schema.string("JSON data for the action (structure depends on action type)"),
      ),
    },
    async execute(args, context) {
      const projectDir = path.isAbsolute(args.projectPath)
        ? args.projectPath
        : path.join(context.directory || baseDir, args.projectPath)

      const metadataDir = path.join(projectDir, "metadata")
      const threadsPath = path.join(metadataDir, "threads.json")
      const timelinePath = path.join(metadataDir, "timeline.json")
      const charStatesPath = path.join(metadataDir, "character-states.json")

      switch (args.action) {
        case "add_thread": {
          if (!args.data) return "Error: data required (JSON PlotThread)"
          const thread: PlotThread = JSON.parse(args.data)
          const threads: PlotThread[] = await readJson(threadsPath)
          threads.push(thread)
          await writeJson(threadsPath, threads)
          return `Plot thread "${thread.name}" added. Total threads: ${threads.length}`
        }

        case "update_thread": {
          if (!args.data) return "Error: data required (JSON with id and fields to update)"
          const update = JSON.parse(args.data)
          const threads: PlotThread[] = await readJson(threadsPath)
          const idx = threads.findIndex((t) => t.id === update.id)
          if (idx === -1) return `Thread "${update.id}" not found.`
          Object.assign(threads[idx], update)
          await writeJson(threadsPath, threads)
          return `Thread "${update.id}" updated.`
        }

        case "list_threads": {
          const threads: PlotThread[] = await readJson(threadsPath)
          if (threads.length === 0) return "No plot threads defined."
          const lines = ["# Plot Threads", ""]
          const grouped = { open: [] as PlotThread[], developing: [] as PlotThread[], climax: [] as PlotThread[], resolved: [] as PlotThread[] }
          for (const t of threads) {
            ;(grouped[t.status] ?? grouped.open).push(t)
          }
          for (const [status, list] of Object.entries(grouped)) {
            if (list.length === 0) continue
            lines.push(`## ${status.toUpperCase()} (${list.length})`)
            for (const t of list) {
              lines.push(`- **${t.name}** (ch.${t.introducedChapter}${t.resolvedChapter ? ` → ch.${t.resolvedChapter}` : ""}): ${t.description}`)
            }
            lines.push("")
          }
          return lines.join("\n")
        }

        case "check_open_threads": {
          const threads: PlotThread[] = await readJson(threadsPath)
          const open = threads.filter((t) => t.status !== "resolved")
          if (open.length === 0) return "All plot threads are resolved."
          const lines = [
            `# Open Plot Threads (${open.length})`,
            "",
            ...open.map(
              (t) =>
                `- **${t.name}** [${t.status}] (since ch.${t.introducedChapter}): ${t.description}`,
            ),
          ]
          return lines.join("\n")
        }

        case "add_event": {
          if (!args.data) return "Error: data required (JSON TimelineEvent)"
          const event: TimelineEvent = JSON.parse(args.data)
          const timeline: TimelineEvent[] = await readJson(timelinePath)
          timeline.push(event)
          timeline.sort((a, b) => a.chapter - b.chapter)
          await writeJson(timelinePath, timeline)
          return `Timeline event added at chapter ${event.chapter}. Total events: ${timeline.length}`
        }

        case "list_events": {
          const timeline: TimelineEvent[] = await readJson(timelinePath)
          if (timeline.length === 0) return "No timeline events recorded."
          const lines = ["# Timeline", ""]
          for (const e of timeline) {
            const sig = e.significance === "critical" ? "**" : e.significance === "major" ? "*" : ""
            lines.push(
              `- Ch.${e.chapter} [${e.significance}]: ${sig}${e.description}${sig} (${e.location}, ${e.characters.join(", ")})`,
            )
          }
          return lines.join("\n")
        }

        case "set_character_state": {
          if (!args.data) return "Error: data required (JSON CharacterState)"
          const state: CharacterState = JSON.parse(args.data)
          const states: CharacterState[] = await readJson(charStatesPath)
          const existingIdx = states.findIndex(
            (s) =>
              s.characterId === state.characterId &&
              s.chapterNumber === state.chapterNumber,
          )
          if (existingIdx >= 0) {
            states[existingIdx] = state
          } else {
            states.push(state)
          }
          states.sort((a, b) => a.chapterNumber - b.chapterNumber)
          await writeJson(charStatesPath, states)
          return `Character state for "${state.characterId}" at chapter ${state.chapterNumber} saved.`
        }

        case "get_character_state": {
          if (!args.data) return "Error: data required (JSON with characterId, optional chapterNumber)"
          const query = JSON.parse(args.data)
          const states: CharacterState[] = await readJson(charStatesPath)
          let filtered = states.filter((s) => s.characterId === query.characterId)
          if (query.chapterNumber) {
            filtered = filtered.filter((s) => s.chapterNumber <= query.chapterNumber)
          }
          if (filtered.length === 0)
            return `No state records for character "${query.characterId}".`
          const latest = filtered[filtered.length - 1]
          return [
            `# ${query.characterId} - State at Chapter ${latest.chapterNumber}`,
            `**Location**: ${latest.location}`,
            `**Emotional State**: ${latest.emotionalState}`,
            `**Known Information**: ${latest.knownInformation.join("; ")}`,
            `**Recent Changes**: ${latest.changes.join("; ")}`,
          ].join("\n")
        }

        default:
          return `Unknown action: ${args.action}. Valid: add_thread, update_thread, list_threads, check_open_threads, add_event, list_events, set_character_state, get_character_state`
      }
    },
  })
}

async function readJson<T>(filePath: string): Promise<T[]> {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf-8"))
  } catch {
    return [] as T[]
  }
}

async function writeJson(filePath: string, data: unknown): Promise<void> {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8")
}
