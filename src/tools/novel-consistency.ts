import { tool } from "@opencode-ai/plugin"
import { promises as fs } from "fs"
import path from "path"
import type { PlotThread, TimelineEvent } from "../models/outline.js"
import type { CharacterState, RelationshipState } from "../models/character.js"
import type { GlossaryEntry } from "../models/glossary.js"
import type { WorldState, FactionState, Secret } from "../models/world-state.js"
import { resolveProjectDir } from "./resolve-project.js"

export function createNovelConsistencyTool(baseDir: string) {
  return tool({
    description:
      "Track and check consistency across the novel. Manages plot threads, timeline events, character states, glossary, relationships, world state, factions, and secrets to prevent continuity errors across hundreds of chapters.",
    args: {
      projectPath: tool.schema.string("Path to the novel project directory"),
      action: tool.schema.string(
        "Action: 'add_thread', 'update_thread', 'list_threads', 'check_open_threads', 'add_event', 'list_events', 'set_character_state', 'get_character_state', 'add_term', 'update_term', 'search_terms', 'list_terms', 'set_relationship', 'get_relationships', 'list_relationship_changes', 'set_world_state', 'get_world_state', 'add_faction', 'update_faction', 'list_factions', 'add_secret', 'update_secret', 'list_secrets'",
      ),
      data: tool.schema.optional(
        tool.schema.string("JSON data for the action (structure depends on action type)"),
      ),
    },
    async execute(args, context) {
      try {
      const { projectDir, diagnostics } = await resolveProjectDir(args.projectPath, context.directory, baseDir)
      if (!projectDir) return `Error: No novel project found. ${diagnostics}`

      const metadataDir = path.join(projectDir, "metadata")
      const threadsPath = path.join(metadataDir, "threads.json")
      const timelinePath = path.join(metadataDir, "timeline.json")
      const charStatesPath = path.join(metadataDir, "character-states.json")
      const glossaryPath = path.join(metadataDir, "glossary.json")
      const relationshipsPath = path.join(metadataDir, "relationships.json")
      const worldStatePath = path.join(metadataDir, "world-state.json")
      const factionsPath = path.join(metadataDir, "factions.json")
      const secretsPath = path.join(metadataDir, "secrets.json")

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
          const lines = [
            `# ${query.characterId} - State at Chapter ${latest.chapterNumber}`,
            `**Location**: ${latest.location}`,
            `**Emotional State**: ${latest.emotionalState}`,
            `**Known Information**: ${latest.knownInformation.join("; ")}`,
            `**Recent Changes**: ${latest.changes.join("; ")}`,
          ]
          if (latest.isAlive === false) lines.push(`**DEAD** (ch.${latest.deathChapter}): ${latest.deathCause}`)
          if (latest.powerLevel) lines.push(`**Power Level**: ${latest.powerLevel}`)
          if (latest.abilities?.length) lines.push(`**Abilities**: ${latest.abilities.join(", ")}`)
          if (latest.powerChanges) lines.push(`**Power Changes**: ${latest.powerChanges}`)
          if (latest.inventory?.length) lines.push(`**Inventory**: ${latest.inventory.join(", ")}`)
          if (latest.inventoryChanges) lines.push(`**Inventory Changes**: ${latest.inventoryChanges}`)
          if (latest.physicalCondition) lines.push(`**Physical**: ${latest.physicalCondition}`)
          if (latest.physicalChanges) lines.push(`**Physical Changes**: ${latest.physicalChanges}`)
          if (latest.appearanceNotes) lines.push(`**Appearance**: ${latest.appearanceNotes}`)
          return lines.join("\n")
        }

        // ── Glossary ──

        case "add_term": {
          if (!args.data) return "Error: data required (JSON GlossaryEntry)"
          const entry: GlossaryEntry = JSON.parse(args.data)
          const glossary: GlossaryEntry[] = await readJson(glossaryPath)
          if (glossary.some((g) => g.id === entry.id)) return `Term "${entry.id}" already exists. Use update_term.`
          glossary.push(entry)
          await writeJson(glossaryPath, glossary)
          return `Term "${entry.term}" added. Total: ${glossary.length}`
        }

        case "update_term": {
          if (!args.data) return "Error: data required (JSON with id and fields to update)"
          const update = JSON.parse(args.data)
          const glossary: GlossaryEntry[] = await readJson(glossaryPath)
          const idx = glossary.findIndex((g) => g.id === update.id)
          if (idx === -1) return `Term "${update.id}" not found.`
          Object.assign(glossary[idx], update)
          await writeJson(glossaryPath, glossary)
          return `Term "${update.id}" updated.`
        }

        case "search_terms": {
          if (!args.data) return "Error: data required (JSON with query and optional category)"
          const { query: q, category } = JSON.parse(args.data)
          const glossary: GlossaryEntry[] = await readJson(glossaryPath)
          const keyword = (q as string).toLowerCase()
          let results = glossary.filter(
            (g) =>
              g.term.toLowerCase().includes(keyword) ||
              g.aliases.some((a) => a.toLowerCase().includes(keyword)) ||
              g.definition.toLowerCase().includes(keyword),
          )
          if (category) results = results.filter((g) => g.category === category)
          if (results.length === 0) return `No terms matching "${q}".`
          return results.map((g) => `- **${g.term}** [${g.category}] (ch.${g.firstAppearance}): ${g.definition}`).join("\n")
        }

        case "list_terms": {
          const glossary: GlossaryEntry[] = await readJson(glossaryPath)
          if (glossary.length === 0) return "Glossary is empty."
          const byCategory = new Map<string, GlossaryEntry[]>()
          for (const g of glossary) {
            const list = byCategory.get(g.category) ?? []
            list.push(g)
            byCategory.set(g.category, list)
          }
          const lines = ["# Glossary", ""]
          for (const [cat, entries] of byCategory) {
            lines.push(`## ${cat} (${entries.length})`)
            for (const g of entries) {
              lines.push(`- **${g.term}**${g.aliases.length ? ` (${g.aliases.join(", ")})` : ""}: ${g.definition}`)
            }
            lines.push("")
          }
          return lines.join("\n")
        }

        // ── Relationships ──

        case "set_relationship": {
          if (!args.data) return "Error: data required (JSON RelationshipState)"
          const rel: RelationshipState = JSON.parse(args.data)
          const rels: RelationshipState[] = await readJson(relationshipsPath)
          const existingIdx = rels.findIndex(
            (r) => r.sourceId === rel.sourceId && r.targetId === rel.targetId && r.chapterNumber === rel.chapterNumber,
          )
          if (existingIdx >= 0) {
            rels[existingIdx] = rel
          } else {
            rels.push(rel)
          }
          rels.sort((a, b) => a.chapterNumber - b.chapterNumber)
          await writeJson(relationshipsPath, rels)
          return `Relationship ${rel.sourceId} → ${rel.targetId} at ch.${rel.chapterNumber} saved.`
        }

        case "get_relationships": {
          if (!args.data) return "Error: data required (JSON with characterId, optional chapterNumber)"
          const { characterId, chapterNumber } = JSON.parse(args.data)
          const rels: RelationshipState[] = await readJson(relationshipsPath)
          let filtered = rels.filter((r) => r.sourceId === characterId || r.targetId === characterId)
          if (chapterNumber) filtered = filtered.filter((r) => r.chapterNumber <= chapterNumber)
          if (filtered.length === 0) return `No relationships for "${characterId}".`
          const latestMap = new Map<string, RelationshipState>()
          for (const r of filtered) {
            const key = [r.sourceId, r.targetId].sort().join("↔")
            const existing = latestMap.get(key)
            if (!existing || r.chapterNumber > existing.chapterNumber) latestMap.set(key, r)
          }
          const lines = [`# Relationships for ${characterId}`, ""]
          for (const r of latestMap.values()) {
            const other = r.sourceId === characterId ? r.targetId : r.sourceId
            lines.push(`- **${other}**: ${r.type} (${r.intensity}/5) — ${r.description}${r.change ? ` [${r.change}]` : ""}`)
          }
          return lines.join("\n")
        }

        case "list_relationship_changes": {
          if (!args.data) return "Error: data required (JSON with chapterNumber)"
          const { chapterNumber } = JSON.parse(args.data)
          const rels: RelationshipState[] = await readJson(relationshipsPath)
          const chapterRels = rels.filter((r) => r.chapterNumber === chapterNumber && r.change)
          if (chapterRels.length === 0) return `No relationship changes in chapter ${chapterNumber}.`
          const lines = [`# Relationship Changes — Chapter ${chapterNumber}`, ""]
          for (const r of chapterRels) {
            lines.push(`- ${r.sourceId} → ${r.targetId}: ${r.type} (${r.intensity}/5) — ${r.change}`)
          }
          return lines.join("\n")
        }

        // ── World State ──

        case "set_world_state": {
          if (!args.data) return "Error: data required (JSON WorldState)"
          const ws: WorldState = JSON.parse(args.data)
          const states: WorldState[] = await readJson(worldStatePath)
          const existingIdx = states.findIndex((s) => s.chapterNumber === ws.chapterNumber)
          if (existingIdx >= 0) {
            states[existingIdx] = ws
          } else {
            states.push(ws)
          }
          states.sort((a, b) => a.chapterNumber - b.chapterNumber)
          await writeJson(worldStatePath, states)
          return `World state for chapter ${ws.chapterNumber} saved.`
        }

        case "get_world_state": {
          if (!args.data) return "Error: data required (JSON with optional chapterNumber)"
          const { chapterNumber } = JSON.parse(args.data)
          const states: WorldState[] = await readJson(worldStatePath)
          if (states.length === 0) return "No world state records."
          let target: WorldState
          if (chapterNumber) {
            const filtered = states.filter((s) => s.chapterNumber <= chapterNumber)
            if (filtered.length === 0) return `No world state before chapter ${chapterNumber}.`
            target = filtered[filtered.length - 1]
          } else {
            target = states[states.length - 1]
          }
          const lines = [`# World State — Chapter ${target.chapterNumber}`]
          if (target.inStoryDate) lines.push(`**Date**: ${target.inStoryDate}`)
          if (target.season) lines.push(`**Season**: ${target.season}`)
          if (target.weather) lines.push(`**Weather**: ${target.weather}`)
          if (target.timeOfDay) lines.push(`**Time**: ${target.timeOfDay}`)
          if (target.majorWorldEvents) lines.push(`**Events**: ${target.majorWorldEvents}`)
          if (target.environmentNotes) lines.push(`**Environment**: ${target.environmentNotes}`)
          return lines.join("\n")
        }

        // ── Factions ──

        case "add_faction": {
          if (!args.data) return "Error: data required (JSON FactionState)"
          const faction: FactionState = JSON.parse(args.data)
          const factions: FactionState[] = await readJson(factionsPath)
          if (factions.some((f) => f.factionId === faction.factionId && f.chapterNumber === faction.chapterNumber))
            return `Faction "${faction.factionId}" at ch.${faction.chapterNumber} already exists. Use update_faction.`
          factions.push(faction)
          factions.sort((a, b) => a.chapterNumber - b.chapterNumber)
          await writeJson(factionsPath, factions)
          return `Faction "${faction.name}" added at ch.${faction.chapterNumber}.`
        }

        case "update_faction": {
          if (!args.data) return "Error: data required (JSON with factionId, chapterNumber, and fields to update)"
          const update = JSON.parse(args.data)
          const factions: FactionState[] = await readJson(factionsPath)
          const idx = factions.findIndex((f) => f.factionId === update.factionId && f.chapterNumber === update.chapterNumber)
          if (idx === -1) {
            const base = [...factions].reverse().find((f) => f.factionId === update.factionId)
            if (!base) return `Faction "${update.factionId}" not found.`
            const newState = { ...base, ...update }
            factions.push(newState)
            factions.sort((a, b) => a.chapterNumber - b.chapterNumber)
            await writeJson(factionsPath, factions)
            return `Faction "${update.factionId}" new state at ch.${update.chapterNumber} created from latest.`
          }
          Object.assign(factions[idx], update)
          await writeJson(factionsPath, factions)
          return `Faction "${update.factionId}" at ch.${update.chapterNumber} updated.`
        }

        case "list_factions": {
          const factions: FactionState[] = await readJson(factionsPath)
          if (factions.length === 0) return "No factions recorded."
          const latestMap = new Map<string, FactionState>()
          for (const f of factions) {
            const existing = latestMap.get(f.factionId)
            if (!existing || f.chapterNumber > existing.chapterNumber) latestMap.set(f.factionId, f)
          }
          const lines = ["# Factions", ""]
          for (const f of latestMap.values()) {
            lines.push(`- **${f.name}** [${f.status}]${f.leader ? ` Leader: ${f.leader}` : ""}${f.territory ? ` Territory: ${f.territory}` : ""}${f.changes ? ` — ${f.changes}` : ""}`)
          }
          return lines.join("\n")
        }

        // ── Secrets ──

        case "add_secret": {
          if (!args.data) return "Error: data required (JSON Secret)"
          const secret: Secret = JSON.parse(args.data)
          const secrets: Secret[] = await readJson(secretsPath)
          if (secrets.some((s) => s.id === secret.id)) return `Secret "${secret.id}" already exists. Use update_secret.`
          secrets.push(secret)
          await writeJson(secretsPath, secrets)
          return `Secret "${secret.id}" added. Total: ${secrets.length}`
        }

        case "update_secret": {
          if (!args.data) return "Error: data required (JSON with id and fields to update)"
          const update = JSON.parse(args.data)
          const secrets: Secret[] = await readJson(secretsPath)
          const idx = secrets.findIndex((s) => s.id === update.id)
          if (idx === -1) return `Secret "${update.id}" not found.`
          Object.assign(secrets[idx], update)
          await writeJson(secretsPath, secrets)
          return `Secret "${update.id}" updated.`
        }

        case "list_secrets": {
          const secrets: Secret[] = await readJson(secretsPath)
          if (secrets.length === 0) return "No secrets recorded."
          const byStatus = { active: [] as Secret[], partially_revealed: [] as Secret[], fully_revealed: [] as Secret[] }
          for (const s of secrets) (byStatus[s.status] ?? byStatus.active).push(s)
          const lines = ["# Secrets", ""]
          for (const [status, list] of Object.entries(byStatus)) {
            if (list.length === 0) continue
            lines.push(`## ${status} (${list.length})`)
            for (const s of list) {
              lines.push(`- **${s.id}** [${s.significance}] (ch.${s.introducedChapter}): ${s.description} — Known by: ${s.knownBy.join(", ")}`)
            }
            lines.push("")
          }
          return lines.join("\n")
        }

        default:
          return `Unknown action: ${args.action}. Valid: add_thread, update_thread, list_threads, check_open_threads, add_event, list_events, set_character_state, get_character_state, add_term, update_term, search_terms, list_terms, set_relationship, get_relationships, list_relationship_changes, set_world_state, get_world_state, add_faction, update_faction, list_factions, add_secret, update_secret, list_secrets`
      }
      } catch (e) {
        return `Error in dickens_consistency: ${(e as Error).message}`
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
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8")
}
