import type { Plugin } from "@opencode-ai/plugin"
import { createNovelTools } from "./tools/index.js"
import { ContextBuilder } from "./context/context-builder.js"
import { SummaryManager } from "./context/summary-manager.js"

export const DickensPlugin: Plugin = async (ctx) => {
  const tools = createNovelTools(ctx.directory)

  return {
    tool: tools,

    "tool.execute.before": async (input, output) => {
      // Inject writing context when Scribe is about to write a chapter
      if (input.tool === "dickens_write_chapter" && output.args.projectPath) {
        const builder = new ContextBuilder(output.args.projectPath)
        const context = await builder.buildWritingContext(
          output.args.chapterNumber ?? 1,
        )
        // Attach context as metadata for the agent to use
        if (!output.args._writingContext) {
          output.args._writingContext = context
        }
      }
    },

    "tool.execute.after": async (input, _output) => {
      // After a chapter is written, check if summaries need refresh
      if (input.tool === "dickens_write_chapter" && input.args?.projectPath) {
        const summaryMgr = new SummaryManager(input.args.projectPath as string)
        const chapterNum = input.args.chapterNumber as number

        if (await summaryMgr.shouldRefreshGlobalSummary(chapterNum)) {
          // The Novelist agent should handle this via the workflow,
          // but we log it as a reminder
        }
      }
    },

    event: async ({ event }) => {
      if (event.type === "session.idle") {
        // Session went idle — novel writing session may have paused
      }
    },
  }
}
