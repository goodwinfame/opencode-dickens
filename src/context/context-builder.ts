import { promises as fs } from "fs"
import path from "path"
import type { NovelProject } from "../models/novel.js"
import type { CharacterIndex } from "../models/character.js"

/**
 * Assembles the writing context that gets injected into the Scribe agent
 * when writing a chapter. This is the key mechanism that enables coherent
 * writing across hundreds of chapters within limited context windows.
 *
 * Context budget target: ~8,000-12,000 tokens to leave room for generation.
 */
export class ContextBuilder {
  private projectDir: string

  constructor(projectDir: string) {
    this.projectDir = projectDir
  }

  async buildWritingContext(chapterNumber: number): Promise<string> {
    const sections: string[] = []

    const project = await this.readProject()
    if (!project) return "Error: novel.json not found. Initialize the project first."

    sections.push(this.buildProjectHeader(project, chapterNumber))

    const styleGuide = await this.readStyleGuide()
    if (styleGuide) {
      sections.push("## 文风指南\n\n" + this.truncate(styleGuide, 800))
    }

    const scenePlan = await this.readScenePlan(chapterNumber, project)
    if (scenePlan) {
      sections.push("## 本章写作计划\n\n" + scenePlan)
    }

    const characterContext = await this.buildCharacterContext(chapterNumber)
    if (characterContext) {
      sections.push("## 本章相关角色\n\n" + characterContext)
    }

    const recentSummaries = await this.readRecentSummaries(chapterNumber, 3)
    if (recentSummaries) {
      sections.push("## 前文摘要\n\n" + recentSummaries)
    }

    const arcSummary = await this.readCurrentArcSummary(chapterNumber, project)
    if (arcSummary) {
      sections.push("## 当前弧段概况\n\n" + this.truncate(arcSummary, 1000))
    }

    const globalSummary = await this.readGlobalSummary()
    if (globalSummary) {
      sections.push("## 全书概要\n\n" + this.truncate(globalSummary, 1200))
    }

    const openThreads = await this.readOpenThreads()
    if (openThreads) {
      sections.push("## 待处理情节线索\n\n" + openThreads)
    }

    return sections.join("\n\n---\n\n")
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
      const latest = charStates[0]
      return [
        `位置: ${latest.location}`,
        `情绪: ${latest.emotionalState}`,
        `近期变化: ${latest.changes?.join("; ") ?? "无"}`,
      ].join("\n")
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
}
