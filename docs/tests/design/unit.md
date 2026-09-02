# 単体テスト

[テスト設計](README.md) / [テスト概要](../overview.md) / [テスト IF UNIT](../if.md#2-単体-unit)

I/O なし。Vitest を想定。対象は純関数と、イベントを渡すだけのバリデーション。

IndexedDB・fetch・Cognito SDK・LocalStack はここでは触らない。

---

## 対象

フロント（`src/lib`）と API（`api/src`）の両方。画面コンポーネントのレンダーは E2E。

| 領域 | モジュール | 見るもの | IF |
|------|------------|----------|-----|
| 月齢・潮種 | `api/src/moon.ts` | 月齢、潮種、月相の区分 | [UNIT-01〜03](../if.md#unit-01-月齢) |
| 単位 | `src/lib/units.ts` | cm/inch、g/kg/oz の変換。保存値は cm / g のまま。空は null、不正は無効 | [UNIT-04](../if.md#unit-04-単位変換) |
| 魚種図鑑 | `src/lib/fishEncyclopedia.ts` | 魚種なし除外、匹数（`fishCount` 未入力は 1）、最大サイズ / 重量、最大釣果日、代表画像の記録選び、魚種数・釣果数の合計、名前・別名での絞り込み | [UNIT-05](../if.md#unit-05-魚種図鑑集計) |
| 座標 | `src/lib/coordinates.ts` | 片方だけ無効、範囲 | [UNIT-06](../if.md#unit-06-座標) |
| 編集マーク | `src/lib/editedFields.ts` | `recordedAt` / `location` 以外は無視 | [UNIT-07](../if.md#unit-07-editedfields) |
| 日付 | `src/lib/dates.ts` | 履歴の日キー、期間。空・不正は落とす。期間逆転は入れ替えて含む | [UNIT-08](../if.md#unit-08-日付) |
| 天気コード | `src/lib/weatherCode.ts` | WMO 相当ラベル | [UNIT-09](../if.md#unit-09-天気コード) |
| クラスタ | `src/lib/clusterRecords.ts` | 同一地点のグループ | [UNIT-10](../if.md#unit-10-地点グループ) |
| 認証（ローカル） | `api/src/auth.ts` | JWT の `sub`、`LOCAL_DEV_USER_ID` フォールバック | [UNIT-11](../if.md#unit-11-local-dev-の-userid) |
| 記録バリデーション | `api/src/records.ts`（または同等） | 必須欠落、負の体長 / 重量、不正な匹数、緯度だけ、非数値の緯度。HTTP 400 は INT-04 | [UNIT-12](../if.md#unit-12-記録バリデーション) |
| 同期マージ | 純関数（実装時に切り出す） | 削除ログ、未送信、両方にある ID、両方未送信の後勝ち、削除と未送信編集の同時 | [UNIT-13](../if.md#unit-13-同期マージ) |
| 潮位系列 | `api/src/tideSeries.ts`、`src/lib/tideChart.ts` | 間引き、満干、いま／釣れた時刻の重ね | [UNIT-14](../if.md#unit-14-潮位系列グラフ) |

魚種名の正規化（`src/lib/fishSpecies.ts`）は辞書依存が大きい。代表ケースだけ UNIT。網羅はしない。

日出没（`src/lib/sun.ts`）は座標と日付が揃えば値が返ること、欠けると記録側が補完しないことを軽く見る。数値の天文精度は対象外。

---

## やらないこと

- `storage.ts` / IndexedDB の開閉（E2E）
- 同期のネットワーク分岐（E2E。マージ規則は UNIT-13）
- React コンポーネントのスナップショット
- 外部 API のレスポンス形（INT のモック側）
