import { promises as fs } from "fs"
import path from "path"

/**
 * Resolve the actual novel project directory from a given path.
 * 1. Check if novel.json exists directly at the given path
 * 2. If not, scan immediate child directories for novel.json
 * This ensures backward compatibility with old-style projects
 * (created in a subdirectory) and new-style projects (created
 * directly in the working directory).
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

  try {
    const entries = await fs.readdir(rawDir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const subCheck = path.join(rawDir, entry.name, "novel.json")
      const subExists = await fs.access(subCheck).then(() => true).catch(() => false)
      if (subExists) return path.join(rawDir, entry.name)
    }
  } catch {
    // directory unreadable
  }
  return null
}
