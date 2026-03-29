export interface GlossaryEntry {
  id: string
  term: string
  aliases: string[]
  category: "location" | "organization" | "power_system" | "title" | "object" | "concept" | "custom"
  definition: string
  firstAppearance: number
  constraints?: string
}
