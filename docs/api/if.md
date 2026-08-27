# API IF

現行コード（`api/src/handler.ts`、`infra/template.yaml`、クライアント `src/lib/api.ts`）に基づく HTTP API 定義。パスと処理の流れは [API 設計](design.md)。画面側の項目は [画面 IF](../screens/if.md)。

ベース URL は `VITE_API_URL`（本番は SAM Output `ApiUrl`）。パスはステージプレフィックスなし（`/health`）。API Gateway の `/prod/...` は Lambda 内で正規化する。

---

## 1. 共通仕様

### 1.1 プロトコル

| 項目 | 内容 |
|------|------|
| スキーム | HTTPS（ローカルは SAM local） |
| 形式 | JSON（`Content-Type: application/json`）。204 は本文なし |
| 文字コード | UTF-8 |
| CORS | `Access-Control-Allow-Origin: *`。メソッド GET / POST / DELETE / OPTIONS。ヘッダ `Authorization, Content-Type` |
| OPTIONS | 全パス 204 |

### 1.2 認証

`GET /health` 以外は Cognito JWT。

```
Authorization: Bearer <idToken>
```

| 環境 | 検証 |
|------|------|
| 本番 | API Gateway Cognito JWT オーソライザ + Lambda が `sub` を使用 |
| ローカル | オーソライザなし。Lambda が JWT から `sub` を読む |

`sub` が取れない → **401** `{ "error": "Unauthorized" }`。

退会キュー（`DELETE /account` 後）に載っているユーザー → `/health` 以外すべて **403** `{ "error": "Account deleted" }`。

### 1.3 エラー

本文は常に `{ "error": string }`（204 を除く）。

| ステータス | 条件 |
|-----------|------|
| 400 | バリデーション失敗。メッセージが `Invalid` で始まる例外も含む |
| 401 | JWT なし / 不正 |
| 403 | 退会済み |
| 404 | 不明なパス |
| 500 | その他（外部 API 失敗、キー未設定など） |

不明パス: `{ "error": "Not found" }`。

### 1.4 エンドポイント一覧

| ID | メソッド | パス | 認証 | 用途 |
|----|----------|------|------|------|
| API-01 | GET | `/health` | なし | 疎通 |
| API-02 | GET | `/records` | JWT | 一覧 |
| API-03 | POST | `/records` | JWT | 作成 / 更新 |
| API-04 | DELETE | `/records/{id}` | JWT | 削除 |
| API-05 | POST | `/photos/presign` | JWT | アップロード URL |
| API-06 | GET | `/photos/{recordId}/url` | JWT | 閲覧 URL |
| API-07 | GET | `/weather/current` | JWT | 気温・天気・風 |
| API-08 | GET | `/place/current` | JWT | 場所名 |
| API-09 | GET | `/tide/current` | JWT | 天文潮位 |
| API-10 | DELETE | `/account` | JWT | 退会 |
| BATCH-01 | — | — | EventBridge | 退会 7 日後の物理削除 |

記録は自分の `userId`（Cognito `sub`）だけ見える。写真キーは `{userId}/{recordId}.jpg`。

---

## 2. データ型

### 2.1 FishingRecord

DynamoDB および `POST /records` 本文。クライアント生成 `id`。`updatedAt` はサーバ付与（POST では無視）。

| フィールド | 型 | 必須 | 内容 |
|-----------|-----|------|------|
| id | string | はい | 空文字不可 |
| recordedAt | string | はい | ISO8601 |
| latitude | number \| null | — | 経度と両方あるか両方 null |
| longitude | number \| null | — | 同上 |
| locationName | string \| null | いいえ | 場所名 |
| temperature | number \| null | いいえ | ℃ |
| weatherCode | number \| null | いいえ | WMO 相当 |
| windSpeedMs | number \| null | いいえ | m/s |
| dawnAt / sunriseAt / sunsetAt / duskAt | string \| null | いいえ | ISO8601 |
| tideLevel | number \| null | いいえ | cm |
| tideHarbor | string \| null | いいえ | 推算点名 |
| tideCycle | string \| null | いいえ | 潮種 |
| moonPhase | string \| null | いいえ | 月相 |
| moonAge | number \| null | いいえ | 月齢 |
| tideSlopeCmPerHour | number \| null | いいえ | 潮位の傾き |
| fishSpecies | string \| null | いいえ | 魚種 |
| fishSizeCm | number \| null | いいえ | 0 以上 |
| fishWeightG | number \| null | いいえ | 0 以上 |
| tackle | TackleFields \| null | いいえ | 全空なら null |
| photoKey | string \| null | いいえ | S3 キー |
| editedFields | string[] | いいえ | `recordedAt` / `location` のみ。他は無視 |
| updatedAt | string \| null | サーバ | 一覧・応答に含む |

緯度・経度は片方だけだと 400 `Invalid coordinates`。非数値は `Invalid latitude` / `Invalid longitude`。`fishSizeCm` / `fishWeightG` が負または非数値なら `Invalid fishSizeCm` 等。

### 2.2 TackleFields

| フィールド | 型 | 内容 |
|-----------|-----|------|
| name | string | セット名 |
| rod | string | ロッド |
| reel | string | リール |
| line | string | ライン |
| lureOrBait | string | ルアー／エサ |
| rig | string | 仕掛け |

文字列以外は空文字。全項目 trim 後空なら `tackle` は null。

### 2.3 例

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "recordedAt": "2026-08-28T06:12:00.000Z",
  "latitude": 35.12345,
  "longitude": 139.67890,
  "locationName": "神奈川県三浦市",
  "temperature": 24.5,
  "weatherCode": 1,
  "windSpeedMs": 3.2,
  "dawnAt": "2026-08-28T19:32:00.000Z",
  "sunriseAt": "2026-08-28T20:00:00.000Z",
  "sunsetAt": "2026-08-28T09:18:00.000Z",
  "duskAt": "2026-08-28T09:46:00.000Z",
  "tideLevel": 82,
  "tideHarbor": "三崎",
  "tideCycle": "中潮",
  "moonPhase": "上弦",
  "moonAge": 8.2,
  "tideSlopeCmPerHour": -12.5,
  "fishSpecies": "アジ",
  "fishSizeCm": 25,
  "fishWeightG": 180,
  "tackle": {
    "name": "アジング",
    "rod": "6.4ft L",
    "reel": "2000番",
    "line": "PE 0.3号",
    "lureOrBait": "ジグヘッド",
    "rig": "フロロ 3lb"
  },
  "photoKey": "{userId}/{id}.jpg",
  "editedFields": [],
  "updatedAt": "2026-08-28T06:12:05.000Z"
}
```

---

## 3. エンドポイント

### API-01 GET `/health`

認証なし。デプロイ後の疎通と `checkApiHealth()` が使う。

**応答 200**

```json
{ "ok": true }
```

---

### API-02 GET `/records`

自分の記録を新しい順（`recordedAt#id` 降順）。

| クエリ | 必須 | 型 | 内容 |
|--------|------|-----|------|
| since | いいえ | string | ISO8601。`updatedAt`（なければ `recordedAt`）がこれより新しい件だけ |

**応答 200**

```json
{ "records": [ { "...FishingRecord" } ] }
```

---

### API-03 POST `/records`

本文は FishingRecord 1 件。同じ `id` なら上書き。`recordedAt` が変わるとソートキーを付け替える（旧アイテム削除 + 新規 Put）。

**リクエスト**

- Header: `Content-Type: application/json`
- Body: FishingRecord（`updatedAt` は無視）

本文なし → 400 `{ "error": "Missing body" }`。  
JSON 不正や必須欠落 → 400 `{ "error": "Invalid ..." }`。

**応答 201**

```json
{ "record": { "...FishingRecord", "updatedAt": "<サーバ時刻 ISO8601>" } }
```

---

### API-04 DELETE `/records/{id}`

| パス | 必須 | 内容 |
|------|------|------|
| id | はい | 記録 ID（URL エンコード） |

対象なしでも成功（何もしない）。`photoKey` があれば S3 も消す（S3 失敗でも記録削除は続ける）。

**応答 204** 本文なし。

---

### API-05 POST `/photos/presign`

アップロード用 presigned URL。有効 900 秒。Content-Type は `image/jpeg`。クライアントは `uploadUrl` へ **PUT**（本 API 経由ではない）。

**リクエスト**

```json
{ "recordId": "550e8400-e29b-41d4-a716-446655440000" }
```

| フィールド | 必須 | 内容 |
|-----------|------|------|
| recordId | はい | 非空文字列 |

本文なし → 400 `Missing body`。`recordId` 不正 → 400 `Invalid recordId`。

**応答 200**

```json
{
  "uploadUrl": "https://...",
  "photoKey": "{userId}/{recordId}.jpg",
  "expiresIn": 900
}
```

ローカル（LocalStack）では `AWS_ENDPOINT_URL_PUBLIC` があれば URL をブラウザ到達可能なホストに置換する。

---

### API-06 GET `/photos/{recordId}/url`

閲覧用 presigned GET URL。有効 900 秒。オブジェクト未作成でも URL は返す（GET 時に S3 が 404）。

**応答 200**

```json
{
  "viewUrl": "https://...",
  "expiresIn": 900
}
```

---

### API-07 GET `/weather/current`

OpenWeatherMap Current のプロキシ。約 1km グリッド（小数 2 桁）・15 分キャッシュ。画面の記録失敗時は null 扱い。

| クエリ | 必須 | 内容 |
|--------|------|------|
| lat | はい | 緯度 -90〜90 |
| lng | はい | 経度 -180〜180 |

欠け・非数値 → 400 `{ "error": "Invalid lat/lng" }`。範囲外 → 400 `Invalid coordinates`。  
`OPENWEATHER_API_KEY` 未設定 → 500 `Weather API is not configured`。

**応答 200**

```json
{
  "weather": {
    "temperature": 24.5,
    "weatherCode": 1,
    "windSpeedMs": 3.2,
    "time": "2026-08-28T06:10:00.000Z"
  }
}
```

| フィールド | 型 | 内容 |
|-----------|-----|------|
| temperature | number | ℃。小数 1 桁 |
| weatherCode | number | OWM 条件 ID を WMO 相当に変換 |
| windSpeedMs | number \| null | m/s。小数 1 桁 |
| time | string | 観測時刻 ISO8601 |

**編集時は呼ばない。** 記録作成時の値を保持する。

---

### API-08 GET `/place/current`

Nominatim reverse のプロキシ。約 11m グリッド（小数 4 桁）・30 分キャッシュ。最短間隔約 1.1 秒。User-Agent にアプリ名。番地は落とす粗い地名。

クエリは API-07 と同じ（`lat` `lng`）。

**応答 200**

```json
{ "placeName": "神奈川県三浦市" }
```

地名が作れない / Nominatim 失敗 → 500。

---

### API-09 GET `/tide/current`

海しる潮汐推算 v3。最寄り推算点の日次系列をキャッシュ。月齢・潮種は内製。`at` 指定で過去・未来の天文潮位を取れる（編集画面が使う）。

| クエリ | 必須 | 内容 |
|--------|------|------|
| lat / lng | はい | API-07 と同じ |
| at | いいえ | ISO8601。省略時は現在。不正なら 400 `Invalid at` |

キー未設定 → 500。

**応答 200**

```json
{
  "tide": {
    "levelCm": 82,
    "time": "2026-08-28T06:12:00.000Z",
    "stationCode": "XXXX",
    "stationName": "三崎",
    "distanceKm": 1.2,
    "tideCycle": "中潮",
    "moonPhase": "上弦",
    "moonAge": 8.2,
    "tideSlopeCmPerHour": -12.5
  }
}
```

| フィールド | 型 | 内容 |
|-----------|-----|------|
| levelCm | number | 天文潮位 cm |
| time | string | 参照時刻 |
| stationCode / stationName | string | 推算点 |
| distanceKm | number | 地点からの距離 km（小数 1 桁） |
| tideCycle | string | 潮種 |
| moonPhase | string | 月相 |
| moonAge | number | 月齢 |
| tideSlopeCmPerHour | number | 潮位の傾き cm/h |

---

### API-10 DELETE `/account`

1. 退会キュー（`AccountDeletionsTable`）へ `userId` / `deletedAt` / `username` を書く  
2. Cognito `AdminDeleteUser`（Username はメール）  
3. 204  

残トークンは以降 403。記録・写真の物理削除は BATCH-01。Cognito ユーザーが既に無い場合は続行。テーブル未設定は 500。

**応答 204** 本文なし。

クライアントは続けて端末データ消去とログアウトを行う（API の範囲外）。

---

### BATCH-01 アカウント物理削除

HTTP に出ない。`AccountPurgeFunction`（`purgeAccounts.ts`）。日次。`RETENTION_DAYS`（既定 7）を超えた退会ユーザーについて:

1. 当該 `userId` の記録を全削除  
2. S3 `{userId}/` 配下の写真を全削除  
3. 退会キュー行を削除  

---

## 4. 写真アップロード（S3・presign）

API-05 の `uploadUrl` に対するクライアント操作。Lambda は介さない。

| 項目 | 内容 |
|------|------|
| メソッド | PUT |
| Header | `Content-Type: image/jpeg` |
| Body | JPEG バイナリ |
| 成功 | 200 |

閲覧は API-06 の `viewUrl` へ GET。

推奨手順: presign → S3 PUT → `POST /records`（`photoKey` 付き）。

---

## 5. エラーメッセージ一覧（Lambda）

| error | ステータス | 発生 |
|-------|-----------|------|
| Unauthorized | 401 | JWT なし |
| Account deleted | 403 | 退会済み |
| Not found | 404 | 不明パス |
| Missing body | 400 | POST 本文なし |
| Invalid record body | 400 | 本文がオブジェクトでない |
| Invalid id | 400 | id 欠落 |
| Invalid recordedAt | 400 | recordedAt 欠落 |
| Invalid latitude / longitude / coordinates | 400 | 座標 |
| Invalid fishSizeCm / fishWeightG | 400 | 負数など |
| Invalid recordId | 400 | presign |
| Invalid lat/lng | 400 | weather / place / tide |
| Invalid at | 400 | tide の時刻 |
| Invalid coordinates | 400 | 緯度経度範囲外 |
| Weather API is not configured | 500 | OWM キーなし |
| （その他 Error.message） | 500 または 400 | `Invalid` 始まりは 400 |

---

## 6. 画面との対応

| API | 主に使う画面 |
|-----|----------------|
| API-01 | ヘルスチェック（画面外 / 起動確認） |
| API-02 | 履歴・図鑑・同期・記録の初回マージ |
| API-03 | 記録保存、記録編集 |
| API-04 | 記録詳細の削除 |
| API-05 / S3 PUT | 記録・編集の写真 |
| API-06 | 履歴カード・詳細・保存サマリーの写真表示 |
| API-07 | 記録（新規のみ） |
| API-08 | 記録、記録編集 |
| API-09 | 記録、記録編集（`at` 付き） |
| API-10 | 退会 |
