export interface StoryOutline {
  synopsis: string
  structure: StoryStructure
  arcs: StoryArc[]
  themes: string[]
}

export interface StoryStructure {
  type: "three-act" | "four-act" | "episodic" | "custom"
  description: string
  acts: Act[]
}

export interface Act {
  name: string
  description: string
  startChapter: number
  endChapter: number
}

export interface StoryArc {
  index: number
  title: string
  description: string
  startChapter: number
  endChapter: number
  keyEvents: string[]
  climax: string
  resolution: string
}

export interface PlotThread {
  id: string
  name: string
  description: string
  status: "open" | "developing" | "climax" | "resolved"
  introducedChapter: number
  resolvedChapter?: number
  relatedCharacters: string[]
  keyMoments: { chapter: number; description: string }[]
}

export interface TimelineEvent {
  id: string
  chapter: number
  timestamp: string
  description: string
  characters: string[]
  location: string
  significance: "minor" | "moderate" | "major" | "critical"
}

export interface WriterState {
  currentChapter: number
  currentArc: number
  totalChaptersWritten: number
  totalWordCount: number
  lastWrittenAt: string
  chaptersCompleted: number[]
  checkpoints: Checkpoint[]
}

export interface Checkpoint {
  chapter: number
  timestamp: string
  wordCount: number
  notes?: string
}
