import {
  FISH_PHOTO_CANDIDATE_LIMIT,
  MOBILECLIP_FISH_SUGGEST_ENABLED,
  type FishPhotoCandidate,
} from './fishSpeciesClip'

type WorkerRequest =
  | { type: 'init' }
  | { type: 'identify'; requestId: number; blob: Blob; topK?: number }
  | { type: 'dispose' }

type WorkerResponse =
  | { type: 'ready' }
  | { type: 'identify-result'; requestId: number; candidates: FishPhotoCandidate[] }
  | { type: 'error'; requestId?: number; message: string }

let worker: Worker | null = null
let readyPromise: Promise<void> | null = null
let nextRequestId = 0

function waitForWorkerReady(w: Worker): Promise<void> {
  return new Promise((resolve, reject) => {
    const onMessage = (event: MessageEvent<WorkerResponse>) => {
      if (event.data.type === 'ready') {
        w.removeEventListener('message', onMessage)
        resolve()
      } else if (event.data.type === 'error' && event.data.requestId === undefined) {
        w.removeEventListener('message', onMessage)
        reject(new Error(event.data.message))
      }
    }
    w.addEventListener('message', onMessage)
  })
}

function getWorker(): Worker {
  if (!worker) {
    const w = new Worker(new URL('../workers/mobileclip.worker.ts', import.meta.url), {
      type: 'module',
    })
    worker = w
    readyPromise = waitForWorkerReady(w)
    w.postMessage({ type: 'init' } satisfies WorkerRequest)
  }
  return worker
}

async function ensureWorkerReady(): Promise<void> {
  const pending = readyPromise
  if (!pending) return
  await pending
}

export async function identifyFishSpeciesFromPhoto(
  blob: Blob,
  topK = FISH_PHOTO_CANDIDATE_LIMIT,
): Promise<FishPhotoCandidate[]> {
  if (!MOBILECLIP_FISH_SUGGEST_ENABLED) return []

  await ensureWorkerReady()
  const w = getWorker()
  const requestId = ++nextRequestId

  const resultPromise = new Promise<FishPhotoCandidate[]>((resolve, reject) => {
    const onMessage = (event: MessageEvent<WorkerResponse>) => {
      const data = event.data
      if (data.type === 'identify-result' && data.requestId === requestId) {
        w.removeEventListener('message', onMessage)
        resolve(data.candidates)
      } else if (data.type === 'error' && data.requestId === requestId) {
        w.removeEventListener('message', onMessage)
        reject(new Error(data.message))
      }
    }
    w.addEventListener('message', onMessage)
  })

  w.postMessage({ type: 'identify', requestId, blob, topK } satisfies WorkerRequest)
  return resultPromise
}

export function disposeFishSpeciesPhotoWorker(): void {
  if (!worker) return
  worker.postMessage({ type: 'dispose' } satisfies WorkerRequest)
  worker = null
  readyPromise = null
}
