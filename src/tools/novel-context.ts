import { tool } from "@opencode-ai/plugin"
import path from "path"
import { ContextBuilder } from "../context/context-builder.js"

export function createNovelContextTool(baseDir: string) {
  return tool({
    description:
      "Build the writing context for a specific chapter. Assembles relevant summaries, character profiles, scene plans, and style guide into a coherent context document. The Novelist agent should call this before delegating to Scribe.",
    args: {
      projectPath: tool.schema.string("Path to the novel project directory"),
      chapterNumber: tool.schema.number("Chapter number to build context for"),
    },
    async execute(args, context) {
      const projectDir = path.isAbsolute(args.projectPath)
        ? args.projectPath
        : path.join(context.directory || baseDir, args.projectPath)

      const builder = new ContextBuilder(projectDir)
      return builder.buildWritingContext(args.chapterNumber)
    },
  })
}
