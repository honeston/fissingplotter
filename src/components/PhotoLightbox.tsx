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

const TAP_SLOP_PX = 10

function isPointOnPhoto(
  img: HTMLImageElement | null,
  x: number,
  y: number,
) {
  if (!img) return false
  const rect = img.getBoundingClientRect()
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
}

function PinchZoomImage({
  src,
  alt,
  onBackdropTap,
}: {
  src: string
  alt: string
  onBackdropTap: () => void
}) {
  const imgRef = useRef<HTMLImageElement>(null)
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
  const tapRef = useRef<{ x: number; y: number } | null>(null)
  const closeOnClickRef = useRef(false)

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
    closeOnClickRef.current = false

    if (pointersRef.current.size === 2) {
      tapRef.current = null
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

    tapRef.current = { x: event.clientX, y: event.clientY }

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

    const tap = tapRef.current
    if (
      tap &&
      Math.hypot(event.clientX - tap.x, event.clientY - tap.y) > TAP_SLOP_PX
    ) {
      tapRef.current = null
    }

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
      const tap = tapRef.current
      tapRef.current = null
      closeOnClickRef.current = Boolean(
        tap && !isPointOnPhoto(imgRef.current, tap.x, tap.y),
      )
      pinchStartRef.current = null
      panStartRef.current = null
      if (transformRef.current.scale <= 1.02) {
        applyTransform({ scale: 1, x: 0, y: 0 })
      }
    }
  }

  return (
    <div
      className="photo-lightbox-zoom flex h-full w-full cursor-zoom-out touch-none items-center justify-center overflow-hidden"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={(event) => {
        event.stopPropagation()
        if (!closeOnClickRef.current) return
        closeOnClickRef.current = false
        onBackdropTap()
      }}
    >
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        draggable={false}
        className="max-h-full max-w-full origin-center cursor-default object-contain will-change-transform"
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
      <div
        className="flex shrink-0 cursor-zoom-out justify-end px-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))]"
        onClick={onClose}
      >
        <button
          ref={closeRef}
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onClose()
          }}
          className="cursor-default rounded-md px-3 py-2 text-sm text-white hover:bg-white/10"
        >
          閉じる
        </button>
      </div>
      <div
        className="flex min-h-0 flex-1 cursor-zoom-out px-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]"
        onClick={onClose}
      >
        <PinchZoomImage src={src} alt={alt} onBackdropTap={onClose} />
      </div>
    </div>,
    document.body,
  )
}
