import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { Drawer } from 'vaul'
import { useKeyboardInset } from './useKeyboardInset'

/** Jarak sheet dari tepi atas area yang terlihat saat keyboard terbuka. */
const KEYBOARD_GAP = 12

/**
 * Bottom sheet ala iOS (Vaul). Isinya hanya menggulir, tidak pernah menutup sheet: pengguna sering
 * menggeser isi untuk melihat bagian atas, dan dulu geseran itu malah menutup sheet beserta isiannya.
 * Menutup lewat geseran pegangan atau judul, tombol tutup, ketukan di luar sheet, atau Escape.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: string
  children: ReactNode
}) {
  // Vaul bisa memindahkan sheet saat keyboard muncul (`repositionInputs`), tapi hitungannya tidak memakai
  // geseran tampilan Safari, jadi isian yang diketik malah terdorong ke luar layar. Sheet ini menempel
  // sendiri ke area di atas keyboard.
  const keyboard = useKeyboardInset(open)
  const body = useRef<HTMLDivElement>(null)

  // Setelah sheet mengecil, isian yang sedang diketik digulir sampai terlihat.
  useEffect(() => {
    const focused = document.activeElement
    if (keyboard && focused instanceof HTMLElement && body.current?.contains(focused)) focused.scrollIntoView({ block: 'nearest' })
  }, [keyboard])

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} repositionInputs={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" />
        <Drawer.Content
          className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] max-w-lg flex-col rounded-t-[2rem] bg-surface outline-none"
          style={keyboard ? { bottom: keyboard.bottom, maxHeight: keyboard.height - KEYBOARD_GAP } : undefined}
        >
          {/* Pegangan dan judul: satu-satunya bagian yang bisa digeser untuk menutup. */}
          <div className="shrink-0 cursor-grab touch-none pb-1 active:cursor-grabbing">
            <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-line" />
            <div className="flex items-center justify-between gap-3 pt-3 pr-4 pl-6">
              <Drawer.Title className="text-xl font-bold tracking-tight">{title}</Drawer.Title>
              <Drawer.Close aria-label="Tutup" className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-muted transition active:scale-90">
                <X size={18} strokeWidth={2.5} />
              </Drawer.Close>
            </div>
            <Drawer.Description className="sr-only">{title}</Drawer.Description>
          </div>
          <div ref={body} data-vaul-no-drag="" className="no-scrollbar overflow-y-auto overscroll-contain px-6 pt-4 pb-safe">
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
