import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { hasEditedField } from '../lib/editedFields'
import { hasCoordinates } from '../lib/coordinates'
import type { FishingRecord } from '../types/record'
import { LoadingSpinner, RecordCard } from './RecordCard'
import { EditedMark } from './RecordValueList'
import { RecordEditForm } from './RecordEditForm'

const RecordsMap = lazy(() =>
  import('./RecordsMap').then((m) => ({ default: m.RecordsMap })),
)

interface RecordDetailSheetProps {
  record: FishingRecord
  records?: FishingRecord[]
  onNavigate?: (record: FishingRecord) => void
  onClose: () => void
  onDelete?: (id: string) => void
  onUpdated?: (record: FishingRecord) => void
}

const AXIS_LOCK_PX = 10
const SWIPE_PX = 24
const SNAP_FRACTION = 0.18
const DISMISS_PX = 96
const EDGE_RESISTANCE = 0.28
const CLOSE_MS = 280
const PEEK_PX = 28
const GAP_PX = 8
const MAX_CARD_PX = 448
const PRELOAD_WINDOW = 2
const MAX_PRELOAD_WINDOW = 6

type GestureAxis = 'x' | 'y' | null

interface GestureState {
  pointerId: number | null
  startX: number
  startY: number
  axis: GestureAxis
  active: boolean
  fromHeader: boolean
}

interface TrackMetrics {
  cardWidth: number
  step: number
  centerPad: number
}

function isInteractiveTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    Boolean(
      target.closest(
        'button, a, input, textarea, select, .leaflet-container, [data-editing="true"]',
      ),
    )
  )
}

function getTrackMetrics(): TrackMetrics {
  const cardWidth = Math.min(MAX_CARD_PX, window.innerWidth - PEEK_PX * 2)
  return {
    cardWidth,
    step: cardWidth + GAP_PX,
    centerPad: Math.max(PEEK_PX, (window.innerWidth - cardWidth) / 2),
  }
}

function restingX(metrics: TrackMetrics, index: number) {
  return metrics.centerPad - index * metrics.step
}

function formatRecordDate(iso: string) {
  return new Date(iso).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })
}

function formatRecordTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function RecordDetailSheet({
  record,
  records = [],
  onNavigate,
  onClose,
  onDelete,
  onUpdated,
}: RecordDetailSheetProps) {
  const currentIndex = records.findIndex((r) => r.id === record.id)
  const hasNavigation =
    records.length > 1 && currentIndex >= 0 && Boolean(onNavigate)
  const hasPrevious = hasNavigation && currentIndex > 0
  const hasNext = hasNavigation && currentIndex < records.length - 1
  const lastIndex = Math.max(0, records.length - 1)

  const overlayRef = useRef<HTMLDivElement>(null)
  const yRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const sharedScrollTopRef = useRef(0)
  const backdropRef = useRef<HTMLDivElement>(null)
  const closingRef = useRef(false)
  const animatingRef = useRef(false)
  const dragXRef = useRef(0)
  const dragYRef = useRef(0)
  const windowPadRef = useRef(PRELOAD_WINDOW)
  const metricsRef = useRef<TrackMetrics>(getTrackMetrics())
  const [windowPad, setWindowPad] = useState(PRELOAD_WINDOW)
  const [metrics, setMetrics] = useState<TrackMetrics>(getTrackMetrics)
  const [sheetExpanded, setSheetExpanded] = useState(false)
  const navRef = useRef({
    hasNavigation,
    hasPrevious,
    hasNext,
    currentIndex,
    lastIndex,
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
    lastIndex,
    records,
    onNavigate,
    onClose,
  }
  metricsRef.current = metrics
  windowPadRef.current = windowPad

  const windowFrom = hasNavigation
    ? Math.max(0, currentIndex - windowPad)
    : currentIndex
  const windowTo = hasNavigation
    ? Math.min(lastIndex, currentIndex + windowPad)
    : currentIndex
  const slides =
    currentIndex >= 0
      ? records.slice(windowFrom, windowTo + 1).map((item, offset) => ({
          item,
          index: windowFrom + offset,
        }))
      : [{ item: record, index: 0 }]

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
    function onResize() {
      const next = getTrackMetrics()
      metricsRef.current = next
      setMetrics(next)
      if (!animatingRef.current && !gestureRef.current.active) {
        applyTrackX(
          navRef.current.hasNavigation
            ? restingX(next, navRef.current.currentIndex)
            : 0,
          false,
        )
      }
    }

    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useLayoutEffect(() => {
    syncSharedScrollTop(sharedScrollTopRef.current)
    setSheetExpanded(sharedScrollTopRef.current > 36)
    dragXRef.current = 0
    dragYRef.current = 0
    animatingRef.current = false
    windowPadRef.current = PRELOAD_WINDOW
    setWindowPad(PRELOAD_WINDOW)
    applyTrackX(
      hasNavigation ? restingX(metricsRef.current, currentIndex) : 0,
      false,
    )
    applyY(0, false)
    applyBackdrop(0)
  }, [record.id, currentIndex, hasNavigation])

  useLayoutEffect(() => {
    syncSharedScrollTop(sharedScrollTopRef.current)
  }, [windowFrom, windowTo, sheetExpanded])

  function syncSharedScrollTop(top: number, source?: HTMLElement) {
    sharedScrollTopRef.current = top
    const track = trackRef.current
    if (!track) return
    track.querySelectorAll<HTMLElement>('.detail-sheet-scroll').forEach((el) => {
      if (el === source) return
      if (Math.abs(el.scrollTop - top) > 1) {
        el.scrollTop = top
      }
    })
  }

  function applyTrackX(x: number, animate: boolean) {
    const track = trackRef.current
    if (!track) return
    track.style.transition = animate
      ? `transform ${CLOSE_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`
      : 'none'
    track.style.transform = `translate3d(${x}px, 0, 0)`
  }

  function applyY(y: number, animate: boolean) {
    const panel = yRef.current
    if (!panel) return
    panel.style.transition = animate
      ? `transform ${CLOSE_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`
      : 'none'
    panel.style.transform = `translate3d(0, ${y}px, 0)`
  }

  function applyBackdrop(y: number) {
    const backdrop = backdropRef.current
    if (!backdrop) return
    const height = yRef.current?.offsetHeight ?? 1
    const progress = Math.min(1, Math.max(0, y / height))
    backdrop.style.opacity = String(1 - progress)
  }

  function expandWindow(dragX: number) {
    const { step } = metricsRef.current
    const extra = Math.max(0, Math.ceil(Math.abs(dragX) / step) + 1)
    const next = Math.min(MAX_PRELOAD_WINDOW, PRELOAD_WINDOW + extra)
    if (next > windowPadRef.current) {
      windowPadRef.current = next
      setWindowPad(next)
    }
  }

  function clampDragX(dx: number) {
    const nav = navRef.current
    const { step } = metricsRef.current
    const minX = (nav.currentIndex - nav.lastIndex) * step
    const maxX = nav.currentIndex * step
    if (dx > maxX) return maxX + (dx - maxX) * EDGE_RESISTANCE
    if (dx < minX) return minX + (dx - minX) * EDGE_RESISTANCE
    return dx
  }

  function dismiss() {
    if (closingRef.current) return
    closingRef.current = true
    const height = yRef.current?.offsetHeight ?? window.innerHeight
    applyY(height, true)
    applyBackdrop(height)
    window.setTimeout(() => navRef.current.onClose(), CLOSE_MS)
  }

  function resetGesture() {
    const gesture = gestureRef.current
    gesture.active = false
    gesture.axis = null
    gesture.pointerId = null
  }

  function animateNavigateTo(targetIndex: number) {
    const nav = navRef.current
    const target = nav.records[targetIndex]
    if (!target || !nav.onNavigate || targetIndex === nav.currentIndex) {
      applyTrackX(restingX(metricsRef.current, nav.currentIndex), true)
      return
    }

    if (scrollRef.current) {
      syncSharedScrollTop(scrollRef.current.scrollTop, scrollRef.current)
    }
    const navigate = nav.onNavigate
    animatingRef.current = true
    applyTrackX(restingX(metricsRef.current, targetIndex), true)
    window.setTimeout(() => {
      navigate(target)
    }, CLOSE_MS)
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

    if (axis === 'x' && nav.hasNavigation) {
      const absX = Math.abs(x)
      let steps = 0
      if (absX >= SWIPE_PX && absX >= metrics.step * SNAP_FRACTION) {
        steps = Math.max(1, Math.round(absX / metrics.step))
      }
      const targetIndex = Math.min(
        nav.lastIndex,
        Math.max(0, nav.currentIndex + (x > 0 ? -steps : steps)),
      )
      if (targetIndex !== nav.currentIndex) {
        animateNavigateTo(targetIndex)
        return
      }
    }

    dragXRef.current = 0
    dragYRef.current = 0
    applyTrackX(restingX(metricsRef.current, nav.currentIndex), true)
    applyY(0, true)
    applyBackdrop(0)
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (closingRef.current || animatingRef.current) return
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
      const x = clampDragX(dx)
      dragXRef.current = x
      dragYRef.current = 0
      expandWindow(x)
      applyTrackX(restingX(metricsRef.current, nav.currentIndex) + x, false)
      return
    }

    const y = Math.max(0, dy)
    dragXRef.current = 0
    dragYRef.current = y
    applyY(y, false)
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
        ref={yRef}
        className="relative z-10 w-full"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          className={`relative w-full transition-[height] duration-300 ease-out ${
            sheetExpanded ? 'h-dvh' : 'h-[85dvh]'
          }`}
        >
          <div ref={trackRef} className="absolute inset-y-0 left-0">
            {slides.map(({ item, index }) => {
              const interactive = index === currentIndex
              return (
                <DetailSheetPanel
                  key={item.id}
                  record={item}
                  index={index}
                  total={records.length}
                  hasNavigation={hasNavigation}
                  records={records}
                  offsetLeft={hasNavigation ? index * metrics.step : 0}
                  width={hasNavigation ? metrics.cardWidth : undefined}
                  onNavigate={
                    interactive
                      ? (next) => {
                          if (animatingRef.current) return
                          const nextIndex = records.findIndex(
                            (r) => r.id === next.id,
                          )
                          if (nextIndex >= 0) animateNavigateTo(nextIndex)
                        }
                      : undefined
                  }
                  onDismiss={dismiss}
                  onDelete={interactive ? onDelete : undefined}
                  onUpdated={interactive ? onUpdated : undefined}
                  headerRef={interactive ? headerRef : undefined}
                  scrollRef={interactive ? scrollRef : undefined}
                  expanded={sheetExpanded}
                  onExpandedChange={interactive ? setSheetExpanded : undefined}
                  onScrollTopChange={
                    interactive
                      ? (top) => {
                          syncSharedScrollTop(top, scrollRef.current ?? undefined)
                        }
                      : undefined
                  }
                  showMap
                  interactive={interactive}
                  titleId={interactive ? 'record-detail-title' : undefined}
                />
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function DetailSheetPanel({
  record,
  index,
  total,
  hasNavigation,
  records,
  offsetLeft,
  width,
  onNavigate,
  onDismiss,
  onDelete,
  onUpdated,
  headerRef,
  scrollRef,
  expanded = false,
  onExpandedChange,
  onScrollTopChange,
  showMap,
  interactive,
  titleId,
}: {
  record: FishingRecord
  index: number
  total: number
  hasNavigation: boolean
  records: FishingRecord[]
  offsetLeft: number
  width?: number
  onNavigate?: (record: FishingRecord) => void
  onDismiss: () => void
  onDelete?: (id: string) => void
  onUpdated?: (record: FishingRecord) => void
  headerRef?: React.Ref<HTMLDivElement>
  scrollRef?: React.Ref<HTMLDivElement>
  expanded?: boolean
  onExpandedChange?: (expanded: boolean) => void
  onScrollTopChange?: (top: number) => void
  showMap: boolean
  interactive: boolean
  titleId?: string
}) {
  const [editing, setEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const hasPrevious = index > 0
  const hasNext = index < total - 1
  const timeEdited = hasEditedField(record, 'recordedAt')
  const onScrollTopChangeRef = useRef(onScrollTopChange)
  onScrollTopChangeRef.current = onScrollTopChange

  useEffect(() => {
    setEditing(false)
    setConfirmingDelete(false)
  }, [record.id])

  useEffect(() => {
    if (!interactive || !onExpandedChange) return
    if (!scrollRef || typeof scrollRef === 'function') return
    const refObject = scrollRef
    const setExpanded = onExpandedChange

    function onScroll() {
      const node = refObject.current
      if (!node) return
      const top = node.scrollTop
      onScrollTopChangeRef.current?.(top)
      if (top > 36) {
        setExpanded(true)
      } else if (top < 8) {
        setExpanded(false)
      }
    }

    const node = refObject.current
    if (!node) return
    node.addEventListener('scroll', onScroll, { passive: true })
    return () => node.removeEventListener('scroll', onScroll)
  }, [interactive, scrollRef, record.id, onExpandedChange])

  return (
    <div
      data-editing={editing ? 'true' : undefined}
      className={`detail-sheet-panel absolute top-0 flex h-full flex-col border-sky-100 bg-white shadow-lg transition-[border-radius] duration-300 ${
        expanded
          ? 'rounded-none border-0'
          : 'rounded-t-2xl border'
      } ${interactive ? '' : 'pointer-events-none'} ${
        hasNavigation ? '' : 'left-1/2 w-full max-w-md -translate-x-1/2'
      }`}
      style={{
        ...(hasNavigation ? { left: offsetLeft, width } : undefined),
        ...(expanded
          ? { paddingTop: 'env(safe-area-inset-top, 0px)' }
          : undefined),
      }}
      aria-hidden={!interactive}
    >
      <div
        ref={headerRef}
        className={`detail-sheet-header shrink-0 px-4 transition-[padding] duration-200 ${
          expanded ? 'pt-1 pb-0' : 'pt-2'
        }`}
      >
        <div
          className={`cursor-grab select-none touch-none active:cursor-grabbing ${
            expanded ? 'mb-1' : 'mb-2'
          }`}
        >
          <div className="flex justify-center pt-1">
            <span className="h-1 w-10 rounded-full bg-slate-300" aria-hidden />
          </div>
          <div
            className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
              expanded
                ? 'pointer-events-none grid-rows-[0fr] opacity-0'
                : 'grid-rows-[1fr] opacity-100'
            }`}
          >
            <div className="overflow-hidden">
              <p
                className={`pointer-events-none mt-2 text-center text-sm text-sky-950 ${
                  timeEdited ? 'font-bold' : 'font-medium'
                }`}
              >
                {formatRecordDate(record.recordedAt)}
                {timeEdited ? <EditedMark /> : null}
              </p>
              <p
                className={`pointer-events-none mt-0.5 text-center text-sm tabular-nums text-sky-950 ${
                  timeEdited ? 'font-bold' : 'font-medium'
                }`}
              >
                {formatRecordTime(record.recordedAt)}
              </p>
            </div>
          </div>
        </div>
        <div
          className={`flex items-center justify-between gap-2 ${
            expanded ? 'mb-2' : 'mb-3'
          }`}
        >
          <h2
            id={titleId}
            className="min-w-0 truncate text-sm font-semibold text-sky-950"
          >
            {editing
              ? '記録を編集'
              : expanded
                ? formatRecordDate(record.recordedAt)
                : '釣果詳細'}
          </h2>
          <div className="flex items-center gap-1">
            {!editing && onDelete && !confirmingDelete && (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                disabled={!interactive}
                className="rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50"
              >
                削除
              </button>
            )}
            {!editing && onUpdated && !confirmingDelete && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                disabled={!interactive}
                className="rounded-md px-2 py-1 text-xs font-medium text-cyan-800 hover:bg-sky-50"
              >
                編集
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (editing) {
                  setEditing(false)
                  return
                }
                if (confirmingDelete) {
                  setConfirmingDelete(false)
                  return
                }
                onDismiss()
              }}
              disabled={!interactive}
              className="rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
            >
              {editing || confirmingDelete ? 'キャンセル' : '閉じる'}
            </button>
          </div>
        </div>

        {confirmingDelete && onDelete && (
          <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-3">
            <p className="text-sm text-red-800">この記録を削除しますか？</p>
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                disabled={!interactive}
                onClick={() => setConfirmingDelete(false)}
                className="rounded-lg border border-sky-200 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-sky-50"
              >
                やめる
              </button>
              <button
                type="button"
                disabled={!interactive}
                onClick={() => {
                  setConfirmingDelete(false)
                  onDelete(record.id)
                }}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
              >
                削除する
              </button>
            </div>
          </div>
        )}

        {hasNavigation && !editing && !confirmingDelete && (
          <div
            className={`grid transition-[grid-template-rows,opacity,margin] duration-200 ease-out ${
              expanded
                ? 'pointer-events-none mb-0 grid-rows-[0fr] opacity-0'
                : 'mb-3 grid-rows-[1fr] opacity-100'
            }`}
          >
            <div className="overflow-hidden">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  disabled={!interactive || !hasPrevious}
                  onClick={() => onNavigate?.(records[index - 1])}
                  className="rounded-lg border border-sky-200 px-3 py-2 text-sm font-medium text-cyan-800 shadow-sm enabled:hover:bg-sky-50 disabled:opacity-30"
                >
                  ‹ 前
                </button>
                <span className="text-xs tabular-nums text-slate-500">
                  {index + 1} / {total}
                </span>
                <button
                  type="button"
                  disabled={!interactive || !hasNext}
                  onClick={() => onNavigate?.(records[index + 1])}
                  className="rounded-lg border border-sky-200 px-3 py-2 text-sm font-medium text-cyan-800 shadow-sm enabled:hover:bg-sky-50 disabled:opacity-30"
                >
                  次 ›
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div
        ref={scrollRef}
        className={`detail-sheet-scroll min-h-0 flex-1 overflow-y-auto px-4 pb-6 ${
          interactive ? '' : 'pointer-events-none'
        }`}
      >
        {editing && onUpdated ? (
          <RecordEditForm
            record={record}
            onCancel={() => setEditing(false)}
            onSaved={(updated) => {
              setEditing(false)
              onUpdated(updated)
            }}
          />
        ) : (
          <>
            <RecordCard record={record} showLargePhoto />
            {hasCoordinates(record) && (
              <div className="relative mt-4 h-52 overflow-hidden rounded-xl border border-sky-100">
                {showMap ? (
                  <Suspense
                    fallback={
                      <div className="flex h-full w-full items-center justify-center bg-sky-50">
                        <LoadingSpinner />
                      </div>
                    }
                  >
                    <RecordsMap records={[record]} onSelectRecords={() => {}} />
                  </Suspense>
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-sky-50">
                    <LoadingSpinner />
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
