// sbrain motion: the animated bits of the ledger UI, drawn by the surface itself.
// This is a surface module (a Client): it runs on the terminal/desktop frame clock,
// so animation never wakes the hooks module and costs nothing while idle.
//   logo   - "◆ sbrain" with a glint sweeping across it (fast while Claude works)
//   icon   - a task's status glyph: in_progress spins, blocked blinks
//   bar    - acceptance progress that eases to its value, with a passing glint

import type { ClientModule, ClientSurface, RenderElement } from 'claude-code'

export type Motion = 'full' | 'calm' | 'off'

export type MotionProps =
  | { kind: 'logo'; text: string; busy: boolean; motion: Motion }
  | { kind: 'icon'; status: string; glyph: string; color: string; busy: boolean; motion: Motion }
  | { kind: 'bar'; done: number; total: number; width: number; motion: Motion }

// Mutable per-instance clock; the timer and the drawing share this object
type Live = {
  props: MotionProps
  t: number
  // bar: the fill it eases from, when that ease started, and the target it eases to
  from: number
  start: number
  target: number
}

const FRAME = 50

// Claude-orange glint over the theme's own accent, readable on light and dark themes
const BASE = 'claude'
const GLINT = '#f4a77f'
const CORE = '#ffe4d4'

const SPIN = ['◐', '◓', '◑', '◒']
const DIAMOND = ['◆', '◈', '◇', '◈']

const easeOut = (x: number) => 1 - Math.pow(1 - Math.min(Math.max(x, 0), 1), 3)

// ---- logo -------------------------------------------------------------------

const SWEEP_MS = 900

function sweepPos(live: Live, len: number): number | null {
  const p = live.props as Extract<MotionProps, { kind: 'logo' }>
  if (p.motion === 'off' || (p.motion === 'calm' && !p.busy)) return null
  const period = p.busy ? 1500 : 7000
  const phase = live.t % period
  if (phase > SWEEP_MS) return null
  return (phase / SWEEP_MS) * (len + 6) - 3
}

function logoKey(live: Live): string {
  const p = live.props as Extract<MotionProps, { kind: 'logo' }>
  const x = sweepPos(live, p.text.length + 2)
  const glyph = p.busy && p.motion !== 'off' ? Math.floor(live.t / 250) % DIAMOND.length : 0
  return (x === null ? '-' : String(Math.round(x * 2))) + ':' + glyph
}

function drawLogo(live: Live, s: ClientSurface<Live>): RenderElement {
  const { Text } = s.elements
  const p = live.props as Extract<MotionProps, { kind: 'logo' }>
  const glyph = p.busy && p.motion !== 'off' ? DIAMOND[Math.floor(live.t / 250) % DIAMOND.length]! : '◆'
  const chars = [...(glyph + ' ' + p.text)]
  const x = sweepPos(live, chars.length)
  // Group neighbouring cells of one color into one run
  const runs: { color: string; text: string }[] = []
  chars.forEach((ch, i) => {
    const d = x === null ? Infinity : Math.abs(i - x)
    const color = d < 0.75 ? CORE : d < 1.75 ? GLINT : BASE
    const last = runs[runs.length - 1]
    if (last && last.color === color) last.text += ch
    else runs.push({ color, text: ch })
  })
  return Text({ bold: true, children: runs.map((r) => Text({ color: r.color, children: [r.text] })) })
}

// ---- status icon --------------------------------------------------------------

function iconFrame(live: Live): number {
  const p = live.props as Extract<MotionProps, { kind: 'icon' }>
  if (p.motion === 'off' || (p.motion === 'calm' && !p.busy)) return -1
  if (p.status === 'in_progress') return Math.floor(live.t / (p.busy ? 120 : 380)) % SPIN.length
  if (p.status === 'blocked') return Math.floor(live.t / 700) % 2
  return -1
}

function drawIcon(live: Live, s: ClientSurface<Live>): RenderElement {
  const { Text } = s.elements
  const p = live.props as Extract<MotionProps, { kind: 'icon' }>
  const f = iconFrame(live)
  if (f < 0) return Text({ color: p.color, children: [p.glyph] })
  if (p.status === 'in_progress') return Text({ color: p.color, children: [SPIN[f]!] })
  return Text({ color: p.color, dimColor: f === 1, children: [p.glyph] })
}

// ---- progress bar ----------------------------------------------------------------

const FILL_MS = 700
const GLINT_PERIOD = 3200

function barFill(live: Live): number {
  const p = live.props as Extract<MotionProps, { kind: 'bar' }>
  const target = p.total ? (p.done / p.total) * p.width : 0
  if (p.motion === 'off') return target
  return live.from + (target - live.from) * easeOut((live.t - live.start) / FILL_MS)
}

function barGlint(live: Live, filled: number): number {
  const p = live.props as Extract<MotionProps, { kind: 'bar' }>
  if (p.motion !== 'full' || filled < 2 || live.t - live.start < FILL_MS) return -1
  const phase = (live.t - live.start - FILL_MS) % GLINT_PERIOD
  const travel = filled * 90
  return phase < travel ? Math.floor(phase / 90) : -1
}

function barKey(live: Live): string {
  const filled = Math.round(barFill(live))
  return filled + ':' + barGlint(live, filled)
}

function drawBar(live: Live, s: ClientSurface<Live>): RenderElement {
  const { Text } = s.elements
  const p = live.props as Extract<MotionProps, { kind: 'bar' }>
  const filled = Math.round(barFill(live))
  const glint = barGlint(live, filled)
  const complete = p.total > 0 && p.done === p.total
  const fillColor = complete ? 'success' : BASE
  const cells: RenderElement[] = []
  if (glint > 0) cells.push(Text({ color: fillColor, children: ['▰'.repeat(glint)] }))
  if (glint >= 0) cells.push(Text({ color: CORE, children: ['▰'] }))
  const rest = glint >= 0 ? filled - glint - 1 : filled
  if (rest > 0) cells.push(Text({ color: fillColor, children: ['▰'.repeat(rest)] }))
  if (p.width - filled > 0) cells.push(Text({ dimColor: true, children: ['▱'.repeat(p.width - filled)] }))
  cells.push(Text({ children: [' ' + p.done + '/' + p.total] }))
  return Text({ children: cells })
}

// ---- the component --------------------------------------------------------------

const FRAME_KEY: Record<MotionProps['kind'], (live: Live) => string> = {
  logo: logoKey,
  icon: (live) => String(iconFrame(live)),
  bar: barKey,
}

const DRAW: Record<MotionProps['kind'], (live: Live, s: ClientSurface<Live>) => RenderElement> = {
  logo: drawLogo,
  icon: drawIcon,
  bar: drawBar,
}

const SbrainMotion: ClientModule<MotionProps, Live> = (props, surface) => {
  let live = surface.state
  if (!live) {
    const created: Live = { props, t: 0, from: 0, start: 0, target: props.kind === 'bar' ? props.done : 0 }
    live = created
    surface.setState(created)
    // Redraw only when the visible frame changes, so an idle logo draws nothing
    surface.every(FRAME, () => {
      const before = FRAME_KEY[created.props.kind](created)
      created.t += FRAME
      if (FRAME_KEY[created.props.kind](created) !== before) surface.setState(created)
    })
  }
  if (props.kind === 'bar' && live.props.kind === 'bar' && props.done !== live.target) {
    // A new acceptance count eases from wherever the bar is now
    live.from = barFill(live)
    live.start = live.t
    live.target = props.done
  }
  live.props = props
  return DRAW[props.kind](live, surface)
}

export default SbrainMotion
