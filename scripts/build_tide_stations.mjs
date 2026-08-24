#!/usr/bin/env node
/**
 * 海しる 潮汐推算の推算地点一覧を api/src/tideStations.json に保存する。
 * 要: MSIL_SUBSCRIPTION_KEY（ポータルの試用キー or 個別発行キー）
 */
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const KEY = process.env.MSIL_SUBSCRIPTION_KEY
if (!KEY) {
  console.error('Set MSIL_SUBSCRIPTION_KEY')
  process.exit(1)
}

const res = await fetch('https://api.msil.go.jp/tide-prediction/v3/station', {
  headers: { 'Ocp-Apim-Subscription-Key': KEY },
})
if (!res.ok) {
  console.error(`station list failed: ${res.status}`)
  process.exit(1)
}

const data = await res.json()
const stations = (data.features ?? []).map((f) => {
  const [lng, lat] = f.geometry.coordinates
  return {
    code: f.properties.stationCode,
    name: f.properties.nameJa,
    nameEn: f.properties.nameEn ?? null,
    lat: Math.round(Number(lat) * 1e5) / 1e5,
    lng: Math.round(Number(lng) * 1e5) / 1e5,
  }
})
stations.sort((a, b) => a.code.localeCompare(b.code))

const out = resolve(import.meta.dirname, '../api/src/tideStations.json')
writeFileSync(out, JSON.stringify(stations), 'utf8')
console.log(`Wrote ${stations.length} stations -> ${out}`)
