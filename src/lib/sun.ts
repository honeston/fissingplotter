/** 市民薄明・日出・日没。suncalc (Vladimir Agafonkin, BSD-2-Clause) の簡易版。 */

export interface SunTimes {
  dawnAt: string
  sunriseAt: string
  sunsetAt: string
  duskAt: string
}

const DAY_MS = 86400000
const J1970 = 2440588
const J2000 = 2451545
const J0 = 0.0009
const RAD = Math.PI / 180
const OBLIQUITY = RAD * 23.4397
const SUNRISE_ANGLE = -0.833
const CIVIL_TWILIGHT_ANGLE = -6

function toJulian(date: Date): number {
  return date.valueOf() / DAY_MS - 0.5 + J1970
}

function fromJulian(j: number): Date {
  return new Date((j + 0.5 - J1970) * DAY_MS)
}

function toDays(date: Date): number {
  return toJulian(date) - J2000
}

function solarMeanAnomaly(d: number): number {
  return RAD * (357.5291 + 0.98560028 * d)
}

function eclipticLongitude(M: number): number {
  const C =
    RAD * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M))
  return M + C + RAD * 102.9372 + Math.PI
}

function declination(L: number): number {
  return Math.asin(Math.sin(OBLIQUITY) * Math.sin(L))
}

function julianCycle(d: number, lw: number): number {
  return Math.round(d - J0 - lw / (2 * Math.PI))
}

function approxTransit(Ht: number, lw: number, n: number): number {
  return J0 + (Ht + lw) / (2 * Math.PI) + n
}

function solarTransitJ(ds: number, M: number, L: number): number {
  return J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L)
}

function hourAngle(h: number, phi: number, dec: number): number | null {
  const x =
    (Math.sin(h) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec))
  if (!Number.isFinite(x) || x < -1 || x > 1) return null
  return Math.acos(x)
}

function tokyoNoon(date: Date): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value
  return new Date(`${value('year')}-${value('month')}-${value('day')}T12:00:00+09:00`)
}

function timesForAltitude(
  angleDeg: number,
  lw: number,
  phi: number,
  dec: number,
  n: number,
  M: number,
  L: number,
  Jnoon: number,
): { rise: Date; set: Date } | null {
  const w = hourAngle(angleDeg * RAD, phi, dec)
  if (w == null) return null
  const Jset = solarTransitJ(approxTransit(w, lw, n), M, L)
  const Jrise = Jnoon - (Jset - Jnoon)
  if (!Number.isFinite(Jset) || !Number.isFinite(Jrise)) return null
  return { rise: fromJulian(Jrise), set: fromJulian(Jset) }
}

/**
 * 記録地点・日付（日本時間）の朝薄明・日出・日没・夕薄明。
 * 極夜などで計算できない場合は null。
 */
export function getSunTimes(
  date: Date,
  latitude: number,
  longitude: number,
): SunTimes | null {
  const lw = RAD * -longitude
  const phi = RAD * latitude
  const d = toDays(tokyoNoon(date))
  const n = julianCycle(d, lw)
  const ds = approxTransit(0, lw, n)
  const M = solarMeanAnomaly(ds)
  const L = eclipticLongitude(M)
  const dec = declination(L)
  const Jnoon = solarTransitJ(ds, M, L)

  const sun = timesForAltitude(SUNRISE_ANGLE, lw, phi, dec, n, M, L, Jnoon)
  const civil = timesForAltitude(CIVIL_TWILIGHT_ANGLE, lw, phi, dec, n, M, L, Jnoon)
  if (!sun || !civil) return null

  return {
    dawnAt: civil.rise.toISOString(),
    sunriseAt: sun.rise.toISOString(),
    sunsetAt: sun.set.toISOString(),
    duskAt: civil.set.toISOString(),
  }
}
