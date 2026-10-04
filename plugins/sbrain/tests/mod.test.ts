import { expect, mock, test } from 'claude-code/testing'
import { field, filterTasks, parseSession, parseTask, progressBar } from '../hooks/mod/ledger.ts'

const TASK_7 = `# TASK-007: Kullanıcı girişi (LDAP)

**Status:** in_progress    <!-- pending | in_progress | blocked | done | deferred -->
**Module:** auth
**Depends on:** TASK-003
**Branch:** feat/task-007-ldap-login
**PR:** —
**Commit:** —

## What
LDAP ile giriş.

## Acceptance criteria
- [x] LDAP bind çalışıyor
- [x] JWT dönüyor
- [ ] Breakglass hesabı
- [ ] Swagger dokümanı

## Technical notes
- [ ] bu satır sayılmamalı
`

const TASK_3 = `# TASK-003: Proje iskeleti

**Status:** done
**Module:** core
**Commit:** a1b2c3d
`

const TASK_9 = `# TASK-009: Dosya yükleme

**Status:** pending
**Module:** storage
`

const SESSION = `# Session State

**Active task:** TASK-007 — LDAP login
**Task status:** in_progress
**Current branch:** feat/task-007-ldap-login
**Active module:** auth
`

const FILES: Record<string, string> = {
  'TASK-003.md': TASK_3,
  'TASK-007.md': TASK_7,
  'TASK-009.md': TASK_9,
}

test('parseTask reads fields like reindex.sh does', async () => {
  const t = parseTask('TASK-007.md', TASK_7)!
  expect(t).toMatchObject({
    id: 'TASK-007',
    title: 'Kullanıcı girişi (LDAP)',
    status: 'in_progress',
    module: 'auth',
    dependsOn: 'TASK-003',
    branch: 'feat/task-007-ldap-login',
    pr: '',
    criteriaDone: 2,
    criteriaTotal: 4,
  })
  expect(parseTask('INDEX.md', '# Task Index')).toBe(null)
  expect(parseTask('TASK-001.md', '**Status:** weird')!.status).toBe('pending')
  expect(field('**PR:** —              <!-- filled -->', 'PR')).toBe('')
})

test('parseTask accepts the older "# TASK-NNN — Title" / "## Status:" format', async () => {
  const t = parseTask('TASK-008.md', '# TASK-008 — Implement Student Module\n\n## Status: done\n\n## Branch: feat/student-crud\n')!
  expect(t).toMatchObject({ title: 'Implement Student Module', status: 'done', branch: 'feat/student-crud' })
})

test('parseSession and filters', async () => {
  expect(parseSession(SESSION)).toEqual({
    activeTask: 'TASK-007',
    taskStatus: 'in_progress',
    branch: 'feat/task-007-ldap-login',
    module: 'auth',
  })
  const tasks = Object.entries(FILES).map(([name, text]) => parseTask(name, text)!)
  expect(filterTasks(tasks, 'open').map((t) => t.id)).toEqual(['TASK-007', 'TASK-009'])
  expect(filterTasks(tasks, 'done').map((t) => t.id)).toEqual(['TASK-003'])
  expect(progressBar(2, 4, 4)).toBe('▰▰▱▱')
})

// Answers every mods API call the mod makes, for a project at /work
function stubProject(on, opts: { isSbrain: boolean; fills?: string[] }) {
  mock.clock(on)
  on('session.cwd', () => ({ value: '/work/src' }))
  on('fs.exists', ($, e) => ({
    value: opts.isSbrain && (e.path === '/work/.agent/tasks' || e.path === '/work/.agent/SESSION.md'),
  }))
  on('fs.list', () => ({
    value: [
      ...Object.keys(FILES).map((name) => ({ name, kind: 'file', size: 1, isLink: false })),
      { name: 'INDEX.md', kind: 'file', size: 1, isLink: false },
    ],
  }))
  on('fs.read', ($, e) => ({
    value: e.path.endsWith('SESSION.md') ? SESSION : FILES[e.path.split('/').pop()] ?? '',
  }))
  on('process.run', ($, e) => ({
    value: {
      exitCode: 0,
      stdout: e.argv.includes('rev-parse') ? 'feat/task-007-ldap-login\n' : ' M src/auth.ts\n?? x.ts\n',
      stderr: '',
    },
  }))
  on('command.register', () => ({ value: undefined }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.close', () => ({ value: undefined }))
  on('prompt.fill', ($, e) => {
    opts.fills?.push(e.text)
    return { isFilled: true }
  })
  on('session.start', () => ({ cwd: '/work/src' }))
  on('ui.render', () => ({ type: 'Text', props: {}, children: ['drawn by Claude Code'] }))
}

const BAND = {
  plugin: 'sbrain',
  component: 'AbovePrompt',
  viewport: { columns: 120, rows: 40 },
  props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 120, scroll: { offset: 0, bodyRows: 10 }, view: {} },
} as const

const PANE = {
  plugin: 'sbrain',
  component: 'Pane',
  requestId: 'sbrain-ledger',
  viewport: { columns: 120, rows: 40 },
  props: { title: 'sbrain', isFocused: true, bodyColumns: 80, placement: 'inline', scroll: { offset: 0, bodyRows: 20 }, view: {} },
} as const

test('the band shows the active task, branch, and counts', async ($, on) => {
  stubProject(on, { isSbrain: true })
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work/src' })
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect(await ui.find({ type: 'Text', text: 'TASK-007' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'Kullanıcı girişi (LDAP)' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: '⎇ feat/task-007-ldap-login ●2' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: '✓1' })).toBeDefined()
    await ui.unmount()
  }
})

test('the band stays out of non-sbrain projects', async ($, on) => {
  stubProject(on, { isSbrain: false })
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work/src' })
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: 'drawn by Claude Code' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '◆ sbrain' })).toBeUndefined()
})

test('the pane filters tasks and starts the selected one', async ($, on) => {
  const fills: string[] = []
  stubProject(on, { isSbrain: true, fills })
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work/src' })
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    // Open filter hides the done task
    expect(await ui.find({ key: 'task-TASK-009' })).toBeDefined()
    expect(await ui.find({ key: 'task-TASK-003' })).toBeUndefined()
    await ui.press({ key: 'filter-all' })
    expect(await ui.find({ key: 'task-TASK-003' })).toBeDefined()
    await ui.press({ key: 'filter-open' })

    // Selecting a task shows its detail with acceptance progress
    // The selection survives across mounts, so select only when nothing is open
    if (!(await ui.find({ key: 'detail' }))) await ui.press({ key: 'task-TASK-007' })
    expect(await ui.find({ type: 'Text', text: 'Kriter  ▰▰▰▰▰▱▱▱▱▱ 2/4' })).toBeDefined()
    await ui.press({ key: 'start' })
    await ui.unmount()
  }
  expect(fills).toEqual(['/sbrain:task-execution TASK-007', '/sbrain:task-execution TASK-007'])
})
