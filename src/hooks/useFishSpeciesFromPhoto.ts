import { useCallback, useEffect, useRef, useState } from 'react'
import {
  MOBILECLIP_FISH_SUGGEST_ENABLED,
  type FishPhotoCandidate,
} from '../lib/fishSpeciesClip'
import { disposeFishSpeciesPhotoWorker, identifyFishSpeciesFromPhoto } from '../lib/fishSpeciesFromPhoto'

export type FishPhotoIdentifyStatus = 'idle' | 'loading' | 'done' | 'error'

export function useFishSpeciesFromPhoto() {
  const [candidates, setCandidates] = useState<FishPhotoCandidate[]>([])
  const [status, setStatus] = useState<FishPhotoIdentifyStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)

  const clear = useCallback(() => {
    requestIdRef.current += 1
    setCandidates([])
    setStatus('idle')
    setError(null)
  }, [])

  const identify = useCallback(async (blob: Blob) => {
    if (!MOBILECLIP_FISH_SUGGEST_ENABLED) {
      clear()
      return
    }

    const requestId = ++requestIdRef.current
    setStatus('loading')
    setError(null)

    try {
      const results = await identifyFishSpeciesFromPhoto(blob)
      if (requestId !== requestIdRef.current) return
      setCandidates(results)
      setStatus('done')
    } catch (err) {
      if (requestId !== requestIdRef.current) return
      setCandidates([])
      setStatus('error')
      setError(err instanceof Error ? err.message : '魚種推定に失敗しました')
    }
  }, [clear])

  useEffect(() => () => disposeFishSpeciesPhotoWorker(), [])

  return {
    candidates,
    status,
    error,
    identify,
    clear,
    enabled: MOBILECLIP_FISH_SUGGEST_ENABLED,
    identifying: status === 'loading',
  }
}
