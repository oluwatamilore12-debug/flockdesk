import { useEffect } from 'react'
import { subscribeDataChanged } from '@/lib/demoSession'

/** Reload dashboard data when sales mutates shared tenant state or the tab regains focus. */
export function useFlockDeskDataReload(reload: () => void, deps: unknown[] = []) {
  useEffect(() => {
    reload()
    const unsubscribe = subscribeDataChanged(reload)
    const onFocus = () => reload()
    window.addEventListener('focus', onFocus)
    return () => {
      unsubscribe()
      window.removeEventListener('focus', onFocus)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}