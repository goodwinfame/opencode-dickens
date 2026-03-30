import { tool } from "@opencode-ai/plugin"
import { ContextBuilder } from "../context/context-builder.js"
import { resolveProjectDir } from "./resolve-project.js"

export function createNovelContextTool(baseDir: string) {
  return tool({
    description:
      "Build the writing context for a specific chapter. Assembles relevant summaries, character profiles, scene plans, and style guide into a coherent context document. The Novelist agent should call this before delegating to Scribe.",
    args: {
      projectPath: tool.schema.string("Path to the novel project directory"),
      chapterNumber: tool.schema.number("Chapter number to build context for"),
    },
    async execute(args, context) {
      try {
        const projectDir = await resolveProjectDir(args.projectPath, context.directory, baseDir)
        if (!projectDir) return `Error: No novel project found. Use dickens_init first.`

        const builder = new ContextBuilder(projectDir)
        return builder.buildWritingContext(args.chapterNumber)
      } catch (e) {
        return `Error in dickens_context: ${(e as Error).message}`
      }
    },
  })
}
