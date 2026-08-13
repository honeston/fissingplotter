import { useEffect } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import type { FishingRecord } from '../types/record'

const defaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

L.Marker.prototype.options.icon = defaultIcon

const DEFAULT_CENTER: [number, number] = [36.2, 138.25]
const DEFAULT_ZOOM = 5

function FitBounds({ records }: { records: FishingRecord[] }) {
  const map = useMap()

  useEffect(() => {
    if (records.length === 0) {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM)
      return
    }
    if (records.length === 1) {
      map.setView([records[0].latitude, records[0].longitude], 14)
      return
    }
    const bounds = L.latLngBounds(
      records.map((r) => [r.latitude, r.longitude] as [number, number]),
    )
    map.fitBounds(bounds, { padding: [40, 40] })
  }, [map, records])

  return null
}

interface RecordsMapProps {
  records: FishingRecord[]
  onSelectRecord: (record: FishingRecord) => void
}

export function RecordsMap({ records, onSelectRecord }: RecordsMapProps) {
  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      className="h-full w-full rounded-xl"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {records.map((record) => (
        <Marker
          key={record.id}
          position={[record.latitude, record.longitude]}
          eventHandlers={{
            click: () => onSelectRecord(record),
          }}
        />
      ))}
      <FitBounds records={records} />
    </MapContainer>
  )
}
