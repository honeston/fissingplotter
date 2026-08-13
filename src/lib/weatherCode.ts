/** WMO Weather interpretation codes → 日本語 */
const WMO_LABELS: Record<number, string> = {
  0: '晴れ',
  1: 'おおむね晴れ',
  2: '晴れ時々くもり',
  3: 'くもり',
  45: '霧',
  48: '着氷性の霧',
  51: '弱い霧雨',
  53: '霧雨',
  55: '強い霧雨',
  56: '弱い着氷性の霧雨',
  57: '着氷性の霧雨',
  61: '弱い雨',
  63: '雨',
  65: '強い雨',
  66: '弱い着氷性の雨',
  67: '着氷性の雨',
  71: '弱い雪',
  73: '雪',
  75: '強い雪',
  77: '霧雪',
  80: '弱いにわか雨',
  81: 'にわか雨',
  82: '強いにわか雨',
  85: '弱いにわか雪',
  86: 'にわか雪',
  95: '雷雨',
  96: 'ひょうを伴う雷雨',
  99: '強いひょうを伴う雷雨',
}

export function weatherCodeLabel(code: number | null): string {
  if (code == null) return '—'
  return WMO_LABELS[code] ?? `天気コード${code}`
}
