// sbrain UI mod: shows the task ledger inside Claude Code.
//   - A band above the prompt with the active task, branch, and ledger counts
//   - A /ledger pane to browse tasks, see acceptance progress, and start one
//   - The active task id beside the spinner while Claude works
// Git and the TASK-*.md files stay the source of truth; this only reads them.

import {
  ICON,
  COLOR,
  LABEL,
  activeTask,
  countByStatus,
  filterTasks,
  parseSession,
  parseTask,
  progressBar,
  type Filter,
  type SessionState,
  type Task,
} from './ledger.ts'

const PANE = 'sbrain-ledger'
const REFRESH_MS = 20_000

// Ledger snapshot, rebuilt by refresh()
let root: string | null = null
let tasks: Task[] = []
let session: SessionState | null = null
let branch = ''
let dirty = 0

// Pane view state
let filter: Filter = 'open'
let selected: string | null = null

// Nearest directory at or above the session's cwd that has .agent/tasks
async function findRoot($) {
  let dir = await $.session.cwd()
  while (dir && dir !== '/') {
    if (await $.fs.exists(dir + '/.agent/tasks')) return dir
    const parent = dir.replace(/\/[^/]+\/?$/, '')
    if (parent === dir) break
    dir = parent
  }
  return null
}

async function readGit($, dir: string) {
  try {
    const head = await $.process.run(['git', 'rev-parse', '--abbrev-ref', 'HEAD'], { cwd: dir, timeoutMs: 5000 })
    branch = head.exitCode === 0 ? head.stdout.trim() : ''
    const status = await $.process.run(['git', 'status', '--porcelain'], { cwd: dir, timeoutMs: 5000 })
    dirty = status.exitCode === 0 ? status.stdout.split('\n').filter((l) => l.trim()).length : 0
  } catch {
    branch = ''
    dirty = 0
  }
}

async function refresh($) {
  root = await findRoot($)
  if (!root) {
    tasks = []
    session = null
    $.ui.invalidate('ui.render')
    return
  }
  const dir = root + '/.agent/tasks'
  const next: Task[] = []
  for (const entry of await $.fs.list(dir)) {
    if (entry.kind !== 'file' || !/^TASK-\d+\.md$/.test(entry.name)) continue
    const task = parseTask(entry.name, String(await $.fs.read(dir + '/' + entry.name)))
    if (task) next.push(task)
  }
  tasks = next
  const sessionFile = root + '/.agent/SESSION.md'
  session = (await $.fs.exists(sessionFile)) ? parseSession(String(await $.fs.read(sessionFile))) : null
  await readGit($, root)
  if (selected && !tasks.some((t) => t.id === selected)) selected = null
  $.ui.invalidate('ui.render')
}

async function reindex($) {
  if (!root) return
  try {
    const r = await $.process.run(['bash', $.plugin.root + '/scripts/reindex.sh'], { cwd: root, timeoutMs: 15000 })
    $.ui.toast(r.exitCode === 0 ? r.stdout.trim() : 'reindex başarısız: ' + r.stderr.trim())
  } catch (err) {
    $.ui.toast('reindex çalıştırılamadı: ' + String(err))
  }
  await refresh($)
}

async function startTask($, id: string) {
  await $.ui.close({ id: PANE })
  await $.prompt.fill({ text: '/sbrain:task-execution ' + id, mode: 'replace' })
}

function basename(path: string) {
  return path.replace(/\/+$/, '').split('/').pop() ?? path
}

export function register(on) {
  on('session.start', async ($, e, next) => {
    await refresh($)
    $.clock.every(REFRESH_MS, () => refresh($))
    try {
      await $.command.register({
        name: 'ledger',
        description: 'sbrain görev defterini panelde aç',
        immediate: true,
      })
    } catch (err) {
      $.ui.log('sbrain: /ledger kaydedilemedi: ' + String(err))
    }
    return next(e)
  })

  // Claude may have edited TASK files or switched branches during the turn
  on('turn.complete', async ($, e, next) => {
    await refresh($)
    return next(e)
  })

  on('command.run', { command: 'ledger' }, async ($) => {
    await refresh($)
    await $.ui.open({ id: PANE, title: 'sbrain', focus: true, closeOnEscape: true })
    return {}
  })

  // Band above the prompt: one line of ledger status
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (!root || e.props.hasSurvey) return next(e)
    const { Box, Text, Button } = $.ui.resolve(e)
    const active = activeTask(tasks, session)
    const counts = countByStatus(tasks)

    const countParts = (['in_progress', 'blocked', 'pending', 'done'] as const)
      .filter((s) => counts[s] > 0 || s === 'done')
      .map((s) => Text({ color: COLOR[s], children: [ICON[s] + counts[s]] }))

    return Box({
      flexDirection: 'row',
      columnGap: 2,
      children: [
        Text({ bold: true, color: 'claude', children: ['◆ sbrain'] }),
        active
          ? Box({
              flexDirection: 'row',
              columnGap: 1,
              flexShrink: 1,
              children: [
                Text({ color: COLOR[active.status], children: [ICON[active.status]] }),
                Text({ bold: true, children: [active.id] }),
                Text({ wrap: 'truncate-end', children: [active.title] }),
              ],
            })
          : Text({ dimColor: true, children: ['aktif görev yok'] }),
        Text({ dimColor: true, wrap: 'truncate-middle', children: ['⎇ ' + (branch || '?') + (dirty ? ' ●' + dirty : '')] }),
        Box({ flexDirection: 'row', columnGap: 1, children: countParts }),
        Button({
          key: 'open-ledger',
          label: 'Görevler',
          plain: true,
          onPress: async () => {
            await refresh($)
            await $.ui.open({ id: PANE, title: 'sbrain', focus: true, closeOnEscape: true })
          },
        }),
      ],
    })
  })

  // The active task beside the spinner word
  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    const active = activeTask(tasks, session)
    if (!active) return next(e)
    return next({ ...e, props: { ...e.props, suffix: ' · ' + active.id + (e.props.suffix ?? '') } })
  })

  // The /ledger pane
  on('ui.render', { component: 'Pane' }, async ($, e, next) => {
    if (e.requestId !== PANE) return next(e)
    const { Box, Text, Button } = $.ui.resolve(e)
    const redraw = () => $.ui.invalidate('ui.render')

    if (!root) {
      return Box({
        flexDirection: 'column',
        children: [
          Text({ bold: true, children: ['Bu klasör bir sbrain projesi değil.'] }),
          Text({ dimColor: true, children: ['.agent/tasks bulunamadı. Kurmak için: /sbrain:bootstrap'] }),
        ],
      })
    }

    const counts = countByStatus(tasks)
    const openCount = counts.in_progress + counts.blocked + counts.pending
    const closedCount = counts.done + counts.deferred
    const shown = filterTasks(tasks, filter)
    const current = tasks.find((t) => t.id === selected) ?? null

    const filterButton = (name: Filter, label: string, hotkey: string) =>
      Button({
        key: 'filter-' + name,
        label,
        hotkey,
        plain: true,
        dimColor: filter !== name,
        onPress: () => {
          filter = name
          redraw()
        },
      })

    const header = Box({
      flexDirection: 'row',
      columnGap: 2,
      children: [
        Text({ bold: true, color: 'claude', children: ['◆ ' + basename(root)] }),
        Text({ dimColor: true, children: ['⎇ ' + (branch || '?') + (dirty ? '  ●' + dirty + ' değişiklik' : '')] }),
      ],
    })

    const toolbar = Box({
      flexDirection: 'row',
      columnGap: 3,
      children: [
        filterButton('open', 'Açık (' + openCount + ')', '1'),
        filterButton('all', 'Tümü (' + tasks.length + ')', '2'),
        filterButton('done', 'Kapalı (' + closedCount + ')', '3'),
        Button({ key: 'refresh', label: 'Yenile', hotkey: 'r', plain: true, onPress: () => refresh($) }),
        Button({ key: 'reindex', label: 'Reindex', hotkey: 'i', plain: true, onPress: () => reindex($) }),
      ],
    })

    const rows = shown.length
      ? shown.map((t) =>
          Box({
            key: 'row-' + t.id,
            flexDirection: 'row',
            columnGap: 1,
            children: [
              Button({
                key: 'task-' + t.id,
                label: t.id,
                plain: true,
                dimColor: selected !== null && selected !== t.id,
                onPress: () => {
                  selected = selected === t.id ? null : t.id
                  redraw()
                },
              }),
              Text({ color: COLOR[t.status], children: [ICON[t.status]] }),
              Text({ bold: selected === t.id, wrap: 'truncate-end', children: [t.title] }),
              ...(t.module ? [Text({ dimColor: true, children: ['· ' + t.module] })] : []),
            ],
          }),
        )
      : [Text({ dimColor: true, children: ['Bu filtrede görev yok.'] })]

    const detail = current
      ? [
          Text({ children: [' '] }),
          Box({
            key: 'detail',
            flexDirection: 'column',
            borderStyle: 'round',
            paddingX: 1,
            children: [
              Text({ bold: true, children: [current.id + ': ' + current.title] }),
              Text({ color: COLOR[current.status], children: [ICON[current.status] + ' ' + LABEL[current.status]] }),
              ...[
                ['Modül', current.module],
                ['Bağımlı', current.dependsOn],
                ['Branch', current.branch],
                ['PR', current.pr],
                ['Commit', current.commit],
              ]
                .filter(([, v]) => v)
                .map(([k, v]) => Text({ children: [k.padEnd(8) + v] })),
              ...(current.criteriaTotal
                ? [
                    Text({
                      children: [
                        'Kriter  ' +
                          progressBar(current.criteriaDone, current.criteriaTotal) +
                          ' ' +
                          current.criteriaDone +
                          '/' +
                          current.criteriaTotal,
                      ],
                    }),
                  ]
                : []),
              Box({
                flexDirection: 'row',
                columnGap: 3,
                children: [
                  ...(current.status !== 'done'
                    ? [
                        Button({
                          key: 'start',
                          label: current.status === 'in_progress' ? 'Devam et' : 'Başlat',
                          hotkey: 's',
                          plain: true,
                          autoFocus: true,
                          onPress: () => startTask($, current.id),
                        }),
                      ]
                    : []),
                  Button({
                    key: 'deselect',
                    label: 'Kapat',
                    hotkey: 'x',
                    plain: true,
                    onPress: () => {
                      selected = null
                      redraw()
                    },
                  }),
                ],
              }),
            ],
          }),
        ]
      : []

    return Box({
      flexDirection: 'column',
      // Detail sits above the list so it stays visible however long the list is
      children: [header, toolbar, ...detail, Text({ children: [' '] }), ...rows],
    })
  })
}
