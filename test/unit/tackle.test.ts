import { describe, expect, it } from 'vitest'
import { sampleRecord } from './recordFixture'
import {
  EMPTY_TACKLE_FIELDS,
  lureOrBaitFieldLabel,
  normalizeTackleFields,
  rigFieldPlaceholder,
} from '../../src/types/tackle'
import {
  canonicalTackleTerm,
  collectTackleHistory,
  searchTackleField,
} from '../../src/lib/tackleSuggestions'

describe('normalizeTackleFields', () => {
  it('旧データ（kind なし）は lure として読む', () => {
    expect(
      normalizeTackleFields({
        name: '',
        rod: '6ft',
        reel: '',
        line: '',
        lureOrBait: 'ミノー',
        rig: '',
      }),
    ).toEqual({
      name: '',
      rod: '6ft',
      reel: '',
      line: '',
      lureOrBaitKind: 'lure',
      lureOrBait: 'ミノー',
      rig: '',
    })
  })

  it('bait を保持する', () => {
    expect(
      normalizeTackleFields({
        ...EMPTY_TACKLE_FIELDS,
        lureOrBaitKind: 'bait',
        lureOrBait: 'アオイソメ',
      }),
    ).toMatchObject({ lureOrBaitKind: 'bait', lureOrBait: 'アオイソメ' })
  })

  it('kind だけでは null', () => {
    expect(
      normalizeTackleFields({ ...EMPTY_TACKLE_FIELDS, lureOrBaitKind: 'bait' }),
    ).toBeNull()
  })
})

describe('lureOrBaitFieldLabel', () => {
  it('モードでラベルを切り替える', () => {
    expect(lureOrBaitFieldLabel('lure')).toBe('ルアー')
    expect(lureOrBaitFieldLabel('bait')).toBe('エサ')
  })
})

describe('rigFieldPlaceholder', () => {
  it('エサ時はサビキなど餌仕掛けの例', () => {
    expect(rigFieldPlaceholder('bait')).toContain('サビキ')
    expect(rigFieldPlaceholder('lure')).toContain('フロロ')
  })
})

describe('タックル候補検索', () => {
  it('空クエリのルアーは種類名から始まる', () => {
    const hits = searchTackleField('lureOrBait', '', { kind: 'lure' })
    expect(hits[0]?.value).toBe('ミノー')
  })

  it('ひらがなで種類名に届く', () => {
    const hits = searchTackleField('lureOrBait', 'みのー', { kind: 'lure' })
    expect(hits.some((h) => h.value === 'ミノー')).toBe(true)
  })

  it('エサ切替ではルアー種が出ない', () => {
    const hits = searchTackleField('lureOrBait', '', { kind: 'bait' })
    expect(hits.some((h) => h.value === 'アオイソメ')).toBe(true)
    expect(hits.some((h) => h.value === 'ミノー')).toBe(false)
  })

  it('履歴は空クエリでカタログより先', () => {
    const hits = searchTackleField('rod', '', { history: ['自分のロッド'] })
    expect(hits[0]?.value).toBe('自分のロッド')
  })

  it('別名は正規名へ寄せ、未知の入力はそのまま', () => {
    expect(canonicalTackleTerm('lureOrBait', 'minnow')).toBe('ミノー')
    expect(canonicalTackleTerm('reel', 'stella')).toBe('ステラ')
    expect(canonicalTackleTerm('line', 'PE1.0')).toBe('PE 1.0号')
    expect(canonicalTackleTerm('rod', '自分の竿')).toBe('自分の竿')
  })

  it('記録とマイタックルから欄ごとに新しい順で集める', () => {
    const history = collectTackleHistory(
      [
        sampleRecord({
          id: 'r1',
          recordedAt: '2026-09-02T00:00:00.000Z',
          tackle: { ...EMPTY_TACKLE_FIELDS, rod: '新しい竿', lureOrBait: 'ミノー' },
        }),
        sampleRecord({
          id: 'r2',
          recordedAt: '2026-09-01T00:00:00.000Z',
          tackle: {
            ...EMPTY_TACKLE_FIELDS,
            lureOrBaitKind: 'bait',
            lureOrBait: 'アオイソメ',
            rig: 'サビキ',
          },
        }),
      ],
      [{ ...EMPTY_TACKLE_FIELDS, name: 'シーバスセット', rod: '古い竿' }],
    )
    expect(history.rod).toEqual(['新しい竿', '古い竿'])
    expect(history.lure).toEqual(['ミノー'])
    expect(history.bait).toEqual(['アオイソメ'])
    expect(history.rigBait).toEqual(['サビキ'])
    expect(history.name).toEqual(['シーバスセット'])
  })
})
