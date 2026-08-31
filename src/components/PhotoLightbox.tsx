import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

interface PhotoLightboxProps {
  src: string
  alt: string
  onClose: () => void
}

export function PhotoLightbox({ src, alt, onClose }: PhotoLightboxProps) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const previous = document.activeElement
    closeRef.current?.focus()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      onCloseRef.current()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      if (previous instanceof HTMLElement) previous.focus()
    }
  }, [])

  return createPortal(
    <div
      data-photo-lightbox
      className="photo-lightbox fixed inset-0 z-[100] flex cursor-zoom-out flex-col bg-sky-950/92"
      role="dialog"
      aria-modal="true"
      aria-label="拡大写真"
      onClick={() => onClose()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="flex shrink-0 justify-end px-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))]">
        <button
          ref={closeRef}
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onClose()
          }}
          className="rounded-md px-3 py-2 text-sm text-white hover:bg-white/10"
        >
          閉じる
        </button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="max-h-full max-w-full object-contain"
        />
      </div>
    </div>,
    document.body,
  )
}
