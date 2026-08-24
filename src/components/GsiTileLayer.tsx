import { TileLayer } from 'react-leaflet'
import {
  GSI_STD_TILE_URL,
  GSI_TILE_ATTRIBUTION,
  GSI_TILE_MAX_ZOOM,
} from '../lib/gsiTiles'

/** 国土地理院タイル（標準地図）。Leaflet 帰属に地理院タイル一覧へのリンクを入れる */
export function GsiTileLayer() {
  return (
    <TileLayer
      url={GSI_STD_TILE_URL}
      attribution={GSI_TILE_ATTRIBUTION}
      maxZoom={GSI_TILE_MAX_ZOOM}
      maxNativeZoom={GSI_TILE_MAX_ZOOM}
    />
  )
}
