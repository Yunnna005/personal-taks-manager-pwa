import { UA } from '../test/userAgents.ts'
import { isIos, isIosSafari } from './platform.ts'

describe('platform detection', () => {
  it('spots Safari on iPhone and iPad', () => {
    expect(isIosSafari({ userAgent: UA.iphoneSafari, maxTouchPoints: 5 })).toBe(true)
    expect(isIosSafari({ userAgent: UA.ipadDesktopMode, maxTouchPoints: 5 })).toBe(true)
  })

  it('leaves out other iOS browsers, Macs and Android', () => {
    expect(isIos({ userAgent: UA.iphoneChrome, maxTouchPoints: 5 })).toBe(true)
    expect(isIosSafari({ userAgent: UA.iphoneChrome, maxTouchPoints: 5 })).toBe(false)
    expect(isIosSafari({ userAgent: UA.iphoneFirefox, maxTouchPoints: 5 })).toBe(false)
    expect(isIosSafari({ userAgent: UA.ipadDesktopMode, maxTouchPoints: 0 })).toBe(false)
    expect(isIosSafari({ userAgent: UA.android, maxTouchPoints: 5 })).toBe(false)
  })
})
