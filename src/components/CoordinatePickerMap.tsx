import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, useMap, useMapEvents } from 'react-leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { GsiTileLayer } from './GsiTileLayer'

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

function MapResize() {
  const map = useMap()

  useEffect(() => {
    const resize = () => map.invalidateSize()
    resize()
    const timer = window.setTimeout(resize, 100)
    window.addEventListener('resize', resize)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('resize', resize)
    }
  }, [map])

  return null
}

function ClickToPlace({
  onPick,
}: {
  onPick: (latitude: number, longitude: number) => void
}) {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat, event.latlng.lng)
    },
  })
  return null
}

function FlyTo({
  position,
  nonce,
}: {
  position: [number, number] | null
  nonce: number
}) {
  const map = useMap()
  const hadPosition = useRef(false)

  useEffect(() => {
    if (!position) return
    if (nonce > 0 || !hadPosition.current) {
      map.setView(position, Math.max(map.getZoom(), 14))
    }
    hadPosition.current = true
  }, [map, nonce, position])

  return null
}

interface CoordinatePickerMapProps {
  latitude: number | null
  longitude: number | null
  flyNonce?: number
  onChange: (latitude: number, longitude: number) => void
}

export function CoordinatePickerMap({
  latitude,
  longitude,
  flyNonce = 0,
  onChange,
}: CoordinatePickerMapProps) {
  const [ready, setReady] = useState(false)
  const hasPosition = latitude != null && longitude != null
  const position: [number, number] | null = hasPosition
    ? [latitude, longitude]
    : null

  useEffect(() => {
    setReady(true)
  }, [])

  if (!ready) {
    return <div className="h-full w-full rounded-xl bg-sky-50" aria-hidden />
  }

  return (
    <MapContainer
      center={position ?? DEFAULT_CENTER}
      zoom={hasPosition ? 14 : DEFAULT_ZOOM}
      style={{ height: '100%', width: '100%' }}
      className="z-0 rounded-xl"
      scrollWheelZoom
    >
      <GsiTileLayer />
      {position && (
        <Marker
          position={position}
          draggable
          eventHandlers={{
            dragend(event) {
              const next = event.target.getLatLng()
              onChange(next.lat, next.lng)
            },
          }}
        />
      )}
      <ClickToPlace onPick={onChange} />
      <FlyTo position={position} nonce={flyNonce} />
      <MapResize />
    </MapContainer>
  )
}
