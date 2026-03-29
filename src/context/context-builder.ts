import { promises as fs } from "fs"
import path from "path"
import type { NovelProject } from "../models/novel.js"
import type { CharacterIndex, CharacterState, RelationshipState } from "../models/character.js"
import type { GlossaryEntry } from "../models/glossary.js"
import type { WorldState, FactionState, Secret } from "../models/world-state.js"
import type { TimelineEvent } from "../models/outline.js"

interface ContextSection {
  title: string
  content: string
  priority: 0 | 1 | 2
}

const TOTAL_BUDGET_CHARS = 54000

/**
 * Assembles the writing context that gets injected into the Scribe agent
 * when writing a chapter. Uses priority-based budget management to fit
 * all 12 consistency dimensions within ~12-18K tokens.
 *
 * Priority levels:
 *   P0 (must inject): project header, chapter plan, recent summaries, character states
 *   P1 (important):   world rules, glossary, relationships, timeline, secrets, style guide
 *   P2 (if space):    geography, factions, global summary, arc summary
 */
export class ContextBuilder {
  private projectDir: string

  constructor(projectDir: string) {
    this.projectDir = projectDir
  }

  async buildWritingContext(chapterNumber: number): Promise<string> {
    const project = await this.readProject()
    if (!project) return "Error: novel.json not found. Initialize the project first."

    const pending: ContextSection[] = []

    // ── P0: Must inject ──
    pending.push({ title: "", content: this.buildProjectHeader(project, chapterNumber), priority: 0 })

    const scenePlan = await this.readScenePlan(chapterNumber, project)
    if (scenePlan) pending.push({ title: "本章写作计划", content: scenePlan, priority: 0 })

    const recentSummaries = await this.readRecentSummaries(chapterNumber, 3)
    if (recentSummaries) pending.push({ title: "前文摘要", content: recentSummaries, priority: 0 })

    const characterContext = await this.buildCharacterContext(chapterNumber)
    if (characterContext) pending.push({ title: "本章相关角色", content: characterContext, priority: 0 })

    // ── P1: Important ──
    const styleGuide = await this.readStyleGuide()
    if (styleGuide) pending.push({ title: "文风指南", content: this.truncate(styleGuide, 800), priority: 1 })

    const worldRules = await this.readFile("worldbuilding", "rules.md")
    if (worldRules) pending.push({ title: "世界规则", content: this.truncate(worldRules, 1200), priority: 1 })

    const glossarySection = await this.buildGlossaryContext()
    if (glossarySection) pending.push({ title: "术语表", content: glossarySection, priority: 1 })

    const relationshipsSection = await this.buildRelationshipsContext(chapterNumber)
    if (relationshipsSection) pending.push({ title: "角色关系", content: relationshipsSection, priority: 1 })

    const timelineSection = await this.buildTimelineContext(chapterNumber)
    if (timelineSection) pending.push({ title: "近期时间线", content: timelineSection, priority: 1 })

    const secretsSection = await this.buildSecretsContext(chapterNumber)
    if (secretsSection) pending.push({ title: "秘密/信息差", content: secretsSection, priority: 1 })

    const worldStateSection = await this.buildWorldStateContext(chapterNumber)
    if (worldStateSection) pending.push({ title: "世界时间与环境", content: worldStateSection, priority: 1 })

    const openThreads = await this.readOpenThreads()
    if (openThreads) pending.push({ title: "待处理情节线索", content: openThreads, priority: 1 })

    // ── P2: If space permits ──
    const locationsSection = await this.buildLocationsContext()
    if (locationsSection) pending.push({ title: "地理/场所", content: this.truncate(locationsSection, 1000), priority: 2 })

    const factionsSection = await this.buildFactionsContext()
    if (factionsSection) pending.push({ title: "组织/阵营", content: factionsSection, priority: 2 })

    const arcSummary = await this.readCurrentArcSummary(chapterNumber, project)
    if (arcSummary) pending.push({ title: "当前弧段概况", content: this.truncate(arcSummary, 1000), priority: 2 })

    const globalSummary = await this.readGlobalSummary()
    if (globalSummary) pending.push({ title: "全书概要", content: this.truncate(globalSummary, 1200), priority: 2 })

    return this.assembleWithBudget(pending)
  }

  private assembleWithBudget(sections: ContextSection[]): string {
    const result: string[] = []
    let used = 0

    for (const priority of [0, 1, 2] as const) {
      for (const s of sections.filter((sec) => sec.priority === priority)) {
        const formatted = s.title ? `## ${s.title}\n\n${s.content}` : s.content
        const cost = formatted.length
        if (used + cost > TOTAL_BUDGET_CHARS && priority > 0) continue
        result.push(formatted)
        used += cost
      }
    }

    return result.join("\n\n---\n\n")
  }

  private buildProjectHeader(project: NovelProject, chapterNumber: number): string {
    return [
      `# 写作上下文：第${chapterNumber}章`,
      "",
      `**小说**: ${project.title}`,
      `**类型**: ${project.genre}${project.subGenre ? ` / ${project.subGenre}` : ""}`,
      `**视角**: ${project.style.pov} | **时态**: ${project.style.tense}`,
      `**目标字数/章**: ~${project.wordsPerChapter} 字`,
    ].join("\n")
  }

  private async readProject(): Promise<NovelProject | null> {
    try {
      const content = await fs.readFile(
        path.join(this.projectDir, "novel.json"),
        "utf-8",
      )
      return JSON.parse(content)
    } catch {
      return null
    }
  }

  private async readStyleGuide(): Promise<string | null> {
    try {
      return await fs.readFile(
        path.join(this.projectDir, "metadata", "style-guide.md"),
        "utf-8",
      )
    } catch {
      return null
    }
  }

  private async readScenePlan(
    chapterNumber: number,
    project: NovelProject,
  ): Promise<string | null> {
    const arcIndex = this.getArcIndex(chapterNumber, project)
    const arcNum = String(arcIndex).padStart(2, "0")
    try {
      const arcContent = await fs.readFile(
        path.join(this.projectDir, "outline", "chapters", `arc-${arcNum}.md`),
        "utf-8",
      )
      return this.extractChapterPlan(arcContent, chapterNumber)
    } catch {
      return null
    }
  }

  private async buildCharacterContext(chapterNumber: number): Promise<string | null> {
    try {
      const indexContent = await fs.readFile(
        path.join(this.projectDir, "characters", "index.json"),
        "utf-8",
      )
      const index: CharacterIndex = JSON.parse(indexContent)

      if (index.characters.length === 0) return null

      // Try to find which characters appear in this chapter from the scene plan
      // If we can't determine, include protagonist + antagonist + recent characters
      const profiles: string[] = []
      const mainCharacters = index.characters.filter(
        (c) => c.role === "protagonist" || c.role === "antagonist",
      )

      // Always include main characters
      for (const char of mainCharacters.slice(0, 4)) {
        const profile = await this.readCharacterProfile(char.id)
        if (profile) {
          profiles.push(this.truncate(profile, 600))
        }
      }

      // Include supporting characters with recent state data
      const supportingChars = index.characters.filter(
        (c) => c.role === "supporting",
      )
      for (const char of supportingChars.slice(0, 3)) {
        const state = await this.getLatestCharacterState(char.id, chapterNumber)
        if (state) {
          profiles.push(
            `### ${char.name}\n${state}`,
          )
        }
      }

      return profiles.length > 0 ? profiles.join("\n\n") : null
    } catch {
      return null
    }
  }

  private async readCharacterProfile(characterId: string): Promise<string | null> {
    try {
      return await fs.readFile(
        path.join(this.projectDir, "characters", "profiles", `${characterId}.md`),
        "utf-8",
      )
    } catch {
      return null
    }
  }

  private async getLatestCharacterState(
    characterId: string,
    beforeChapter: number,
  ): Promise<string | null> {
    try {
      const statesContent = await fs.readFile(
        path.join(this.projectDir, "metadata", "character-states.json"),
        "utf-8",
      )
      const states = JSON.parse(statesContent)
      const charStates = states
        .filter(
          (s: { characterId: string; chapterNumber: number }) =>
            s.characterId === characterId && s.chapterNumber < beforeChapter,
        )
        .sort(
          (a: { chapterNumber: number }, b: { chapterNumber: number }) =>
            b.chapterNumber - a.chapterNumber,
        )

      if (charStates.length === 0) return null
      const latest = charStates[0] as CharacterState
      const lines = [
        `位置: ${latest.location}`,
        `情绪: ${latest.emotionalState}`,
        `近期变化: ${latest.changes?.join("; ") ?? "无"}`,
      ]
      if (latest.isAlive === false) lines.push(`**已死亡** (第${latest.deathChapter}章): ${latest.deathCause}`)
      if (latest.powerLevel) lines.push(`实力: ${latest.powerLevel}`)
      if (latest.abilities?.length) lines.push(`能力: ${latest.abilities.join(", ")}`)
      if (latest.powerChanges) lines.push(`实力变化: ${latest.powerChanges}`)
      if (latest.inventory?.length) lines.push(`持有物品: ${latest.inventory.join(", ")}`)
      if (latest.inventoryChanges) lines.push(`物品变化: ${latest.inventoryChanges}`)
      if (latest.physicalCondition) lines.push(`身体状态: ${latest.physicalCondition}`)
      if (latest.physicalChanges) lines.push(`身体变化: ${latest.physicalChanges}`)
      if (latest.appearanceNotes) lines.push(`外貌: ${latest.appearanceNotes}`)
      return lines.join("\n")
    } catch {
      return null
    }
  }

  private async readRecentSummaries(
    chapterNumber: number,
    count: number,
  ): Promise<string | null> {
    const summaries: string[] = []
    for (let i = chapterNumber - 1; i >= Math.max(1, chapterNumber - count); i--) {
      const num = String(i).padStart(3, "0")
      try {
        const content = await fs.readFile(
          path.join(this.projectDir, "summaries", "chapters", `${num}.md`),
          "utf-8",
        )
        summaries.push(this.truncate(content, 1000))
      } catch {
        // Summary may not exist yet
      }
    }
    return summaries.length > 0 ? summaries.join("\n\n---\n\n") : null
  }

  private async readCurrentArcSummary(
    chapterNumber: number,
    project: NovelProject,
  ): Promise<string | null> {
    const currentArcIndex = this.getArcIndex(chapterNumber, project)
    // Read the previous arc's summary (current arc is being written)
    if (currentArcIndex <= 1) return null
    const prevArcNum = String(currentArcIndex - 1).padStart(2, "0")
    try {
      return await fs.readFile(
        path.join(this.projectDir, "summaries", "arcs", `arc-${prevArcNum}.md`),
        "utf-8",
      )
    } catch {
      return null
    }
  }

  private async readGlobalSummary(): Promise<string | null> {
    try {
      return await fs.readFile(
        path.join(this.projectDir, "summaries", "global.md"),
        "utf-8",
      )
    } catch {
      return null
    }
  }

  private async readOpenThreads(): Promise<string | null> {
    try {
      const threadsContent = await fs.readFile(
        path.join(this.projectDir, "metadata", "threads.json"),
        "utf-8",
      )
      const threads = JSON.parse(threadsContent)
      const open = threads.filter(
        (t: { status: string }) => t.status !== "resolved",
      )
      if (open.length === 0) return null
      return open
        .map(
          (t: { name: string; status: string; description: string }) =>
            `- **${t.name}** [${t.status}]: ${t.description}`,
        )
        .join("\n")
    } catch {
      return null
    }
  }

  private getArcIndex(chapterNumber: number, project: NovelProject): number {
    const chaptersPerArc = Math.ceil(project.chapterCount / 10)
    return Math.ceil(chapterNumber / chaptersPerArc)
  }

  private extractChapterPlan(arcContent: string, chapterNumber: number): string | null {
    const patterns = [
      new RegExp(
        `(?:^|\\n)###?\\s*(?:第${chapterNumber}章|Chapter\\s*${chapterNumber}|${chapterNumber}[.、])([\\s\\S]*?)(?=\\n###?\\s|$)`,
      ),
      new RegExp(
        `(?:^|\\n)[-*]\\s*(?:第${chapterNumber}章|Chapter\\s*${chapterNumber})([\\s\\S]*?)(?=\\n[-*]\\s*(?:第|Chapter)|$)`,
      ),
    ]

    for (const pattern of patterns) {
      const match = arcContent.match(pattern)
      if (match) return match[0].trim()
    }

    return null
  }

  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength) + "\n\n...(已截断)"
  }

  // ── New data source methods ──

  private async readFile(...segments: string[]): Promise<string | null> {
    try {
      return await fs.readFile(path.join(this.projectDir, ...segments), "utf-8")
    } catch {
      return null
    }
  }

  private async readJsonSafe<T>(filePath: string): Promise<T[]> {
    try {
      return JSON.parse(await fs.readFile(path.join(this.projectDir, filePath), "utf-8"))
    } catch {
      return []
    }
  }

  private async buildGlossaryContext(): Promise<string | null> {
    const glossary = await this.readJsonSafe<GlossaryEntry>("metadata/glossary.json")
    if (glossary.length === 0) return null
    const priority = ["power_system", "concept", "title", "object"]
    const sorted = [...glossary].sort((a, b) => {
      const ai = priority.indexOf(a.category)
      const bi = priority.indexOf(b.category)
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
    })
    const lines = sorted.slice(0, 30).map(
      (g) => `- **${g.term}**${g.aliases.length ? ` (${g.aliases.join(", ")})` : ""} [${g.category}]: ${g.definition}${g.constraints ? ` ⚠${g.constraints}` : ""}`,
    )
    return lines.join("\n")
  }

  private async buildRelationshipsContext(chapterNumber: number): Promise<string | null> {
    const rels = await this.readJsonSafe<RelationshipState>("metadata/relationships.json")
    if (rels.length === 0) return null
    const relevant = rels.filter((r) => r.chapterNumber < chapterNumber)
    const latestMap = new Map<string, RelationshipState>()
    for (const r of relevant) {
      const key = [r.sourceId, r.targetId].sort().join("↔")
      const existing = latestMap.get(key)
      if (!existing || r.chapterNumber > existing.chapterNumber) latestMap.set(key, r)
    }
    if (latestMap.size === 0) return null
    const lines: string[] = []
    for (const r of latestMap.values()) {
      lines.push(`- ${r.sourceId} ↔ ${r.targetId}: ${r.type} (${r.intensity}/5) — ${r.description}`)
    }
    return lines.join("\n")
  }

  private async buildTimelineContext(chapterNumber: number): Promise<string | null> {
    const timeline = await this.readJsonSafe<TimelineEvent>("metadata/timeline.json")
    if (timeline.length === 0) return null
    const recent = timeline
      .filter((e) => e.chapter < chapterNumber)
      .slice(-10)
    if (recent.length === 0) return null
    return recent
      .map((e) => `- Ch.${e.chapter} [${e.significance}]: ${e.description} (${e.location})`)
      .join("\n")
  }

  private async buildSecretsContext(chapterNumber: number): Promise<string | null> {
    const secrets = await this.readJsonSafe<Secret>("metadata/secrets.json")
    const active = secrets.filter(
      (s) => s.status !== "fully_revealed" && s.introducedChapter <= chapterNumber,
    )
    if (active.length === 0) return null
    return active
      .map(
        (s) =>
          `- **${s.id}** [${s.significance}]: ${s.description}\n  知情: ${s.knownBy.join(", ")}${s.unknownBy?.length ? ` | 不知情: ${s.unknownBy.join(", ")}` : ""}`,
      )
      .join("\n")
  }

  private async buildWorldStateContext(chapterNumber: number): Promise<string | null> {
    const states = await this.readJsonSafe<WorldState>("metadata/world-state.json")
    if (states.length === 0) return null
    const filtered = states.filter((s) => s.chapterNumber <= chapterNumber)
    if (filtered.length === 0) return null
    const latest = filtered[filtered.length - 1]
    const lines: string[] = []
    if (latest.inStoryDate) lines.push(`故事日期: ${latest.inStoryDate}`)
    if (latest.season) lines.push(`季节: ${latest.season}`)
    if (latest.weather) lines.push(`天气: ${latest.weather}`)
    if (latest.timeOfDay) lines.push(`时段: ${latest.timeOfDay}`)
    if (latest.majorWorldEvents) lines.push(`大事件: ${latest.majorWorldEvents}`)
    if (latest.environmentNotes) lines.push(`环境: ${latest.environmentNotes}`)
    return lines.length > 0 ? lines.join("\n") : null
  }

  private async buildLocationsContext(): Promise<string | null> {
    return this.readFile("worldbuilding", "locations.md")
  }

  private async buildFactionsContext(): Promise<string | null> {
    const factions = await this.readJsonSafe<FactionState>("metadata/factions.json")
    if (factions.length === 0) return null
    const latestMap = new Map<string, FactionState>()
    for (const f of factions) {
      const existing = latestMap.get(f.factionId)
      if (!existing || f.chapterNumber > existing.chapterNumber) latestMap.set(f.factionId, f)
    }
    const lines: string[] = []
    for (const f of latestMap.values()) {
      lines.push(`- **${f.name}** [${f.status}]${f.leader ? ` 领袖: ${f.leader}` : ""}${f.territory ? ` 领地: ${f.territory}` : ""}${f.changes ? ` — ${f.changes}` : ""}`)
    }
    return lines.join("\n")
  }
}
