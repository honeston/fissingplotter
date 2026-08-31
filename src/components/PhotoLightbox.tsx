import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface PhotoLightboxProps {
  src: string
  alt: string
  onClose: () => void
}

const MIN_SCALE = 1
const MAX_SCALE = 4

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function pointerDistance(
  a: { x: number; y: number },
  b: { x: number; y: number },
) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

interface Transform {
  scale: number
  x: number
  y: number
}

function PinchZoomImage({ src, alt }: { src: string; alt: string }) {
  const transformRef = useRef<Transform>({ scale: 1, x: 0, y: 0 })
  const [transform, setTransform] = useState<Transform>({ scale: 1, x: 0, y: 0 })
  const pointersRef = useRef(new Map<number, { x: number; y: number }>())
  const pinchStartRef = useRef<{
    distance: number
    scale: number
    x: number
    y: number
  } | null>(null)
  const panStartRef = useRef<{
    pointerX: number
    pointerY: number
    x: number
    y: number
  } | null>(null)

  function applyTransform(next: Transform) {
    transformRef.current = next
    setTransform(next)
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    })

    if (pointersRef.current.size === 2) {
      const pts = [...pointersRef.current.values()]
      panStartRef.current = null
      pinchStartRef.current = {
        distance: pointerDistance(pts[0], pts[1]),
        scale: transformRef.current.scale,
        x: transformRef.current.x,
        y: transformRef.current.y,
      }
      return
    }

    if (pointersRef.current.size === 1 && transformRef.current.scale > 1) {
      pinchStartRef.current = null
      panStartRef.current = {
        pointerX: event.clientX,
        pointerY: event.clientY,
        x: transformRef.current.x,
        y: transformRef.current.y,
      }
    }
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!pointersRef.current.has(event.pointerId)) return
    event.stopPropagation()
    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    })

    if (pointersRef.current.size === 2 && pinchStartRef.current) {
      const pts = [...pointersRef.current.values()]
      const distance = pointerDistance(pts[0], pts[1])
      if (pinchStartRef.current.distance > 0) {
        const scale = clamp(
          pinchStartRef.current.scale * (distance / pinchStartRef.current.distance),
          MIN_SCALE,
          MAX_SCALE,
        )
        applyTransform({
          scale,
          x: pinchStartRef.current.x,
          y: pinchStartRef.current.y,
        })
      }
      event.preventDefault()
      return
    }

    if (pointersRef.current.size === 1 && panStartRef.current) {
      const dx = event.clientX - panStartRef.current.pointerX
      const dy = event.clientY - panStartRef.current.pointerY
      applyTransform({
        scale: transformRef.current.scale,
        x: panStartRef.current.x + dx,
        y: panStartRef.current.y + dy,
      })
      event.preventDefault()
    }
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    event.stopPropagation()
    pointersRef.current.delete(event.pointerId)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    if (pointersRef.current.size === 1) {
      pinchStartRef.current = null
      const remaining = [...pointersRef.current.entries()][0]
      if (remaining && transformRef.current.scale > 1) {
        const [, pt] = remaining
        panStartRef.current = {
          pointerX: pt.x,
          pointerY: pt.y,
          x: transformRef.current.x,
          y: transformRef.current.y,
        }
      }
    }

    if (pointersRef.current.size === 0) {
      pinchStartRef.current = null
      panStartRef.current = null
      if (transformRef.current.scale <= 1.02) {
        applyTransform({ scale: 1, x: 0, y: 0 })
      }
    }
  }

  return (
    <div
      className="photo-lightbox-zoom flex h-full w-full touch-none items-center justify-center overflow-hidden"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        className="max-h-full max-w-full origin-center object-contain will-change-transform"
        style={{
          transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`,
        }}
      />
    </div>
  )
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
      className="photo-lightbox fixed inset-0 z-[100] flex flex-col bg-sky-950/92"
      role="dialog"
      aria-modal="true"
      aria-label="拡大写真"
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
      <div
        className="flex min-h-0 flex-1 cursor-zoom-out px-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]"
        onClick={onClose}
      >
        <div
          className="h-full min-h-0 w-full"
          onClick={(event) => event.stopPropagation()}
        >
          <PinchZoomImage src={src} alt={alt} />
        </div>
      </div>
    </div>,
    document.body,
  )
}
