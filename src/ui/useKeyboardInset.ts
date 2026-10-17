import { useEffect, useState } from 'react'
import { keyboardInset } from '../lib/viewport'

/** Area yang terlihat di atas keyboard virtual (lihat `keyboardInset`), diperbarui saat keyboard atau tampilan bergeser. */
export function useKeyboardInset(enabled: boolean) {
  const [inset, setInset] = useState<ReturnType<typeof keyboardInset>>(null)

  useEffect(() => {
    const vv = window.visualViewport
    if (!enabled || !vv) return
    const update = () =>
      setInset((prev) => {
        const next = keyboardInset(window.innerHeight, vv)
        return prev?.bottom === next?.bottom && prev?.height === next?.height ? prev : next
      })
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
      setInset(null)
    }
  }, [enabled])

  return inset
}
