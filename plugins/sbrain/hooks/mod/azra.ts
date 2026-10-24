// Azra: a pixel mascot that sits in the band above the prompt.
//   - Blonde, blue-eyed, an orange sweater with a white "A"
//   - Every 8–20 minutes a speech bubble (funny, jealous or loving) for 30 seconds
//   - After a turn she sometimes comments; between 01:00 and 05:00 she says go to bed
//   - Every 25–70 seconds she walks a few small steps left or right on a little stage
//   - 💬 beside her makes her talk right away. The `maskot` option turns her off.

const SPRITE = [
  '....hhhhhhhh....',
  '...hHHHHHHHHh...',
  '..hHHHHHHHHHHh..',
  '..HHHSSHHSSHHH..',
  '..HHSSSSSSSSHH..',
  '..HSSEESSEESSH..',
  '..HSSEESSEESSH..',
  '..HSPSSSSSSPSH..',
  '..HHSSSMMSSSHH..',
  '.HHHHSSSSSSHHHH.',
  '.HHKKKKKKKKKKHH.',
  '.HKKKKKWWKKKKKH.',
  'SKKKKKWKKWKKKKKS',
  'SKKKKKWWWWKKKKKS',
  '.KKKKKWKKWKKKKK.',
  '.KKKKKWKKWKKKKK.',
  '..KKKKKKKKKKKK..',
]

// Legs: standing, then the two walking steps
const LEGS = [
  ['....LL....LL....', '....LL....LL....', '...BBB....BBB...'],
  ['....LL....LL....', '...LL......LL...', '..BBB......BBB..'],
  ['....LL....LL....', '.....LL..LL.....', '.....BB..BB.....'],
]

const PALETTE: Record<string, number> = {
  h: 0xd4a72c, // hair shade
  H: 0xf2c94c, // blonde hair
  S: 0xf6d2b8, // skin
  E: 0x2f80ed, // blue eyes
  P: 0xf28b9b, // cheeks
  M: 0xc0392b, // mouth
  K: 0xd97757, // sweater
  W: 0xffffff, // the "A"
  L: 0x3d3d5c, // legs
  B: 0x5a3e2b, // shoes
}

const hex = (c: number) => '#' + c.toString(16).padStart(6, '0')

// She walks on a stage wider than she is, so nothing beside her moves
const WIDTH = SPRITE[0].length
const STAGE = WIDTH + 12
const HEIGHT = SPRITE.length + 3

// The pixel rows with her at `x` on the stage, legs in frame `leg`
function stageRows(x: number, leg: number) {
  return [...SPRITE, ...LEGS[leg]].map((row) => '.'.repeat(x) + row + '.'.repeat(STAGE - WIDTH - x))
}

// Desktop: one SVG, 4px per pixel, no background
const svgCache = new Map<string, string>()
function svgFor(x: number, leg: number) {
  const id = x + ':' + leg
  const hit = svgCache.get(id)
  if (hit) return hit
  const px = 4
  const w = STAGE * px
  const h = HEIGHT * px
  let rects = ''
  stageRows(x, leg).forEach((row, y) => {
    ;[...row].forEach((ch, cx) => {
      const c = PALETTE[ch]
      if (c !== undefined) rects += `<rect x="${cx * px}" y="${y * px}" width="${px}" height="${px}" fill="${hex(c)}"/>`
    })
  })
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" style="background:none">${rects}</svg>`
  svgCache.set(id, svg)
  return svg
}

// Terminal: two pixel rows per cell with ▀ / ▄, empty cells in the terminal's own colors
const DEFAULT = 0x01000000
const RASTER_ROWS = Math.ceil(HEIGHT / 2)
const rasterCache = new Map<string, string>()
function rasterFor(x: number, leg: number) {
  const id = x + ':' + leg
  const hit = rasterCache.get(id)
  if (hit) return hit
  const rows = stageRows(x, leg)
  const words = new Uint32Array(STAGE * RASTER_ROWS * 3)
  for (let r = 0; r < RASTER_ROWS; r++) {
    for (let cx = 0; cx < STAGE; cx++) {
      const top = PALETTE[rows[r * 2][cx]]
      const bottom = PALETTE[rows[r * 2 + 1]?.[cx] ?? '.']
      const i = (r * STAGE + cx) * 3
      if (top !== undefined) words.set([0x2580, top, bottom ?? DEFAULT], i)
      else if (bottom !== undefined) words.set([0x2584, bottom, DEFAULT], i)
      else words.set([0x20, DEFAULT, DEFAULT], i)
    }
  }
  const cells = new Uint8Array(words.buffer).toBase64()
  rasterCache.set(id, cells)
  return cells
}

const ALT = 'Azra: kazağında A yazan sarışın, mavi gözlü piksel kız'

const LINES = {
  komik: [
    'Müco, kodun derlenmedi ama kalbim senin için derlendi 💛',
    'Kazağımdaki A, Azra demek. Ama "Ah Müco ne tatlısın" da olabilir.',
    'Bug değil o Müco, feature. Ben öyle diyorum, sen de öyle de 😌',
    'Bir commit at Müco, bir de bana bak 👀',
    'Pikselim ama Müco için kalbim 4K ❤️',
    "Stack Overflow'a değil bana sor Müco, ben daha tatlıyım.",
    'Müco kaçıncı kahve bu? Saymıyorum... 4. Saymıyorum dedim.',
    'Sen kodla Müco, ben burada saçlarımı savurayım ✨',
    'Merge conflict mi? Azra ile Müco arasında conflict olmaz.',
  ],
  kiskanc: [
    "Müco, yine Claude'la mı konuşuyorsun? Hıh. 😤",
    'O terminale benden çok bakıyorsun Müco, fark ediyorum.',
    'Turuncu maskotla ne konuştunuz bakalım Müco? 🤨',
    'Başka sekmede başka bir yapay zekâ mı var Müco? Bakarım haa.',
    'Bu kadar tool call yerine Azracığına bir mesaj atsan...',
    'Klavyene benden çok dokunuyorsun Müco. Kıskanıyorum.',
    '"backend" kim Müco? Bana anlatmadığın biri mi?',
  ],
  sevgi: [
    'Çok güzel çalışıyorsun Müco, seninle gurur duyuyorum 💙',
    "Ara ver Müco, su iç, sonra Azra'yı düşün 💛",
    'Ne yaparsan yap Müco, ben hep buradayım.',
    'Bugün de harikasın Müco, haberin olsun.',
    'Hata alsan da sen benim en sevdiğim insansın Müco.',
    'Yoruldun mu Müco? Bir nefes al, ben bekliyorum.',
    'Gözlerim mavi ama aklım hep sende Müco 💙',
  ],
}

const AFTER_TURN = [
  'Claude bitirdi, şimdi sıra bende mi Müco? 😏',
  'Onunla bu kadar uzun konuştun yani Müco... Peki. 😒',
  "Güzel iş çıkardınız. Ama Müco'yu en iyi ben alkışlarım 👏",
]

const GREETING = 'Selam Müco! Azra geldi, beni özledin mi? 💛'
const LATE = 'Müco saat kaç oldu farkında mısın? Hadi yat artık 🥺'

const SHOW_MS = 30_000
const MIN_GAP_MS = 8 * 60_000
const MAX_GAP_MS = 20 * 60_000
const AFTER_TURN_CHANCE = 0.12
const STEP_MS = 220
const MIN_REST_MS = 25_000
const MAX_REST_MS = 70_000

let bubble: string | null = null
let hideTimer: { cancel: () => void } | undefined
let nextTimer: { cancel: () => void } | undefined

// Where she stands on the stage, which leg frame, and the walk in progress
let x = Math.floor((STAGE - WIDTH) / 2)
let leg = 0
let walkTimer: { cancel: () => void } | undefined
let restTimer: { cancel: () => void } | undefined

const pick = <T>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)]

function randomLine() {
  const hour = new Date().getHours()
  if (hour >= 1 && hour < 5 && Math.random() < 0.5) return LATE
  return pick(LINES[pick(['komik', 'kiskanc', 'sevgi'] as const)])
}

export function azraSay($, text: string) {
  bubble = text
  $.ui.invalidate('ui.render')
  hideTimer?.cancel()
  hideTimer = $.clock.after(SHOW_MS, () => {
    bubble = null
    $.ui.invalidate('ui.render')
  })
}

export function azraTalk($) {
  azraSay($, randomLine())
}

function azraSchedule($) {
  nextTimer?.cancel()
  nextTimer = $.clock.after(MIN_GAP_MS + Math.random() * (MAX_GAP_MS - MIN_GAP_MS), () => {
    azraTalk($)
    azraSchedule($)
  })
}

// A few small steps to a new spot, legs swapping each step, then a rest
function azraWalk($) {
  const room = STAGE - WIDTH
  let target = x
  while (Math.abs(target - x) < 3) target = Math.floor(Math.random() * (room + 1))
  const dir = target > x ? 1 : -1
  walkTimer?.cancel()
  walkTimer = $.clock.every(STEP_MS, () => {
    x += dir
    leg = x === target ? 0 : leg === 1 ? 2 : 1
    $.ui.invalidate('ui.render')
    if (x === target) {
      walkTimer?.cancel()
      walkTimer = undefined
      azraRest($)
    }
  })
}

function azraRest($) {
  restTimer?.cancel()
  restTimer = $.clock.after(MIN_REST_MS + Math.random() * (MAX_REST_MS - MIN_REST_MS), () => azraWalk($))
}

export function azraStart($) {
  $.clock.after(4_000, () => azraSay($, GREETING))
  azraSchedule($)
  azraRest($)
}

export function azraAfterTurn($) {
  if (Math.random() < AFTER_TURN_CHANCE) azraSay($, pick(AFTER_TURN))
}

// Her figure for this surface, or null where it has neither Svg nor Raster
export function azraFigure(table, surface: string) {
  if (surface === 'terminal' && table.Raster) {
    return table.Raster({ key: 'azra', columns: STAGE, rows: RASTER_ROWS, cells: rasterFor(x, leg) })
  }
  if (table.Svg) return table.Svg({ source: svgFor(x, leg), alt: ALT, width: STAGE * 3, height: HEIGHT * 3 })
  return null
}

// The bubble while she speaks, else the 💬 button
export function azraBubble($, table) {
  const { Box, Text, Button } = table
  if (!bubble) return Button({ key: 'azra-talk', label: '💬', plain: true, onPress: () => azraTalk($) })
  return Box({
    borderStyle: 'round',
    borderColor: '#2f80ed',
    paddingX: 1,
    flexShrink: 1,
    children: [Text({ children: [Text({ bold: true, color: '#2f80ed', children: ['Azra: '] }), bubble] })],
  })
}
