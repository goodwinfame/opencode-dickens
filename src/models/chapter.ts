export interface Chapter {
  number: number
  title: string
  arcIndex: number
  status: "planned" | "drafted" | "revised" | "final"
  wordCount: number
  scenePlan: string
  characters: string[]
  plotThreads: string[]
  createdAt?: string
  updatedAt?: string
}

export interface ChapterSummary {
  chapterNumber: number
  title: string
  summary: string
  keyEvents: string[]
  characterAppearances: string[]
  plotAdvances: string[]
  emotionalTone: string
  wordCount: number
}

export interface ArcSummary {
  arcIndex: number
  title: string
  chapters: number[]
  summary: string
  majorEvents: string[]
  characterDevelopment: string[]
  themesExplored: string[]
}
