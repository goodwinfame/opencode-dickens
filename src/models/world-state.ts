export interface WorldState {
  chapterNumber: number
  inStoryDate?: string
  season?: string
  weather?: string
  timeOfDay?: string
  majorWorldEvents?: string
  environmentNotes?: string
}

export interface FactionState {
  factionId: string
  name: string
  chapterNumber: number
  status: "active" | "weakened" | "destroyed" | "merged" | "hidden"
  leader?: string
  keyMembers?: string[]
  territory?: string
  alliances?: { targetFaction: string; type: "allied" | "hostile" | "neutral" | "vassal" }[]
  changes?: string
}

export interface Secret {
  id: string
  description: string
  introducedChapter: number
  knownBy: string[]
  unknownBy?: string[]
  revealedChapter?: number
  status: "active" | "partially_revealed" | "fully_revealed"
  significance: "minor" | "major" | "critical"
}
