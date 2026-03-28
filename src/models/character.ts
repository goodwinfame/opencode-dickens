export interface Character {
  id: string
  name: string
  aliases: string[]
  role: "protagonist" | "antagonist" | "supporting" | "minor"
  description: string
  personality: string
  background: string
  goals: string[]
  relationships: CharacterRelationship[]
  firstAppearance?: number
  arc?: string
}

export interface CharacterRelationship {
  targetId: string
  targetName: string
  type: string
  description: string
}

export interface CharacterState {
  characterId: string
  chapterNumber: number
  location: string
  emotionalState: string
  knownInformation: string[]
  changes: string[]
}

export interface CharacterIndex {
  characters: Character[]
  lastUpdated: string
}
