import { afterEach, describe, expect, it, vi } from 'vitest'
import { invoke, jsonOf, newUserId, statusOf } from './http.js'

const LAT = '35.45'
const LNG = '139.65'
const AT = '2026-08-01T03:00:00.000Z'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('INT-07 天気場所潮位', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('INT-07a GET /weather/current モック成功は 200 で temperature 等', async () => {
    vi.stubEnv('OPENWEATHER_API_KEY', 'test-owm')
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      expect(url).toContain('openweathermap.org')
      return jsonResponse({
        main: { temp: 20.4 },
        weather: [{ id: 800 }],
        wind: { speed: 1.2 },
        dt: 1_700_000_000,
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const res = await invoke({
      method: 'GET',
      path: '/weather/current',
      sub: newUserId('07a'),
      query: { lat: LAT, lng: LNG },
    })
    expect(statusOf(res)).toBe(200)
    const body = jsonOf<{ weather: { temperature: number; weatherCode: number } }>(res)
    expect(body.weather.temperature).toBe(20.4)
    expect(body.weather.weatherCode).toBe(0)
  })

  it('INT-07b lat なしは 400 Invalid lat/lng', async () => {
    const res = await invoke({
      method: 'GET',
      path: '/weather/current',
      sub: newUserId('07b'),
      query: { lng: LNG },
    })
    expect(statusOf(res)).toBe(400)
    expect(jsonOf<{ error: string }>(res).error).toBe('Invalid lat/lng')
  })

  it('INT-07c 天気キーなしは 500 Weather API is not configured', async () => {
    vi.stubEnv('OPENWEATHER_API_KEY', '')
    delete process.env.OPENWEATHER_API_KEY
    const res = await invoke({
      method: 'GET',
      path: '/weather/current',
      sub: newUserId('07c'),
      query: { lat: '10.01', lng: '10.01' },
    })
    expect(statusOf(res)).toBe(500)
    expect(jsonOf<{ error: string }>(res).error).toBe('Weather API is not configured')
  })

  it('INT-07d GET /place/current モック成功は 200 { placeName }', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toContain('nominatim.openstreetmap.org')
      return jsonResponse({
        address: { state: '神奈川県', city: '横浜市', suburb: '中区' },
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const res = await invoke({
      method: 'GET',
      path: '/place/current',
      sub: newUserId('07d'),
      query: { lat: LAT, lng: LNG },
    })
    expect(statusOf(res)).toBe(200)
    const body = jsonOf<{ placeName: string }>(res)
    expect(body.placeName).toContain('横浜市')
  })

  it('INT-07e GET /tide/current モック成功は 200 で levelCm 等', async () => {
    vi.stubEnv('MSIL_SUBSCRIPTION_KEY', 'test-msil')
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toContain('msil.go.jp')
      return jsonResponse({
        time: '2026-08-01T00:00:00+09:00',
        interval: 3600,
        tide: Array.from({ length: 24 }, (_, i) => 100 + i),
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const res = await invoke({
      method: 'GET',
      path: '/tide/current',
      sub: newUserId('07e'),
      query: { lat: LAT, lng: LNG, at: AT },
    })
    expect(statusOf(res)).toBe(200)
    const body = jsonOf<{ tide: { levelCm: number; stationName: string } }>(res)
    expect(typeof body.tide.levelCm).toBe('number')
    expect(body.tide.stationName).toBeTruthy()
  })

  it('INT-07f at 不正は 400 Invalid at', async () => {
    const res = await invoke({
      method: 'GET',
      path: '/tide/current',
      sub: newUserId('07f'),
      query: { lat: LAT, lng: LNG, at: 'not-a-date' },
    })
    expect(statusOf(res)).toBe(400)
    expect(jsonOf<{ error: string }>(res).error).toBe('Invalid at')
  })

  it('INT-07g 同じ座標の連続 GET は 2 回目キャッシュ（外部 fetch 1 回）', async () => {
    vi.stubEnv('OPENWEATHER_API_KEY', 'test-owm')
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        main: { temp: 18 },
        weather: [{ id: 800 }],
        wind: { speed: 2 },
        dt: 1_700_000_100,
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const query = { lat: '34.12', lng: '135.50' }
    const sub = newUserId('07g')
    const first = await invoke({ method: 'GET', path: '/weather/current', sub, query })
    const second = await invoke({ method: 'GET', path: '/weather/current', sub, query })
    expect(statusOf(first)).toBe(200)
    expect(statusOf(second)).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
