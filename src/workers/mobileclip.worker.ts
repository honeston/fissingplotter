import {
  AutoProcessor,
  AutoTokenizer,
  CLIPTextModelWithProjection,
  CLIPVisionModelWithProjection,
  RawImage,
  dot,
} from '@huggingface/transformers'
import clipMapping from '../lib/fish-species-clip.json'
import type { FishPhotoCandidate, FishSpeciesClipEntry } from '../lib/fishSpeciesClip'
import { FISH_PHOTO_CANDIDATE_LIMIT } from '../lib/fishSpeciesClip'

const MODEL_ID = 'Xenova/mobileclip_s1'

type WorkerRequest =
  | { type: 'init' }
  | { type: 'identify'; requestId: number; blob: Blob; topK?: number }
  | { type: 'dispose' }

type WorkerResponse =
  | { type: 'ready' }
  | { type: 'identify-result'; requestId: number; candidates: FishPhotoCandidate[] }
  | { type: 'error'; requestId?: number; message: string }

interface SpeciesEmbedding {
  ja: string
  vector: number[]
}

let initPromise: Promise<void> | null = null
let speciesEmbeddings: SpeciesEmbedding[] = []
let processor: Awaited<ReturnType<typeof AutoProcessor.from_pretrained>> | null = null
let visionModel: CLIPVisionModelWithProjection | null = null

function normalizeVector(values: number[]): number[] {
  const norm = Math.hypot(...values)
  if (norm === 0) return values
  return values.map((v) => v / norm)
}

function averageVectors(vectors: number[][]): number[] {
  if (vectors.length === 0) return []
  const dim = vectors[0].length
  const sum = new Array<number>(dim).fill(0)
  for (const vector of vectors) {
    for (let i = 0; i < dim; i += 1) sum[i] += vector[i] ?? 0
  }
  return sum.map((v) => v / vectors.length)
}

async function embedPrompts(
  textModel: CLIPTextModelWithProjection,
  tokenizer: Awaited<ReturnType<typeof AutoTokenizer.from_pretrained>>,
  prompts: string[],
): Promise<number[]> {
  const vectors: number[][] = []
  for (const prompt of prompts) {
    const textInputs = tokenizer(prompt, { padding: 'max_length', truncation: true })
    const { text_embeds } = await textModel(textInputs)
    vectors.push(text_embeds.normalize().tolist()[0] as number[])
  }
  return normalizeVector(averageVectors(vectors))
}

async function ensureReady(): Promise<void> {
  if (initPromise) return initPromise

  initPromise = (async () => {
    const [tokenizer, textModel, proc, vision] = await Promise.all([
      AutoTokenizer.from_pretrained(MODEL_ID),
      CLIPTextModelWithProjection.from_pretrained(MODEL_ID),
      AutoProcessor.from_pretrained(MODEL_ID),
      CLIPVisionModelWithProjection.from_pretrained(MODEL_ID),
    ])

    processor = proc
    visionModel = vision

    const entries = clipMapping as FishSpeciesClipEntry[]
    speciesEmbeddings = []
    for (const entry of entries) {
      const vector = await embedPrompts(textModel, tokenizer, entry.clipPrompts)
      speciesEmbeddings.push({ ja: entry.ja, vector })
    }

    postMessage({ type: 'ready' } satisfies WorkerResponse)
  })().catch((err) => {
    initPromise = null
    throw err
  })

  return initPromise
}

async function identifyFromBlob(blob: Blob, topK: number): Promise<FishPhotoCandidate[]> {
  await ensureReady()
  if (!processor || !visionModel) throw new Error('MobileCLIP の初期化に失敗しました')

  const url = URL.createObjectURL(blob)
  try {
    const image = await RawImage.read(url)
    const imageInputs = await processor(image)
    const { image_embeds } = await visionModel(imageInputs)
    const imageVector = image_embeds.normalize().tolist()[0] as number[]

    const scored = speciesEmbeddings
      .map(({ ja, vector }) => ({
        species: ja,
        score: dot(imageVector, vector),
      }))
      .sort((a, b) => b.score - a.score)

    return scored.slice(0, topK)
  } finally {
    URL.revokeObjectURL(url)
  }
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data
  void (async () => {
    try {
      if (msg.type === 'dispose') {
        initPromise = null
        speciesEmbeddings = []
        processor = null
        visionModel = null
        self.close()
        return
      }

      if (msg.type === 'init') {
        await ensureReady()
        return
      }

      if (msg.type === 'identify') {
        const candidates = await identifyFromBlob(msg.blob, msg.topK ?? FISH_PHOTO_CANDIDATE_LIMIT)
        postMessage({
          type: 'identify-result',
          requestId: msg.requestId,
          candidates,
        } satisfies WorkerResponse)
      }
    } catch (err) {
      postMessage({
        type: 'error',
        requestId: msg.type === 'identify' ? msg.requestId : undefined,
        message: err instanceof Error ? err.message : '魚種推定に失敗しました',
      } satisfies WorkerResponse)
    }
  })()
}
