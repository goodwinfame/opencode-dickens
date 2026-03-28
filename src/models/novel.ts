export interface NovelProject {
  title: string
  genre: string
  subGenre?: string
  language: string
  targetWordCount: number
  chapterCount: number
  wordsPerChapter: number
  style: NovelStyle
  status: "planning" | "outlining" | "writing" | "editing" | "completed"
  createdAt: string
  updatedAt: string
}

export interface NovelStyle {
  tone: string
  pov: "first" | "third-limited" | "third-omniscient" | "second" | "multiple"
  tense: "past" | "present"
  description: string
}

export const DEFAULT_NOVEL_CONFIG: Partial<NovelProject> = {
  language: "zh-CN",
  targetWordCount: 500000,
  chapterCount: 200,
  wordsPerChapter: 2500,
  status: "planning",
}
