/**
 * 构建前脚本：扫描 src/assets/blog 下所有 .md，按「最后 Git 提交时间」生成 blog-meta.json，
 * 供前端博客列表按更新时间排序（无 Git 时用文件 mtime 兜底）。
 */
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** 仓库根目录（脚本在 scripts/ 下，向上一级） */
const repoRoot = path.join(__dirname, '..')
const blogDir = path.join(repoRoot, 'src', 'assets', 'blog')
const outputPath = path.join(blogDir, 'blog-meta.json')

const toPosix = (p: string) => p.split(path.sep).join('/')

/** 秒级时间戳：优先 git log，失败则用文件修改时间 */
const getGitUpdatedAt = (absoluteFilePath: string): number => {
  try {
    const relativePath = toPosix(path.relative(repoRoot, absoluteFilePath))
    const output = execSync(`git log -1 --format=%ct -- "${relativePath}"`, {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'ignore']
    })
      .toString()
      .trim()
    const ts = Number(output)
    if (Number.isFinite(ts) && ts > 0) return ts
  } catch {
    // 无 Git 或非仓库环境：走 mtime
  }

  const stat = fs.statSync(absoluteFilePath)
  return Math.floor(stat.mtimeMs / 1000)
}

const buildBlogMeta = (): void => {
  if (!fs.existsSync(blogDir)) {
    throw new Error(`Blog directory not found: ${blogDir}`)
  }

  const files = fs
    .readdirSync(blogDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => {
      const absolutePath = path.join(blogDir, entry.name)
      return {
        path: `./assets/blog/${entry.name}`,
        updatedAt: getGitUpdatedAt(absolutePath)
      }
    })

  const byPath = Object.fromEntries(files.map((item) => [item.path, item.updatedAt]))
  fs.writeFileSync(outputPath, `${JSON.stringify(byPath, null, 2)}\n`, 'utf8')
}

buildBlogMeta()
