# 釣り記録PWA 設計書

## 1. 概要

スマホ向け PWA。ボタン1タップで気温・時刻・GPS座標・潮位・魚種を自動取得し、端末内（IndexedDB）に保存する。

| 項目 | 方針 |
|------|------|
| 認証 | 不要 |
| サーバー | 不要（静的ホスティングのみ） |
| 保存先 | IndexedDB（ブラウザ内） |
| ホスティング | Cloudflare Pages（推奨） |

## 2. アーキテクチャ

```
[スマホ PWA]
  ├── pages/HomePage
  │     └── useRecord → 並列取得 → storage.addRecord
  ├── pages/HistoryPage
  ├── hooks/useRecord.ts
  ├── components/RecordProgress.tsx
  ├── lib/storage.ts
  ├── lib/geolocation.ts
  ├── lib/weather.ts      （Open-Meteo）
  └── lib/tide.ts         （tide736 + harbors.json）
```

### 記録フロー（本番）

1. 魚種入力（任意）
2. 「記録する」押下
3. GPS 取得（失敗時は保存中止）
4. 気温・潮位を並列取得（失敗時は null で続行）
5. IndexedDB に保存
6. 結果サマリー表示

## 3. データモデル

```typescript
interface FishingRecord {
  id: string;
  recordedAt: string;
  latitude: number;
  longitude: number;
  temperature: number | null;
  tideLevel: number | null;
  tideHarbor: string | null;
  fishSpecies: string | null;
}
```

## 4. 外部 API

| 用途 | モジュール | 備考 |
|------|------------|------|
| 座標 | `geolocation.ts` | 必須。失敗で記録中止 |
| 気温 | `weather.ts` | 任意。失敗時 null |
| 潮位 | `tide.ts` | 任意。失敗時 null。712港マスタ |

## 5. 画面

### 記録（`/`）
- 魚種入力
- 取得状況（座標 / 気温 / 潮位 / 保存）
- 保存結果サマリー
- 「記録する」ボタン

### 履歴（`/history`）
- 一覧・削除・JSON エクスポート
- 座標は Google Maps リンク

## 6. 制約

- Geolocation は HTTPS 必須（localhost 除く）
- データは端末内のみ → JSON エクスポートでバックアップ
- 潮位は天文潮位（予測値）、最寄港ベース

## 7. ホスティング

Cloudflare Pages。手順は [`docs/deploy.md`](deploy.md)。

- GitHub: https://github.com/honeston/fissingplotter
- 公開コマンド: `npx wrangler login` → `npm run deploy`
