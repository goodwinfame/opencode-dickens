import { promises as fs } from "fs"
import path from "path"

/**
 * Resolve the actual novel project directory from a given path.
 * 1. Check if novel.json exists directly at the given path
 * 2. If not, scan immediate child directories for novel.json
 *    - If exactly one child has novel.json, return it
 *    - If multiple children have novel.json, return the first one
 *      (use discoverAllProjects() for the full list)
 */
export async function resolveProjectDir(
  projectPath: string,
  contextDirectory: string,
  baseDir: string,
): Promise<string | null> {
  const rawDir = path.isAbsolute(projectPath)
    ? projectPath
    : path.join(contextDirectory || baseDir, projectPath)

  const directCheck = path.join(rawDir, "novel.json")
  const exists = await fs.access(directCheck).then(() => true).catch(() => false)
  if (exists) return rawDir

  const projects = await discoverAllProjects(rawDir)
  return projects.length > 0 ? projects[0] : null
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
