import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getAllRecords, syncFromServer } from '../lib/sync'
import type { FishingRecord } from '../types/record'

export function useRecords() {
  const { cloudEnabled } = useAuth()
  const [records, setRecords] = useState<FishingRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      if (cloudEnabled) {
        await syncFromServer()
      }
      setRecords(await getAllRecords())
    } catch (err) {
      setError(err instanceof Error ? err.message : '読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }, [cloudEnabled])

  useEffect(() => {
    void reload()
  }, [reload])

  return { records, loading, error, reload }
}
