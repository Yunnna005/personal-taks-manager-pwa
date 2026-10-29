import { reloadToUpdate, useUpdateStatus } from './updates.ts'

/** Offers a reload when a new version is waiting (src/pwa/updates.ts finds it). */
export default function UpdateBanner() {
  return <UpdateBannerView show={useUpdateStatus() === 'ready'} onReload={reloadToUpdate} />
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
