import { createNovelInitTool } from "./novel-init.js"
import { createNovelStatusTool } from "./novel-status.js"
import { createNovelWriteTool } from "./novel-write.js"
import { createNovelOutlineTool } from "./novel-outline.js"
import { createNovelCharacterTool } from "./novel-character.js"
import { createNovelWorldTool } from "./novel-world.js"
import { createNovelSummaryTool } from "./novel-summary.js"
import { createNovelConsistencyTool } from "./novel-consistency.js"
import { createNovelExportTool } from "./novel-export.js"
import { createNovelContextTool } from "./novel-context.js"

export function createNovelTools(baseDir: string) {
  return {
    dickens_init: createNovelInitTool(baseDir),
    dickens_status: createNovelStatusTool(baseDir),
    dickens_write_chapter: createNovelWriteTool(baseDir),
    dickens_outline: createNovelOutlineTool(baseDir),
    dickens_character: createNovelCharacterTool(baseDir),
    dickens_world: createNovelWorldTool(baseDir),
    dickens_summary: createNovelSummaryTool(baseDir),
    dickens_consistency: createNovelConsistencyTool(baseDir),
    dickens_export: createNovelExportTool(baseDir),
    dickens_context: createNovelContextTool(baseDir),
  }
}
