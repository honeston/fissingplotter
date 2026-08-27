# 釣り記録PWA 設計書

## 1. 概要

スマホ向け PWA。ボタン1タップで気温・時刻・GPS座標・潮位・魚種を自動取得し、端末内（IndexedDB）に保存する。

| 項目 | 方針 |
|------|------|
| 認証 | Cognito User Pool（AWS 本番） / 未設定時はローカルのみ |
| サーバー | API Gateway + Lambda + DynamoDB（AWS 本番） |
| 保存先 | IndexedDB（オフラインキャッシュ）+ DynamoDB（クラウド） |
| ホスティング | AWS S3 + CloudFront（本番） / Cloudflare Pages（レガシー） |

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
  ├── lib/weather.ts      （OpenWeatherMap via API）
  ├── lib/tide.ts         （海しる潮汐推算 via API）
  └── lib/place.ts        （Nominatim via API）
```

### 記録フロー（本番）

1. 魚種入力（任意）
2. 「記録する」押下
3. GPS 取得（失敗時は保存中止）
4. 気温・潮位・場所名を並列取得（失敗時は null で続行。場所名失敗でも座標は保存）
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
| 気温 | `weather.ts` | OpenWeatherMap Current（Lambda プロキシ + キャッシュ） |
| 潮位 | `tide.ts` | 海しる潮汐推算（Lambda プロキシ + 日次キャッシュ）。月齢・潮種は内製 |

## 5. 画面

### 記録（`/`）
- 魚種入力
- 取得状況（座標 / 気温 / 潮位 / 保存）
- 保存結果サマリー
- 「記録する」ボタン

### 履歴（`/history`）
- 一覧・削除
- 座標は Google Maps リンク

## 6. 制約

- Geolocation は HTTPS 必須（localhost 除く）
- データは端末内とクラウド同期
- 潮位は天文潮位（予測値）、最寄の海しる推算点ベース（免責表示あり）

## 7. ホスティング

### AWS（本番推奨）

S3 + CloudFront + Cognito + API Gateway + Lambda + DynamoDB。手順は [`docs/deploy-aws.md`](deploy-aws.md)。

- インフラ: [`infra/template.yaml`](../infra/template.yaml)（SAM）
- 同期: [`src/lib/sync.ts`](../src/lib/sync.ts)

### Cloudflare Pages（レガシー）

手順は [`docs/deploy.md`](deploy.md)。

- GitHub: https://github.com/honeston/fissingplotter
- 公開コマンド: `npx wrangler login` → `npm run deploy`

## 8. クラウド同期

1. 記録時: IndexedDB に即保存 → オンラインなら API POST
2. 起動・履歴表示: サーバーから差分 GET → IndexedDB マージ
3. 削除: ローカル + API DELETE
4. 初回ログイン: 既存 IndexedDB 記録を一括 POST
