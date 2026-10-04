// sbrain ledger parsing for the UI mod.
// Pure functions only (no mods API), so they can be unit tested directly.
// Field rules mirror scripts/reindex.sh: each TASK-NNN.md is the source of truth.

export const STATUSES = ['in_progress', 'blocked', 'pending', 'deferred', 'done'] as const
export type Status = (typeof STATUSES)[number]

export type Task = {
  id: string
  num: number
  title: string
  status: Status
  module: string
  dependsOn: string
  branch: string
  pr: string
  commit: string
  criteriaDone: number
  criteriaTotal: number
}

export type SessionState = {
  activeTask: string
  taskStatus: string
  branch: string
  module: string
}

export const ICON: Record<Status, string> = {
  in_progress: '◐',
  blocked: '⊘',
  pending: '○',
  deferred: '◌',
  done: '✓',
}

export const COLOR: Record<Status, string> = {
  in_progress: 'warning',
  blocked: 'error',
  pending: 'suggestion',
  deferred: 'inactive',
  done: 'success',
}

export const LABEL: Record<Status, string> = {
  in_progress: 'devam ediyor',
  blocked: 'bloklu',
  pending: 'bekliyor',
  deferred: 'ertelendi',
  done: 'bitti',
}

const EMPTY = new Set(['', '—', '-', '–'])

// "**Name:** value <!-- comment -->" -> "value", or "" when unset.
// Older task files write "## Name: value" instead, so accept that too.
export function field(text: string, name: string): string {
  const n = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const m =
    text.match(new RegExp('\\*\\*' + n + ':\\*\\*[ \\t]*(.*)')) ??
    text.match(new RegExp('^#{2,}[ \\t]*' + n + ':[ \\t]*(.*)$', 'm'))
  if (!m) return ''
  const value = m[1].replace(/<!--.*?-->/g, '').trim()
  return EMPTY.has(value) ? '' : value
}

function normalizeStatus(raw: string): Status {
  const word = raw.split(/[\s<]/)[0].trim()
  return (STATUSES as readonly string[]).includes(word) ? (word as Status) : 'pending'
}

function countCriteria(text: string): { done: number; total: number } {
  const section = text.match(/^##\s*Acceptance criteria\s*$([\s\S]*?)(?=^##\s|^---\s*$|(?![\s\S]))/m)
  if (!section) return { done: 0, total: 0 }
  let done = 0
  let total = 0
  for (const line of section[1].split('\n')) {
    const m = line.match(/^\s*[-*]\s*\[([ xX])\]\s*(.*)$/)
    // Skip the template's unfilled "- [ ] ..." placeholder
    if (!m || m[2].trim() === '...') continue
    total += 1
    if (m[1] !== ' ') done += 1
  }
  return { done, total }
}

export function parseTask(fileName: string, text: string): Task | null {
  const idMatch = fileName.match(/^TASK-(\d+)\.md$/)
  if (!idMatch) return null
  const title = text.match(/^#\s*TASK-\d+\s*[:—–-]\s*(.+)$/m)
  const criteria = countCriteria(text)
  return {
    id: 'TASK-' + idMatch[1],
    num: Number(idMatch[1]),
    title: title ? title[1].trim() : '(başlıksız)',
    status: normalizeStatus(field(text, 'Status')),
    module: field(text, 'Module'),
    dependsOn: field(text, 'Depends on'),
    branch: field(text, 'Branch'),
    pr: field(text, 'PR'),
    commit: field(text, 'Commit'),
    criteriaDone: criteria.done,
    criteriaTotal: criteria.total,
  }
}

export function parseSession(text: string): SessionState {
  return {
    activeTask: (field(text, 'Active task').match(/TASK-\d+/) ?? [''])[0],
    taskStatus: field(text, 'Task status'),
    branch: field(text, 'Current branch'),
    module: field(text, 'Active module'),
  }
}

export function countByStatus(tasks: readonly Task[]): Record<Status, number> {
  const counts = { in_progress: 0, blocked: 0, pending: 0, deferred: 0, done: 0 }
  for (const t of tasks) counts[t.status] += 1
  return counts
}

// The task the band highlights: SESSION.md's active task, else the first in_progress one
export function activeTask(tasks: readonly Task[], session: SessionState | null): Task | null {
  if (session?.activeTask) {
    const t = tasks.find((x) => x.id === session.activeTask)
    if (t && t.status !== 'done' && t.status !== 'deferred') return t
  }
  return tasks.find((t) => t.status === 'in_progress') ?? null
}

export type Filter = 'open' | 'all' | 'done'

export function filterTasks(tasks: readonly Task[], filter: Filter): Task[] {
  const order = (t: Task) => STATUSES.indexOf(t.status) * 100000 + t.num
  const picked =
    filter === 'all'
      ? [...tasks]
      : filter === 'done'
        ? tasks.filter((t) => t.status === 'done' || t.status === 'deferred')
        : tasks.filter((t) => t.status !== 'done' && t.status !== 'deferred')
  return picked.sort((a, b) => order(a) - order(b))
}

export function progressBar(done: number, total: number, width = 10): string {
  if (total === 0) return ''
  const filled = Math.round((done / total) * width)
  return '▰'.repeat(filled) + '▱'.repeat(width - filled)
}
