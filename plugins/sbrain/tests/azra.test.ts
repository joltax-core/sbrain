import { expect, mock, test } from 'claude-code/testing'

const BAND = {
  plugin: 'sbrain',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 20,
    bodyColumns: 100,
    scroll: { offset: 0, bodyRows: 19 },
    view: {},
  },
} as const

test('Azra draws beside the band, talks on 💬, and the bubble fades', async ($, on) => {
  const clock = mock.clock(on)
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect(await ui.find({ type: surface === 'desktop' ? 'Svg' : 'Raster' })).toBeDefined()
    await ui.press({ key: 'azra-talk' })
    expect(await ui.find({ type: 'Text', text: /Azra: / })).toBeDefined()
    expect(await ui.find({ key: 'azra-talk' })).toBeUndefined()
    await clock.advance(31_000)
    expect(await ui.find({ key: 'azra-talk' })).toBeDefined()
    await ui.unmount()
  }
})
