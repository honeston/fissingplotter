import { lazy, Suspense, useEffect, useRef } from 'react'
import { RecordCard } from './RecordCard'
import { hasCoordinates } from '../lib/coordinates'
import type { FishingRecord } from '../types/record'

const RecordsMap = lazy(() =>
  import('./RecordsMap').then((m) => ({ default: m.RecordsMap })),
)

interface RecordDetailSheetProps {
  record: FishingRecord
  records?: FishingRecord[]
  onNavigate?: (record: FishingRecord) => void
  onClose: () => void
  onDelete?: (id: string) => void
}

const AXIS_LOCK_PX = 10
const SWIPE_PX = 56
const DISMISS_PX = 96
const CLOSE_MS = 280

type GestureAxis = 'x' | 'y' | null

interface GestureState {
  pointerId: number | null
  startX: number
  startY: number
  axis: GestureAxis
  active: boolean
  fromHeader: boolean
}

function isInteractiveTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    Boolean(target.closest('button, a, input, textarea, select, .leaflet-container'))
  )
}

export function RecordDetailSheet({
  record,
  records = [],
  onNavigate,
  onClose,
  onDelete,
}: RecordDetailSheetProps) {
  const currentIndex = records.findIndex((r) => r.id === record.id)
  const hasNavigation =
    records.length > 1 && currentIndex >= 0 && Boolean(onNavigate)
  const hasPrevious = hasNavigation && currentIndex > 0
  const hasNext = hasNavigation && currentIndex < records.length - 1

  const overlayRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const closingRef = useRef(false)
  const dragXRef = useRef(0)
  const dragYRef = useRef(0)
  const navRef = useRef({
    hasNavigation,
    hasPrevious,
    hasNext,
    currentIndex,
    records,
    onNavigate,
    onClose,
  })
  const gestureRef = useRef<GestureState>({
    pointerId: null,
    startX: 0,
    startY: 0,
    axis: null,
    active: false,
    fromHeader: false,
  })

  navRef.current = {
    hasNavigation,
    hasPrevious,
    hasNext,
    currentIndex,
    records,
    onNavigate,
    onClose,
  }

  useEffect(() => {
    const { body, documentElement } = document
    const previousOverflow = body.style.overflow
    documentElement.classList.add('detail-sheet-open')
    body.style.overflow = 'hidden'

    return () => {
      documentElement.classList.remove('detail-sheet-open')
      body.style.overflow = previousOverflow
    }
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
    dragXRef.current = 0
    dragYRef.current = 0
    applyPanelTransform(0, true)
    applyBackdrop(0)
  }, [record.id])

  function applyPanelTransform(y: number, animate: boolean) {
    const panel = panelRef.current
    if (!panel) return
    panel.style.transition = animate
      ? `transform ${CLOSE_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`
      : 'none'
    panel.style.transform = `translate3d(0, ${y}px, 0)`
  }

  function applyBackdrop(y: number) {
    const backdrop = backdropRef.current
    if (!backdrop) return
    const height = panelRef.current?.offsetHeight ?? 1
    const progress = Math.min(1, Math.max(0, y / height))
    backdrop.style.opacity = String(1 - progress)
  }

  function dismiss() {
    if (closingRef.current) return
    closingRef.current = true
    const height = panelRef.current?.offsetHeight ?? window.innerHeight
    applyPanelTransform(height, true)
    applyBackdrop(height)
    window.setTimeout(() => navRef.current.onClose(), CLOSE_MS)
  }

  function resetGesture() {
    const gesture = gestureRef.current
    gesture.active = false
    gesture.axis = null
    gesture.pointerId = null
  }

  function finishGesture() {
    if (closingRef.current) return

    const gesture = gestureRef.current
    const axis = gesture.axis
    const x = dragXRef.current
    const y = dragYRef.current
    const nav = navRef.current
    resetGesture()

    if (axis === 'y' && y >= DISMISS_PX) {
      dismiss()
      return
    }

    if (
      axis === 'x' &&
      nav.hasNavigation &&
      nav.onNavigate &&
      Math.abs(x) >= SWIPE_PX
    ) {
      if (x > 0 && nav.hasPrevious) {
        nav.onNavigate(nav.records[nav.currentIndex - 1])
        return
      }
      if (x < 0 && nav.hasNext) {
        nav.onNavigate(nav.records[nav.currentIndex + 1])
        return
      }
    }

    dragXRef.current = 0
    dragYRef.current = 0
    applyPanelTransform(0, true)
    applyBackdrop(0)
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (closingRef.current) return
    if (event.pointerType === 'mouse' && event.button !== 0) return
    if (isInteractiveTarget(event.target)) return

    const gesture = gestureRef.current
    gesture.pointerId = event.pointerId
    gesture.startX = event.clientX
    gesture.startY = event.clientY
    gesture.axis = null
    gesture.active = true
    gesture.fromHeader = Boolean(
      headerRef.current?.contains(event.target as Node),
    )
    dragXRef.current = 0
    dragYRef.current = 0
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const gesture = gestureRef.current
    if (!gesture.active || gesture.pointerId !== event.pointerId) return

    const dx = event.clientX - gesture.startX
    const dy = event.clientY - gesture.startY
    const nav = navRef.current

    if (!gesture.axis) {
      if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return

      if (Math.abs(dx) > Math.abs(dy)) {
        if (!nav.hasNavigation) {
          resetGesture()
          return
        }
        gesture.axis = 'x'
        event.currentTarget.setPointerCapture(event.pointerId)
      } else {
        const atTop = (scrollRef.current?.scrollTop ?? 0) <= 0
        if (dy > 0 && (gesture.fromHeader || atTop)) {
          gesture.axis = 'y'
          event.currentTarget.setPointerCapture(event.pointerId)
        } else {
          resetGesture()
          return
        }
      }
    }

    event.preventDefault()

    if (gesture.axis === 'x') {
      dragXRef.current = dx
      dragYRef.current = 0
      return
    }

    const y = Math.max(0, dy)
    dragXRef.current = 0
    dragYRef.current = y
    applyPanelTransform(y, false)
    applyBackdrop(y)
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const gesture = gestureRef.current
    if (gesture.pointerId !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    if (!gesture.active || gesture.axis == null) {
      resetGesture()
      return
    }
    finishGesture()
  }

  useEffect(() => {
    const overlay = overlayRef.current
    if (!overlay) return

    const blockBehind = (event: Event) => {
      event.stopPropagation()
    }
    const preventWhenDragging = (event: TouchEvent) => {
      event.stopPropagation()
      if (gestureRef.current.axis) event.preventDefault()
    }

    overlay.addEventListener('touchstart', blockBehind, { capture: true })
    overlay.addEventListener('touchmove', preventWhenDragging, {
      capture: true,
      passive: false,
    })
    overlay.addEventListener('touchend', blockBehind, { capture: true })
    overlay.addEventListener('wheel', blockBehind, { capture: true })

    return () => {
      overlay.removeEventListener('touchstart', blockBehind, { capture: true })
      overlay.removeEventListener('touchmove', preventWhenDragging, {
        capture: true,
      })
      overlay.removeEventListener('touchend', blockBehind, { capture: true })
      overlay.removeEventListener('wheel', blockBehind, { capture: true })
    }
  }, [])

  return (
    <div
      ref={overlayRef}
      className="detail-sheet-overlay fixed inset-0 z-50 flex flex-col justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="record-detail-title"
    >
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-sky-950/30"
        onClick={() => dismiss()}
        aria-hidden
      />
      <div
        ref={panelRef}
        className="detail-sheet-panel relative mx-auto flex h-[85dvh] w-full max-w-md flex-col rounded-t-2xl border border-sky-100 bg-white shadow-lg"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div ref={headerRef} className="detail-sheet-header shrink-0 px-4 pt-2">
          <div className="mb-2 cursor-grab select-none touch-none active:cursor-grabbing">
            <div className="flex justify-center pt-1">
              <span className="h-1 w-10 rounded-full bg-slate-300" aria-hidden />
            </div>
            <p className="pointer-events-none mt-2 text-center text-sm font-medium text-sky-950">
              {new Date(record.recordedAt).toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'short',
              })}
            </p>
          </div>
          <div className="mb-3 flex items-center justify-between">
            <h2
              id="record-detail-title"
              className="text-sm font-semibold text-sky-950"
            >
              釣果詳細
            </h2>
            <button
              type="button"
              onClick={() => dismiss()}
              className="rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
            >
              閉じる
            </button>
          </div>

          {hasNavigation && (
            <div className="mb-3 flex items-center justify-between gap-2">
              <button
                type="button"
                disabled={!hasPrevious}
                onClick={() => onNavigate?.(records[currentIndex - 1])}
                className="rounded-lg border border-sky-200 px-3 py-2 text-sm font-medium text-cyan-800 shadow-sm enabled:hover:bg-sky-50 disabled:opacity-30"
              >
                ‹ 前
              </button>
              <span className="text-xs tabular-nums text-slate-500">
                {currentIndex + 1} / {records.length}
              </span>
              <button
                type="button"
                disabled={!hasNext}
                onClick={() => onNavigate?.(records[currentIndex + 1])}
                className="rounded-lg border border-sky-200 px-3 py-2 text-sm font-medium text-cyan-800 shadow-sm enabled:hover:bg-sky-50 disabled:opacity-30"
              >
                次 ›
              </button>
            </div>
          )}
        </div>

        <div
          ref={scrollRef}
          className="detail-sheet-scroll min-h-0 flex-1 overflow-y-auto px-4 pb-6"
        >
          <RecordCard record={record} onDelete={onDelete} showLargePhoto />
          {hasCoordinates(record) && (
            <div
              key={record.id}
              className="mt-4 h-52 overflow-hidden rounded-xl border border-sky-100"
            >
              <Suspense
                fallback={
                  <div className="h-full w-full bg-sky-50" aria-hidden />
                }
              >
                <RecordsMap records={[record]} onSelectRecords={() => {}} />
              </Suspense>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
