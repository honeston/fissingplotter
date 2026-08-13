import { useEffect, useState } from 'react'
import { getPhotoViewUrl } from '../lib/api'
import { isCloudSyncEnabled } from '../lib/config'
import { getPhotoBlob } from '../lib/storage'
import type { FishingRecord } from '../types/record'

export function usePhotoUrl(record: FishingRecord): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false

    async function load() {
      const blob = await getPhotoBlob(record.id)
      if (cancelled) return

      if (blob) {
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
        return
      }

      if (record.photoKey && isCloudSyncEnabled()) {
        try {
          const viewUrl = await getPhotoViewUrl(record.id)
          if (!cancelled) setUrl(viewUrl)
        } catch {
          if (!cancelled) setUrl(null)
        }
        return
      }

      setUrl(null)
    }

    void load()

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [record.id, record.photoKey])

  return url
}
