import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'

// jsdom has no <dialog> methods. Enough of them for components to open and
// close sheets; real dialog behaviour is covered by the Playwright tests.
if (typeof HTMLDialogElement.prototype.showModal !== 'function') {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    if (!this.open) return
    this.open = false
    this.dispatchEvent(new Event('close'))
  }
}
