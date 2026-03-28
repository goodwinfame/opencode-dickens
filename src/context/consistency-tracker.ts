import { promises as fs } from "fs"
import path from "path"
import type { PlotThread, TimelineEvent } from "../models/outline.js"
import type { CharacterState } from "../models/character.js"

/**
 * Tracks consistency data across the novel to prevent
 * continuity errors in long-form writing.
 */
export class ConsistencyTracker {
  private projectDir: string

  constructor(projectDir: string) {
    this.projectDir = projectDir
  }

  // --- Plot Threads ---

  async getOpenThreads(): Promise<PlotThread[]> {
    const threads = await this.readThreads()
    return threads.filter((t) => t.status !== "resolved")
  }

  async getThreadsByChapter(chapterNumber: number): Promise<PlotThread[]> {
    const threads = await this.readThreads()
    return threads.filter(
      (t) =>
        t.introducedChapter <= chapterNumber &&
        (t.status !== "resolved" || (t.resolvedChapter && t.resolvedChapter >= chapterNumber)),
    )
  }

  async addThread(thread: PlotThread): Promise<void> {
    const threads = await this.readThreads()
    threads.push(thread)
    await this.writeThreads(threads)
  }

  async updateThread(
    threadId: string,
    updates: Partial<PlotThread>,
  ): Promise<boolean> {
    const threads = await this.readThreads()
    const idx = threads.findIndex((t) => t.id === threadId)
    if (idx === -1) return false
    Object.assign(threads[idx], updates)
    await this.writeThreads(threads)
    return true
  }

  // --- Timeline ---

  async getTimelineRange(
    startChapter: number,
    endChapter: number,
  ): Promise<TimelineEvent[]> {
    const timeline = await this.readTimeline()
    return timeline.filter(
      (e) => e.chapter >= startChapter && e.chapter <= endChapter,
    )
  }

  async addTimelineEvent(event: TimelineEvent): Promise<void> {
    const timeline = await this.readTimeline()
    timeline.push(event)
    timeline.sort((a, b) => a.chapter - b.chapter)
    await this.writeTimeline(timeline)
  }

  // --- Character States ---

  async getCharacterState(
    characterId: string,
    atChapter: number,
  ): Promise<CharacterState | null> {
    const states = await this.readCharacterStates()
    const relevant = states
      .filter(
        (s) => s.characterId === characterId && s.chapterNumber <= atChapter,
      )
      .sort((a, b) => b.chapterNumber - a.chapterNumber)
    return relevant[0] ?? null
  }

  async getAllCharacterStatesAtChapter(
    atChapter: number,
  ): Promise<Map<string, CharacterState>> {
    const states = await this.readCharacterStates()
    const latest = new Map<string, CharacterState>()

    for (const state of states) {
      if (state.chapterNumber > atChapter) continue
      const existing = latest.get(state.characterId)
      if (!existing || existing.chapterNumber < state.chapterNumber) {
        latest.set(state.characterId, state)
      }
    }
    return latest
  }

  async setCharacterState(state: CharacterState): Promise<void> {
    const states = await this.readCharacterStates()
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
    await this.writeCharacterStates(states)
  }

  // --- Consistency Report ---

  async generateConsistencyReport(upToChapter: number): Promise<string> {
    const lines: string[] = ["# Consistency Report", ""]

    const openThreads = await this.getOpenThreads()
    lines.push(`## Open Plot Threads (${openThreads.length})`)
    if (openThreads.length === 0) {
      lines.push("All threads resolved.")
    } else {
      for (const t of openThreads) {
        const age = upToChapter - t.introducedChapter
        const warning = age > 50 ? " **[STALE - open for 50+ chapters]**" : ""
        lines.push(
          `- **${t.name}** [${t.status}] (ch.${t.introducedChapter}, age: ${age} chapters)${warning}`,
        )
      }
    }
    lines.push("")

    const timeline = await this.getTimelineRange(1, upToChapter)
    const criticalEvents = timeline.filter(
      (e) => e.significance === "critical" || e.significance === "major",
    )
    lines.push(`## Major Events (${criticalEvents.length})`)
    for (const e of criticalEvents.slice(-10)) {
      lines.push(
        `- Ch.${e.chapter}: ${e.description} (${e.characters.join(", ")})`,
      )
    }
    lines.push("")

    return lines.join("\n")
  }

  // --- Private I/O helpers ---

  private async readThreads(): Promise<PlotThread[]> {
    return this.readJsonArray(path.join(this.projectDir, "metadata", "threads.json"))
  }

  private async writeThreads(threads: PlotThread[]): Promise<void> {
    await this.writeJson(
      path.join(this.projectDir, "metadata", "threads.json"),
      threads,
    )
  }

  private async readTimeline(): Promise<TimelineEvent[]> {
    return this.readJsonArray(path.join(this.projectDir, "metadata", "timeline.json"))
  }

  private async writeTimeline(timeline: TimelineEvent[]): Promise<void> {
    await this.writeJson(
      path.join(this.projectDir, "metadata", "timeline.json"),
      timeline,
    )
  }

  private async readCharacterStates(): Promise<CharacterState[]> {
    return this.readJsonArray(
      path.join(this.projectDir, "metadata", "character-states.json"),
    )
  }

  private async writeCharacterStates(states: CharacterState[]): Promise<void> {
    await this.writeJson(
      path.join(this.projectDir, "metadata", "character-states.json"),
      states,
    )
  }

  private async readJsonArray<T>(filePath: string): Promise<T[]> {
    try {
      const content = await fs.readFile(filePath, "utf-8")
      return JSON.parse(content)
    } catch {
      return []
    }
  }

  private async writeJson(filePath: string, data: unknown): Promise<void> {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8")
  }
}
