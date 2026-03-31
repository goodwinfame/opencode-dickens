import { promises as fs } from "fs"
import path from "path"

export interface ResolveResult {
  projectDir: string | null
  diagnostics: string
}

/**
 * Resolve the actual novel project directory from a given path,
 * returning both the resolved path and human-readable diagnostics.
 */
export async function resolveProjectDir(
  projectPath: string,
  contextDirectory: string,
  baseDir: string,
): Promise<ResolveResult> {
  const rawDir = path.isAbsolute(projectPath)
    ? projectPath
    : path.join(contextDirectory || baseDir, projectPath)

  const directCheck = path.join(rawDir, "novel.json")
  const exists = await fs.access(directCheck).then(() => true).catch(() => false)
  if (exists) {
    return {
      projectDir: rawDir,
      diagnostics: `Found novel.json at ${rawDir}`,
    }
  }

  const projects = await discoverAllProjects(rawDir)

  if (projects.length === 1) {
    return {
      projectDir: projects[0],
      diagnostics: `Not at ${rawDir}. Found in subdirectory: ${path.basename(projects[0])}`,
    }
  }

  if (projects.length > 1) {
    const names = projects.map((p) => path.basename(p))
    return {
      projectDir: projects[0],
      diagnostics: `Multiple projects under ${rawDir}: [${names.join(", ")}]. Using first: ${names[0]}`,
    }
  }

  let subdirNames: string[] = []
  try {
    const entries = await fs.readdir(rawDir, { withFileTypes: true })
    subdirNames = entries.filter((e) => e.isDirectory()).map((e) => e.name)
  } catch {
    return {
      projectDir: null,
      diagnostics: `Directory unreadable or does not exist: ${rawDir}`,
    }
  }

  return {
    projectDir: null,
    diagnostics: subdirNames.length === 0
      ? `No novel.json at ${rawDir} and no subdirectories found`
      : `No novel.json at ${rawDir}. Scanned ${subdirNames.length} subdirs: [${subdirNames.join(", ")}]. None contain novel.json`,
  }
}

/**
 * Scan immediate child directories for novel.json files.
 * Returns all found project directories (sorted by name).
 */
export async function discoverAllProjects(parentDir: string): Promise<string[]> {
  const found: string[] = []
  try {
    const entries = await fs.readdir(parentDir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const subCheck = path.join(parentDir, entry.name, "novel.json")
      const subExists = await fs.access(subCheck).then(() => true).catch(() => false)
      if (subExists) found.push(path.join(parentDir, entry.name))
    }
  } catch {
    // directory unreadable
  }
  return found.sort()
}
