import { useRegisterSW } from 'virtual:pwa-register/react'

/** How often an open app checks for a new version. */
const UPDATE_CHECK_MS = 60 * 60 * 1000

/** Registers the service worker and offers a reload when a new version is waiting. */
export default function UpdateBanner() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (registration) setInterval(() => void registration.update(), UPDATE_CHECK_MS)
    },
  })

  return <UpdateBannerView show={needRefresh} onReload={() => void updateServiceWorker(true)} />
}

export function UpdateBannerView({ show, onReload }: { show: boolean; onReload: () => void }) {
  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-20 px-3 pt-[max(8px,env(safe-area-inset-top))]"
    >
      {show && (
        <div className="toast mx-auto flex max-w-xl items-center gap-3 rounded-full bg-cobalt py-1.5 pr-1.5 pl-5 text-white">
          <span className="min-w-0 flex-1 text-[15px] font-semibold">
            A new version of soon is ready
          </span>
          <button
            type="button"
            onClick={onReload}
            className="h-11 shrink-0 rounded-full bg-white px-5 text-[15px] font-bold text-cobalt"
          >
            Reload
          </button>
        </div>
      )}
    </div>
  )
}
