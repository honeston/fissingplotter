import { useEffect, useState } from 'react'
import { getPhotoViewUrl } from '../lib/api'
import { isCloudSyncEnabled } from '../lib/config'
import { getPhotoBlob } from '../lib/storage'
import type { FishingRecord } from '../types/record'

export function usePhotoUrl(record: FishingRecord): {
  url: string | null
  loading: boolean
} {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false
    setUrl(null)
    setLoading(true)

    async function load() {
      const blob = await getPhotoBlob(record.id)
      if (cancelled) return

      if (blob) {
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
        setLoading(false)
        return
      }

      if (record.photoKey && isCloudSyncEnabled()) {
        try {
          const viewUrl = await getPhotoViewUrl(record.id)
          if (!cancelled) {
            setUrl(viewUrl)
            setLoading(false)
          }
        } catch {
          if (!cancelled) {
            setUrl(null)
            setLoading(false)
          }
        }
        return
      }

      setUrl(null)
      setLoading(false)
    }

    void load()

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [record.id, record.photoKey])

  return { url, loading }
}
