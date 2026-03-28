/**
 * Type declarations for @opencode-ai/plugin
 * These mirror the OpenCode plugin API types for development without the package installed.
 * Once `npm install` is run, the actual package types take precedence.
 */
declare module "@opencode-ai/plugin" {
  interface PluginContext {
    project: unknown
    client: unknown
    $: unknown
    directory: string
    worktree: string
  }

  interface ToolContext {
    directory: string
    worktree: string
  }

  interface ToolDefinition {
    description: string
    args: Record<string, unknown>
    execute(args: Record<string, unknown>, context: ToolContext): Promise<string>
  }

  interface ToolSchema {
    string(description?: string): unknown
    number(description?: string): unknown
    boolean(description?: string): unknown
    optional(schema: unknown): unknown
    array(schema: unknown): unknown
    enum(values: string[]): unknown
  }

  interface ToolFunction {
    (config: {
      description: string
      args: Record<string, unknown>
      execute(args: any, context: ToolContext): Promise<string>
    }): ToolDefinition
    schema: ToolSchema
  }

  export const tool: ToolFunction

  type HookReturn = {
    tool?: Record<string, ToolDefinition>
    event?: (input: { event: { type: string; [key: string]: unknown } }) => Promise<void>
    "tool.execute.before"?: (input: any, output: any) => Promise<void>
    "tool.execute.after"?: (input: any, output: any) => Promise<void>
    "shell.env"?: (input: any, output: any) => Promise<void>
    [key: string]: unknown
  }

  export type Plugin = (ctx: PluginContext) => Promise<HookReturn>
}
