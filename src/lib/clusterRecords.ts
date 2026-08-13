import L from 'leaflet'
import { sortRecordsNewestFirst } from './dates'
import type { MappableRecord } from './coordinates'

export interface RecordCluster {
  id: string
  records: MappableRecord[]
  latitude: number
  longitude: number
}

/** このピクセル距離以内のピンを重なりとしてまとめる */
export const CLUSTER_PIXEL_RADIUS = 48

export function clusterRecordsByZoom(
  records: MappableRecord[],
  zoom: number,
  pixelRadius = CLUSTER_PIXEL_RADIUS,
): RecordCluster[] {
  if (records.length === 0) return []

  const points = records.map((record) =>
    L.CRS.EPSG3857.latLngToPoint(
      L.latLng(record.latitude, record.longitude),
      zoom,
    ),
  )

  const parent = records.map((_, i) => i)

  function find(i: number): number {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]]
      i = parent[i]
    }
    return i
  }

  function union(a: number, b: number) {
    const pa = find(a)
    const pb = find(b)
    if (pa !== pb) parent[pb] = pa
  }

  const radiusSq = pixelRadius * pixelRadius
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const dx = points[i].x - points[j].x
      const dy = points[i].y - points[j].y
      if (dx * dx + dy * dy <= radiusSq) union(i, j)
    }
  }

  const groups = new Map<number, MappableRecord[]>()
  for (let i = 0; i < records.length; i++) {
    const root = find(i)
    const list = groups.get(root)
    if (list) list.push(records[i])
    else groups.set(root, [records[i]])
  }

  return [...groups.values()].map((members) => {
    const sorted = sortRecordsNewestFirst(members) as MappableRecord[]
    return {
      id: sorted.map((record) => record.id).join(':'),
      records: sorted,
      latitude:
        members.reduce((sum, record) => sum + record.latitude, 0) /
        members.length,
      longitude:
        members.reduce((sum, record) => sum + record.longitude, 0) /
        members.length,
    }
  })
}
