import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Solar } from 'lunar-javascript'
import * as OpenCC from 'opencc-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(__dirname, '..')
const historyDir = path.join(rootDir, 'src', 'assets', 'history')

/** 全文收尾句；若被 parseSections 吃进「程序员视角」区块，会与 buildMarkdown 末尾再追加的一次重复，需在抽取章节时剥掉。 */
const HISTORY_CLOSING_LINE = '✨ 历史不会重复，但总会惊人地相似 ✨'
const toSimplified = OpenCC.Converter({ from: 'tw', to: 'cn' })

const SECTION_ORDER = [
  '🏛️ 古代印记',
  '🌍 近现代·国际',
  '💻 科技与互联网',
  '🇨🇳 中国近现代',
  '🌐 国际要闻',
  '🌟 今日出生',
  '⚰️ 今日逝世',
  '👨‍💻 程序员视角'
] as const

const FESTIVAL_MAP: Record<string, { name: string; intro: string }> = {
  '01-01': { name: '元旦', intro: '公历新年的第一天，象征新的时间周期开启。' },
  '02-14': { name: '情人节（Valentine\'s Day）', intro: '广泛流行的节日，常以鲜花与卡片表达情感。' },
  '03-08': { name: '国际妇女节', intro: '关注女性权益、劳动贡献与社会平等的重要纪念日。' },
  '04-01': { name: '愚人节', intro: '以善意玩笑和轻松互动为主的民间节日文化。' },
  '04-22': { name: '世界地球日', intro: '倡导环境保护、可持续发展与公众生态意识提升。' },
  '05-01': { name: '国际劳动节', intro: '纪念劳动价值，关注劳动者权益与社会保障。' },
  '05-04': { name: '中国青年节', intro: '纪念青年运动传统，鼓励青年担当与创新精神。' },
  '06-01': { name: '国际儿童节', intro: '聚焦儿童成长、教育与健康发展。' },
  '07-01': { name: '中国共产党建党纪念日', intro: '中国共产党成立纪念日，常见主题教育活动。' },
  '08-01': { name: '中国人民解放军建军节', intro: '纪念人民军队建设发展历程的重要日期。' },
  '09-10': { name: '中国教师节', intro: '向教育工作者致敬，强调教育与人才培养的价值。' },
  '10-01': { name: '中华人民共和国国庆节', intro: '纪念新中国成立的重要国家节日。' },
  '12-25': { name: '圣诞节（Christmas）', intro: '在全球范围具有广泛影响的文化节日。' }
}

type WikiPage = {
  titles?: { normalized?: string }
}

type WikiItem = {
  year?: number
  text?: string
  pages?: WikiPage[]
}

function getShanghaiTodayIso(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date())
}

function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function resolveTargetDateIso(): string {
  const overrideDate = process.env.TARGET_DATE
  if (overrideDate && /^\d{4}-\d{2}-\d{2}$/.test(overrideDate)) return overrideDate
  return addDays(getShanghaiTodayIso(), 1)
}

function formatChineseDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  const weekday = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    weekday: 'long'
  }).format(new Date(Date.UTC(year, month - 1, day)))
  return `${year}年${month}月${day}日 ${weekday}`
}

function formatLunarLine(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  const solar = Solar.fromYmd(year, month, day)
  const lunar = solar.getLunar()
  return lunar.toString()
}

function buildFixedFestivalBody(targetDate: string): string | null {
  const mmdd = targetDate.slice(5)
  const festival = FESTIVAL_MAP[mmdd]
  if (!festival) return null
  return [festival.name, '', festival.intro].join('\n')
}

function buildJieQiFestivalBody(isoDate: string): string | null {
  const [year, month, day] = isoDate.split('-').map(Number)
  const solar = Solar.fromYmd(year, month, day)
  const lunar = solar.getLunar()
  const jieQi = lunar.getJieQi()
  if (!jieQi) return null

  const introMap: Record<string, string> = {
    谷雨: '谷雨是春季最后一个节气，意味着降雨增多、万物生长加速，传统上也与农事安排和物候观察密切相关。'
  }

  const intro =
    introMap[jieQi] ??
    `${jieQi}是二十四节气之一，用于指导农事与物候观察，也承载着中国传统时间文化中的节律感。`

  return [`${jieQi}（二十四节气）`, '', intro].join('\n')
}

function buildFestivalSection(targetDate: string): string {
  const fixedBody = buildFixedFestivalBody(targetDate)
  const jieQiBody = buildJieQiFestivalBody(targetDate)
  if (!fixedBody && !jieQiBody) return ''

  const blocks = [fixedBody, jieQiBody].filter(Boolean).join('\n\n')

  return ['## 🎈 今日节日', '', blocks, ''].join('\n')
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function shortText(text: string, max = 90): string {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (cleaned.length <= max) return cleaned
  return `${cleaned.slice(0, max - 1)}…`
}

function pickTitle(item: WikiItem): string {
  const pageTitle = item.pages?.[0]?.titles?.normalized?.trim()
  if (pageTitle) return pageTitle
  const text = item.text?.trim() ?? ''
  if (!text) return '历史事件'
  return shortText(text, 24)
}

function normalizePunctuation(text: string): string {
  return text.replace(/：/g, ':').replace(/\s+/g, ' ').trim()
}

function parseHolidayEntry(item: WikiItem): { title: string; intro: string } {
  const rawText = shortText(item.text ?? '', 140)
  const titleCandidate = pickTitle(item).trim()
  const normalized = normalizePunctuation(rawText)

  // 常见结构：国家/地区: 节日名
  const colonIdx = normalized.indexOf(':')
  if (colonIdx > 0) {
    const left = normalized.slice(0, colonIdx).trim()
    const right = normalized.slice(colonIdx + 1).trim()
    if (right) {
      return {
        title: right.length <= 30 ? `${right}（${left}）` : right,
        intro: `${left}在这一天纪念该历史节点。`
      }
    }
  }

  const countryLike = /^[\u4e00-\u9fa5A-Za-z]{1,6}$/.test(titleCandidate)
  if (countryLike && normalized.startsWith(`${titleCandidate}:`)) {
    const right = normalized.slice(titleCandidate.length + 1).trim()
    if (right) {
      return {
        title: `${right}（${titleCandidate}）`,
        intro: `${titleCandidate}在这一天纪念该历史节点。`
      }
    }
  }

  return {
    title: titleCandidate || '今日纪念日',
    intro: rawText || `${titleCandidate || '该节日'}是当日纪念节点。`
  }
}

function toBullet(item: WikiItem, fallbackYear = '佚年'): string {
  const year = Number.isFinite(item.year) ? String(item.year) : fallbackYear
  const text = item.text?.trim() || pickTitle(item)
  return `- ${year}年 — ${text}`
}

async function fetchWikiList(kind: 'events' | 'births' | 'deaths' | 'holidays', month: number, day: number): Promise<WikiItem[]> {
  const url = `https://zh.wikipedia.org/api/rest_v1/feed/onthisday/${kind}/${month}/${day}`
  const response = await fetch(url, {
    headers: {
      'user-agent': 'jcclab-history-generator/1.0'
    }
  })
  if (!response.ok) {
    throw new Error(`拉取 ${kind} 失败: HTTP ${response.status}`)
  }
  const data = (await response.json()) as { [key: string]: unknown }
  const raw = data[kind]
  if (!Array.isArray(raw)) return []
  return raw.filter((item): item is WikiItem => typeof item === 'object' && item !== null)
}

async function fetchMuffinLabs(targetDate: string): Promise<OnlineSource> {
  const [year, month, day] = targetDate.split('-').map(Number)
  if (!year || !month || !day) throw new Error(`非法日期: ${targetDate}`)
  const url = `https://history.muffinlabs.com/date/${month}/${day}`
  const response = await fetch(url, {
    headers: {
      'user-agent': 'jcclab-history-generator/1.0'
    }
  })
  if (!response.ok) {
    throw new Error(`备用源拉取失败: HTTP ${response.status}`)
  }
  const data = (await response.json()) as {
    data?: {
      Events?: Array<{ year?: string; text?: string }>
      Births?: Array<{ year?: string; text?: string }>
      Deaths?: Array<{ year?: string; text?: string }>
    }
  }
  const eventsRaw = data.data?.Events ?? []
  const birthsRaw = data.data?.Births ?? []
  const deathsRaw = data.data?.Deaths ?? []
  const toWiki = (arr: Array<{ year?: string; text?: string }>): WikiItem[] =>
    arr
      .filter((item) => typeof item?.text === 'string' && item.text.trim().length > 0)
      .map((item) => ({
        year: Number(item.year),
        text: item.text
      }))
  return {
    events: toWiki(eventsRaw),
    births: toWiki(birthsRaw),
    deaths: toWiki(deathsRaw),
    holidays: []
  }
}

type OnlineSource = {
  events: WikiItem[]
  births: WikiItem[]
  deaths: WikiItem[]
  holidays: WikiItem[]
}

async function fetchOnlineSource(targetDate: string): Promise<OnlineSource> {
  const [year, month, day] = targetDate.split('-').map(Number)
  if (!year || !month || !day) throw new Error(`非法日期: ${targetDate}`)
  try {
    const [events, births, deaths, holidays] = await Promise.all([
      fetchWikiList('events', month, day),
      fetchWikiList('births', month, day),
      fetchWikiList('deaths', month, day),
      fetchWikiList('holidays', month, day)
    ])
    return { events, births, deaths, holidays }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`主数据源不可用，切换备用源: ${message}`)
    return fetchMuffinLabs(targetDate)
  }
}

const CHINA_KEYWORDS = ['中国', '中华', '北京', '上海', '南京', '广州', '香港', '台湾', '清朝', '民国', '中华人民共和国', '中国共产党']
const TECH_KEYWORDS = [
  '计算机',
  '互联网',
  '网络',
  '软件',
  '硬件',
  '卫星',
  '航天',
  'AI',
  '人工智能',
  '机器学习',
  '芯片',
  '电信',
  '通信',
  '平台',
  '工程',
  '科学',
  'Java',
  'Python',
  'Golang',
  'Go',
  'Vue',
  'React',
  '前端',
  '后端',
  '数据库',
  '云计算',
  '微服务'
]

function containsKeyword(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => new RegExp(escapeRegExp(keyword), 'i').test(text))
}

function selectUniqueByText(items: WikiItem[], limit: number): WikiItem[] {
  const seen = new Set<string>()
  const out: WikiItem[] = []
  for (const item of items) {
    const normalizedText = toSimplified((item.text ?? '').trim())
    const key = `${item.year ?? ''}|${normalizedText}`.trim()
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(item)
    if (out.length >= limit) break
  }
  return out
}

function pickEvents(source: WikiItem[], predicate: (item: WikiItem) => boolean, limit: number): WikiItem[] {
  return selectUniqueByText(source.filter(predicate), limit)
}

function ensureMin(items: WikiItem[], fallback: WikiItem[], limit: number): WikiItem[] {
  if (items.length >= limit) return items.slice(0, limit)
  const merged = [...items]
  for (const item of fallback) {
    if (merged.length >= limit) break
    merged.push(item)
  }
  return selectUniqueByText(merged, limit)
}

function buildSectionText(items: WikiItem[], fallbackText: string, limit = 4): string {
  const selected = selectUniqueByText(items, limit)
  if (selected.length === 0) return `- ${fallbackText}`
  return selected.map((item) => toBullet(item)).join('\n\n')
}

function normalizeFestivalTitle(title: string): string {
  return title
    .replace(/\s+/g, ' ')
    .replace(/（.*?）/g, '')
    .replace(/\(.*?\)/g, '')
    .trim()
}

function isGarbageHolidayTitle(title: string): boolean {
  const t = title.trim()
  if (!t) return true
  if (t.length <= 1) return true
  if (/^[\u4e00-\u9fa5A-Za-z]{1,6}$/.test(t)) return true // 仅国家/地区短词
  if (/[}{[\]<>]/.test(t)) return true
  if (/[)]{2,}|[（)]{3,}/.test(t)) return true
  return false
}

function buildHolidayBlocksFromOnline(holidays: WikiItem[], knownTitles: Set<string>): string[] {
  const parsed = holidays
    .map(parseHolidayEntry)
    .map(({ title, intro }) => ({
      title: title.trim(),
      intro: intro.trim()
    }))
    .filter(({ title }) => !isGarbageHolidayTitle(title))
    .map(({ title, intro }) => {
      const t = toSimplified(title)
      const i = toSimplified(intro)
      const titleOnly = normalizeFestivalTitle(t)
      const introOnly = normalizeFestivalTitle(i)
      const introIsUseless = !i || introOnly === titleOnly || i.length < 8
      return {
        title: t,
        intro: introIsUseless ? `${t}是当日的重要纪念节点。` : i
      }
    })

  const blocks: string[] = []
  const seen = new Set<string>()
  for (const item of parsed) {
    const key = normalizeFestivalTitle(item.title)
    if (!key) continue
    if (knownTitles.has(key)) continue
    if (seen.has(key)) continue
    seen.add(key)
    blocks.push([item.title, '', item.intro].join('\n'))
    if (blocks.length >= 2) break
  }
  return blocks
}

function buildFestivalSectionMerged(targetDate: string, holidays: WikiItem[]): string {
  const fixedBody = buildFixedFestivalBody(targetDate)
  const jieQiBody = buildJieQiFestivalBody(targetDate)

  const known = new Set<string>()
  if (fixedBody) known.add(normalizeFestivalTitle(fixedBody.split('\n')[0] ?? ''))
  if (jieQiBody) known.add(normalizeFestivalTitle(jieQiBody.split('\n')[0] ?? ''))

  const onlineBlocks = buildHolidayBlocksFromOnline(holidays, known)
  const blocks = [fixedBody, jieQiBody, ...onlineBlocks].filter(Boolean).join('\n\n')
  if (!blocks) return ''
  return ['## 🎈 今日节日', '', blocks, ''].join('\n')
}

function buildProgrammerView(events: WikiItem[]): string {
  const top = selectUniqueByText(events, 30)
  const techHot = pickEvents(top, (item) => containsKeyword(item.text ?? '', TECH_KEYWORDS), 3)
  const lines = techHot
    .map((item) => {
      const year = item.year ? `${item.year}年` : '当年'
      const text = shortText(toSimplified(item.text ?? ''), 110)
      return `- ${year} — ${text}。该事件在程序员社区引发对工程实践的广泛讨论（后端 Java/Python/Go、前端 Vue/React、AI 应用）。`
    })
    .filter(Boolean)

  if (lines.length > 0) return lines.slice(0, 3).join('\n\n')
  return '- 程序员社区热点：当日缺少直接技术事件条目，讨论焦点通常围绕后端稳定性、前端性能优化与 AI 应用落地。'
}

function buildMarkdown(targetDate: string, source: OnlineSource): string {
  const headingDate = formatChineseDate(targetDate)
  const lunarText = formatLunarLine(targetDate)
  const festivalSection = buildFestivalSectionMerged(targetDate, source.holidays)
  const festivalBlock = festivalSection ? [festivalSection, '---', ''].join('\n') : ''

  const allEvents = selectUniqueByText(source.events, 50)
  const ancient = pickEvents(allEvents, (item) => (item.year ?? 99999) <= 1700, 3)
  const chinaModern = pickEvents(allEvents, (item) => (item.year ?? 0) >= 1800 && containsKeyword(item.text ?? '', CHINA_KEYWORDS), 4)
  const internationalModern = pickEvents(allEvents, (item) => (item.year ?? 0) >= 1701 && !containsKeyword(item.text ?? '', CHINA_KEYWORDS), 5)
  const tech = pickEvents(allEvents, (item) => containsKeyword(item.text ?? '', TECH_KEYWORDS), 4)
  const internationalNews = pickEvents(allEvents, (item) => (item.year ?? 0) >= 1990 && !containsKeyword(item.text ?? '', CHINA_KEYWORDS), 4)

  const sectionMap: Record<(typeof SECTION_ORDER)[number], string> = {
    '🏛️ 古代印记': buildSectionText(ensureMin(ancient, allEvents, 3), '暂无古代事件条目，后续补充。', 3),
    '🌍 近现代·国际': buildSectionText(ensureMin(internationalModern, allEvents, 5), '暂无近现代国际条目，后续补充。', 5),
    '💻 科技与互联网': buildSectionText(ensureMin(tech, internationalModern, 4), '暂无科技与互联网条目，后续补充。', 4),
    '🇨🇳 中国近现代': buildSectionText(ensureMin(chinaModern, allEvents.filter((item) => (item.year ?? 0) >= 1800), 4), '暂无中国近现代条目，后续补充。', 4),
    '🌐 国际要闻': buildSectionText(ensureMin(internationalNews, internationalModern, 4), '暂无国际要闻条目，后续补充。', 4),
    '🌟 今日出生': buildSectionText(source.births, '暂无今日出生条目，后续补充。', 4),
    '⚰️ 今日逝世': buildSectionText(source.deaths, '暂无今日逝世条目，后续补充。', 4),
    '👨‍💻 程序员视角': buildProgrammerView(allEvents) || '- 历史提醒工程实践：稳定性、可观测性和长期迭代能力同等重要。'
  }

  const sections = SECTION_ORDER.map((name) => [`## ${name}`, '', sectionMap[name]].join('\n')).join('\n\n---\n\n')

  return [
    `【历史上的今天】${targetDate}`,
    '',
    `📅 公历：${headingDate}`,
    '',
    `📆 农历：${lunarText}`,
    '',
    '✨ 每日一则历史回望，读懂时光里的故事',
    '',
    festivalBlock,
    sections,
    '',
    '---',
    '',
    HISTORY_CLOSING_LINE
  ]
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function main(): Promise<void> {
  if (!fs.existsSync(historyDir)) {
    throw new Error(`未找到目录: ${historyDir}`)
  }

  const targetDate = resolveTargetDateIso()
  const targetFileName = `history-${targetDate}.md`
  const targetFilePath = path.join(historyDir, targetFileName)

  // 默认同定时任务行为：每次按固定结构重新生成；已存在则覆盖，不存在则新建。
  // 仅在本地需要保留手改稿时设置 SKIP_EXISTING_HISTORY_FILE=true 跳过已存在文件。
  const skipIfExists = process.env.SKIP_EXISTING_HISTORY_FILE === 'true'
  if (fs.existsSync(targetFilePath) && skipIfExists) {
    console.log(`目标文件已存在，跳过生成（SKIP_EXISTING_HISTORY_FILE=true）: ${targetFileName}`)
    return
  }

  try {
    const source = await fetchOnlineSource(targetDate)
    const markdown = toSimplified(buildMarkdown(targetDate, source))
    fs.writeFileSync(targetFilePath, `${markdown}\n`, 'utf8')
    console.log(`已生成历史文件: ${path.relative(rootDir, targetFilePath)}`)
    console.log(`已联网拉取条目：events=${source.events.length}, births=${source.births.length}, deaths=${source.deaths.length}, holidays=${source.holidays.length}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`联网生成失败: ${message}`)
  }
}

try {
  await main()
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`generate-history-daily 失败: ${message}`)
  process.exit(1)
}
