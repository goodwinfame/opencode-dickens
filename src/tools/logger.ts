import { promises as fs } from "fs"
import path from "path"
import type { ToolDefinition, ToolContext } from "@opencode-ai/plugin"

const LOG_FILENAME = "dickens-debug.log"

function timestamp(): string {
  return new Date().toISOString().replace("T", " ").replace(/\.\d+Z$/, "")
}

function summarizeArgs(args: Record<string, unknown>): string {
  const parts: string[] = []
  for (const [key, value] of Object.entries(args)) {
    if (key === "content" || key === "profileContent" || key === "data") {
      const str = String(value ?? "")
      parts.push(`${key}=(${str.length} chars)`)
    } else {
      parts.push(`${key}=${JSON.stringify(value)}`)
    }
  }
  return parts.join(" | ")
}

async function appendLog(logDir: string, message: string): Promise<void> {
  try {
    const logPath = path.join(logDir, LOG_FILENAME)
    await fs.appendFile(logPath, message + "\n", "utf-8")
  } catch {
    // logging must never break tool execution
  }
}

/**
 * Wrap a ToolDefinition to add disk-based diagnostic logging and
 * standardized [OK]/[ERROR] return prefixes.
 */
export function wrapWithLogging(
  toolName: string,
  toolDef: ToolDefinition,
  baseDir: string,
): ToolDefinition {
  const originalExecute = toolDef.execute.bind(toolDef)

  return {
    ...toolDef,
    async execute(args: Record<string, unknown>, context: ToolContext): Promise<string> {
      const logDir = context.directory || baseDir
      const ts = timestamp()
      const argsSummary = summarizeArgs(args)

      await appendLog(logDir, `[${ts}] ${toolName} | ${argsSummary}`)

      try {
        const result = await originalExecute(args, context)

        const isError = result.startsWith("Error")
        if (isError) {
          await appendLog(logDir, `  → [ERROR] ${result}`)
          return `[ERROR] ${result}`
        }

        await appendLog(logDir, `  → [OK] ${result.slice(0, 200)}${result.length > 200 ? "..." : ""}`)
        return `[OK] ${result}`
      } catch (e) {
        const errMsg = `${toolName} threw: ${(e as Error).message}`
        await appendLog(logDir, `  → [EXCEPTION] ${errMsg}`)
        return `[ERROR] ${errMsg}`
      }
    },
  }
}
