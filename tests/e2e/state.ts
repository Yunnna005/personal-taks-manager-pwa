// Shared browser state for e2e tests.
export const BASE_URL = 'http://127.0.0.1:3000'

/**
 * As if "Try it in this browser" was chosen, so desktop projects test the app
 * rather than DesktopLanding. Tests of the landing page start without it.
 */
export const TRIED_IN_BROWSER = {
  cookies: [],
  origins: [{ origin: BASE_URL, localStorage: [{ name: 'soon-try-in-browser', value: '1' }] }],
}
