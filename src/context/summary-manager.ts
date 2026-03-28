import { promises as fs } from "fs"
import path from "path"
import type { NovelProject } from "../models/novel.js"
import type { ChapterSummary, ArcSummary } from "../models/chapter.js"

/**
 * Manages the hierarchical summary system that enables coherent writing
 * across hundreds of chapters. Three levels:
 *
 * Level 0: Full chapter text (on disk, never loaded in bulk)
 * Level 1: Chapter summaries (500-800 chars each)
 * Level 2: Arc summaries (cover 10-20 chapters)
 * Level 3: Global summary (entire novel overview)
 */
export class SummaryManager {
  private projectDir: string

  constructor(projectDir: string) {
    this.projectDir = projectDir
  }

  async getChapterSummary(chapterNumber: number): Promise<string | null> {
    const num = String(chapterNumber).padStart(3, "0")
    try {
      return await fs.readFile(
        path.join(this.projectDir, "summaries", "chapters", `${num}.md`),
        "utf-8",
      )
    } catch {
      return null
    }
  }

  async saveChapterSummary(chapterNumber: number, content: string): Promise<void> {
    const num = String(chapterNumber).padStart(3, "0")
    const dir = path.join(this.projectDir, "summaries", "chapters")
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(path.join(dir, `${num}.md`), content, "utf-8")
  }

  async getRecentSummaries(beforeChapter: number, count: number): Promise<string[]> {
    const summaries: string[] = []
    for (let i = beforeChapter - 1; i >= Math.max(1, beforeChapter - count); i--) {
      const summary = await this.getChapterSummary(i)
      if (summary) summaries.push(summary)
    }
    return summaries
  }

  async getArcSummary(arcIndex: number): Promise<string | null> {
    const arcNum = String(arcIndex).padStart(2, "0")
    try {
      return await fs.readFile(
        path.join(this.projectDir, "summaries", "arcs", `arc-${arcNum}.md`),
        "utf-8",
      )
    } catch {
      return null
    }
  }

  async saveArcSummary(arcIndex: number, content: string): Promise<void> {
    const arcNum = String(arcIndex).padStart(2, "0")
    const dir = path.join(this.projectDir, "summaries", "arcs")
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(path.join(dir, `arc-${arcNum}.md`), content, "utf-8")
  }

  async getGlobalSummary(): Promise<string | null> {
    try {
      return await fs.readFile(
        path.join(this.projectDir, "summaries", "global.md"),
        "utf-8",
      )
    } catch {
      return null
    }
  }

  async saveGlobalSummary(content: string): Promise<void> {
    await fs.writeFile(
      path.join(this.projectDir, "summaries", "global.md"),
      content,
      "utf-8",
    )
  }

  /**
   * Determines if the current chapter is at an arc boundary.
   * Arc boundaries are natural points for higher-level review and summary.
   */
  async isArcBoundary(chapterNumber: number): Promise<boolean> {
    const project = await this.readProject()
    if (!project) return false

    const chaptersPerArc = Math.ceil(project.chapterCount / 10)
    return chapterNumber % chaptersPerArc === 0
  }

  /**
   * Determines if global summary should be refreshed.
   * Triggers every 5 chapters or at arc boundaries.
   */
  async shouldRefreshGlobalSummary(chapterNumber: number): Promise<boolean> {
    if (chapterNumber % 5 === 0) return true
    return this.isArcBoundary(chapterNumber)
  }

  /**
   * Returns statistics about the summary coverage.
   */
  async getSummaryStats(): Promise<SummaryStats> {
    const chapDir = path.join(this.projectDir, "summaries", "chapters")
    const arcDir = path.join(this.projectDir, "summaries", "arcs")

    let chapterSummaryCount = 0
    let arcSummaryCount = 0
    let hasGlobalSummary = false

    try {
      const chapFiles = await fs.readdir(chapDir)
      chapterSummaryCount = chapFiles.filter((f) => f.endsWith(".md")).length
    } catch {
      // Directory doesn't exist yet
    }

    try {
      const arcFiles = await fs.readdir(arcDir)
      arcSummaryCount = arcFiles.filter((f) => f.endsWith(".md")).length
    } catch {
      // Directory doesn't exist yet
    }

    try {
      await fs.access(path.join(this.projectDir, "summaries", "global.md"))
      hasGlobalSummary = true
    } catch {
      // Global summary doesn't exist yet
    }

    const project = await this.readProject()
    const totalChapters = project?.chapterCount ?? 0

    let writtenChapters = 0
    try {
      const chapFiles = await fs.readdir(path.join(this.projectDir, "chapters"))
      writtenChapters = chapFiles.filter((f) => f.endsWith(".md")).length
    } catch {
      // No chapters yet
    }

    const missingSummaries: number[] = []
    for (let i = 1; i <= writtenChapters; i++) {
      const summary = await this.getChapterSummary(i)
      if (!summary) missingSummaries.push(i)
    }

    return {
      chapterSummaryCount,
      arcSummaryCount,
      hasGlobalSummary,
      writtenChapters,
      totalChapters,
      missingSummaries,
      coveragePercent:
        writtenChapters > 0
          ? Math.round((chapterSummaryCount / writtenChapters) * 100)
          : 100,
    }
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
}

export interface SummaryStats {
  chapterSummaryCount: number
  arcSummaryCount: number
  hasGlobalSummary: boolean
  writtenChapters: number
  totalChapters: number
  missingSummaries: number[]
  coveragePercent: number
}
