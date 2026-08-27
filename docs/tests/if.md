# テスト IF

ケース ID・前提・期待結果。方針は [テスト設計](design/README.md)。仕様の正は [画面 IF](../screens/if.md) / [API IF](../api/if.md)。

---

## 1. 共通

### 1.1 ID

| 接頭辞 | 層 |
|--------|-----|
| UNIT | 単体 |
| INT | API 結合 |
| E2E | 画面（Playwright） |
| MAN | 手動 |

### 1.2 共通前提

| 層 | 前提 |
|----|------|
| UNIT | なし |
| INT | LocalStack、`LOCAL_DEV=true`、ケース固有の JWT `sub` |
| E2E | IndexedDB / localStorage 空。ビューポートはスマホ幅 |
| MAN | 開発用 Cognito。本番データ禁止 |

JWT（INT）: `Authorization: Bearer` + header.payload.signature の形。payload に `sub`。署名は検証されない。

### 1.3 優先

P1 が先。P2 は P1 が緑になってから。

---

## 2. 単体 UNIT

### UNIT-01 月齢

| | |
|--|--|
| 対象 | `api/src/moon.ts` `moonAgeDays` |
| 優先 | P1 |
| 入力 | 既知の日付 |
| 期待 | 0〜29.5 程度に収まる。朔の近くは小さい |

### UNIT-02 潮種

| | |
|--|--|
| 対象 | `tideCycleFromMoonAge` |
| 優先 | P1 |
| 入力 | 月齢 0, 7, 14, 22 付近 |
| 期待 | 大潮 / 中潮 / 小潮 / 長潮 / 若潮のいずれか。朔・望付近は大潮 |

### UNIT-03 月相

| | |
|--|--|
| 対象 | `moonPhaseFromAge` |
| 優先 | P2 |
| 入力 | UNIT-02 と同じ |
| 期待 | 新月〜晦のラベルが仕様どおり切り替わる |

### UNIT-04 単位変換

| | |
|--|--|
| 対象 | `src/lib/units.ts` |
| 優先 | P1 |
| 入力 | 25 cm、180 g |
| 期待 | inch / kg / oz 表示に変わる。逆変換で保存用 cm / g に戻せる。未設定は cm / g |

[画面 IF 1.1](../screens/if.md#11-前提) / [SCR-10](../screens/if.md#scr-10-マイページ)

### UNIT-05 魚種図鑑集計

| | |
|--|--|
| 対象 | `buildSpeciesStats` |
| 優先 | P1 |
| 入力 | アジ 2 件（サイズ違い）、魚種なし 1 件 |
| 期待 | アジのみ。匹数 2。最大サイズは大きい方。魚種なしは除外 |

[SCR-12](../screens/if.md#scr-12-マイ魚種図鑑)

### UNIT-06 座標

| | |
|--|--|
| 対象 | 座標の正規化 / 検証 |
| 優先 | P1 |
| 入力 | 両方あり、両方 null、緯度だけ |
| 期待 | 両方 or 両方 null は可。片方は不可 |

[API IF 2.1](../api/if.md#21-fishingrecord)

### UNIT-07 editedFields

| | |
|--|--|
| 対象 | `normalizeEditedFields` |
| 優先 | P2 |
| 入力 | `recordedAt`, `location`, `temperature` など |
| 期待 | 残るのは `recordedAt` / `location` のみ |

### UNIT-08 日付

| | |
|--|--|
| 対象 | `src/lib/dates.ts` |
| 優先 | P2 |
| 入力 | ISO8601 と期間 `from` / `to` |
| 期待 | 日キー YYYY-MM-DD。期間外は履歴フィルタで落ちる前提のキーが安定 |

### UNIT-09 天気コード

| | |
|--|--|
| 対象 | `src/lib/weatherCode.ts` |
| 優先 | P2 |
| 入力 | 代表コード（晴・雨など） |
| 期待 | 空や不明は「—」側。既知コードはラベルあり |

### UNIT-10 地点グループ

| | |
|--|--|
| 対象 | `clusterRecords` |
| 優先 | P2 |
| 入力 | 同一座標 2 件、離れた 1 件 |
| 期待 | 近い 2 件が同一グループ |

### UNIT-11 LOCAL_DEV の userId

| | |
|--|--|
| 対象 | `api/src/auth.ts` `getUserId` |
| 優先 | P1 |
| 入力 | JWT の sub / ヘッダなし + `LOCAL_DEV_USER_ID` / どちらもなし |
| 期待 | sub 優先。フォールバック。両方なしは throw |

### UNIT-12 記録バリデーション

| | |
|--|--|
| 対象 | POST 本文の検証（handler 経由でなくてよい） |
| 優先 | P1 |
| 入力 | id 欠落、recordedAt 欠落、fishSizeCm -1、緯度だけ |
| 期待 | Invalid id / recordedAt / fishSizeCm / coordinates 系 |

[API IF 5](../api/if.md#5-エラーメッセージ一覧lambda)

---

## 3. API 結合 INT

共通ヘッダ: 特記がなければ JWT あり。本文 JSON。

### INT-01 health

| | |
|--|--|
| 対象 | API-01 GET `/health` |
| 優先 | P1 |
| 前提 | 認証なし |
| 操作 | GET |
| 期待 | 200 `{ "ok": true }` |

### INT-02 認証

| ID | 優先 | 操作 | 期待 |
|----|------|------|------|
| INT-02a | P1 | GET `/records` ヘッダなし | 401 `Unauthorized` |
| INT-02b | P1 | 退会キューに載せた sub で GET `/records` | 403 `Account deleted` |
| INT-02c | P1 | 同じ sub で GET `/health` | 200（403 にしない） |

### INT-03 記録一覧

| ID | 優先 | 操作 | 期待 |
|----|------|------|------|
| INT-03a | P1 | ユーザー A が 2 件 POST したあと GET | 2 件。新しい順 |
| INT-03b | P1 | ユーザー B で GET | A の件は含まれない |
| INT-03c | P2 | `?since=` を最新より後 | 0 件 |
| INT-03d | P2 | `?since=` を古い時刻 | 新しい方だけ、または仕様どおり差分 |

[API-02](../api/if.md#api-02-get-records)

### INT-04 記録作成更新

| ID | 優先 | 操作 | 期待 |
|----|------|------|------|
| INT-04a | P1 | 必須だけの POST | 201。`updatedAt` あり。POST した `updatedAt` は使わない |
| INT-04b | P1 | 同じ id で魚種を変えて POST | 201。GET は 1 件。魚種は後者 |
| INT-04c | P1 | 本文なし | 400 `Missing body` |
| INT-04d | P1 | id なし | 400 `Invalid id` |
| INT-04e | P1 | 緯度だけ | 400 `Invalid coordinates` |
| INT-04f | P2 | `recordedAt` を変えて POST | 一覧の順が新時刻側。旧ソートキーの幽霊行がない |

[API-03](../api/if.md#api-03-post-records)

### INT-05 記録削除

| ID | 優先 | 操作 | 期待 |
|----|------|------|------|
| INT-05a | P1 | 自分の id を DELETE | 204。GET に出ない |
| INT-05b | P1 | 無い id | 204 |
| INT-05c | P1 | B のトークンで A の id を DELETE | A の件は残る |
| INT-05d | P2 | `photoKey` 付きを DELETE | 記録なし。S3 オブジェクトなし |

[API-04](../api/if.md#api-04-delete-recordsid)

### INT-06 写真

| ID | 優先 | 操作 | 期待 |
|----|------|------|------|
| INT-06a | P1 | POST `/photos/presign` `{ recordId }` | 200。`photoKey` は `{sub}/{recordId}.jpg`。`expiresIn` 900 |
| INT-06b | P1 | `uploadUrl` に JPEG PUT → GET `/photos/{id}/url` → GET viewUrl | S3 200。画像が取れる |
| INT-06c | P1 | recordId 欠落 | 400 `Invalid recordId` または `Missing body` |
| INT-06d | P2 | 未アップロードで viewUrl GET | URL は返す。S3 GET は 404 でよい |

[API-05](../api/if.md#api-05-post-photospresign) / [API-06](../api/if.md#api-06-get-photosrecordidurl)

### INT-07 天気場所潮位

| ID | 優先 | 操作 | 期待 |
|----|------|------|------|
| INT-07a | P1 | GET `/weather/current?lat=35.45&lng=139.65`（モック成功） | 200。`weather.temperature` 等 |
| INT-07b | P1 | lat なし | 400 `Invalid lat/lng` |
| INT-07c | P1 | 天気キーなし | 500 `Weather API is not configured` |
| INT-07d | P1 | GET `/place/current` モック成功 | 200 `{ placeName }` |
| INT-07e | P1 | GET `/tide/current` モック成功 | 200。`tide.levelCm` 等 |
| INT-07f | P2 | `at` 不正 | 400 `Invalid at` |
| INT-07g | P2 | 同じ座標を連続 GET | 2 回目はキャッシュ（外部 fetch 回数 1） |

[API-07〜09](../api/if.md#api-07-get-weathercurrent)

### INT-08 退会

| ID | 優先 | 操作 | 期待 |
|----|------|------|------|
| INT-08a | P1 | DELETE `/account`（Cognito モック） | 204。キューに `userId` |
| INT-08b | P1 | 続けて GET `/records` | 403 |
| INT-08c | P2 | Cognito ユーザー既に無し | 204（続行） |

[API-10](../api/if.md#api-10-delete-account)

### INT-09 物理削除バッチ

| | |
|--|--|
| 対象 | BATCH-01 |
| 優先 | P2 |
| 前提 | 退会キューに古い `deletedAt`。記録と S3 オブジェクトあり。保持日数を 0 にするか `deletedAt` を過去にする |
| 操作 | `purgeAccounts` 相当を実行 |
| 期待 | その userId の記録なし。S3 プレフィックスなし。キュー行なし |

[BATCH-01](../api/if.md#batch-01-アカウント物理削除)

### INT-10 不明パス

| | |
|--|--|
| 対象 | GET `/no-such-route` |
| 優先 | P2 |
| 期待 | 404 `{ "error": "Not found" }` |

---

## 4. 画面 E2E

モード列: 無 = クラウド無効、有 = クラウド有効。

### E2E-01 ランディング

| | |
|--|--|
| 画面 | SCR-01 |
| モード | 有・未ログイン |
| 優先 | P1 |
| 操作 | `/` を開く。「無料ではじめる」「ログイン」 |
| 期待 | ランディング。登録は `/login?mode=signup`。ログインは `/login`。モックは操作不可 |

### E2E-02 認証ゲート

| ID | モード | 優先 | 操作 | 期待 |
|----|--------|------|------|------|
| E2E-02a | 無 | P1 | `/history` `/mypage` | 各画面が開く（ログインへ飛ばない） |
| E2E-02b | 有・未ログイン | P1 | `/history` | `/login` |
| E2E-02c | 無 | P2 | `/mypage/email` | `/mypage` へ戻る |

[画面 IF 1.3](../screens/if.md#13-認証ゲート)

### E2E-03 記録保存

| ID | モード | 優先 | 操作 | 期待 |
|----|--------|------|------|------|
| E2E-03a | 無 | P1 | 入力なしで「記録する」 | 保存サマリー。履歴に 1 件 |
| E2E-03b | 無 | P1 | 魚種・体長を入れて保存 | サマリーに反映。続けて記録で魚種・サイズはクリア |
| E2E-03c | 無 | P1 | 体長に -1 | 「体長は 0 以上…」。未保存 |
| E2E-03d | 無 | P2 | geolocation 失敗 | それでも保存される |

[SCR-06](../screens/if.md#scr-06-記録)

### E2E-04 記録タックル

| ID | 優先 | 操作 | 期待 |
|----|------|------|------|
| E2E-04a | P2 | タックルを開きロッドだけ入力して記録。次回も使う ON | 保存後もタックルが残る |
| E2E-04b | P2 | 次回も使う OFF | 保存後タックルは空 |
| E2E-04c | P2 | マイタックルに保存 → 「マイタックルを使う」 | 「「{name}」を適用しました」 |

モード: 無。

### E2E-05 履歴

| ID | 優先 | 操作 | 期待 |
|----|------|------|------|
| E2E-05a | P1 | 記録ゼロで `/history` | 「まだ記録がありません」 |
| E2E-05b | P1 | 1 件保存 → カード → 詳細 | SCR-08。削除確認 → 削除 → 「削除しました」。空に戻る |
| E2E-05c | P1 | 詳細で編集して魚種変更 → 保存 | 閲覧に新魚種 |
| E2E-05d | P2 | 記録ありの状態で記録の無い期間 | 「この期間の記録はありません」 |

モード: 無。[SCR-07〜09](../screens/if.md#4-記録履歴)

### E2E-06 マイタックル

| ID | 優先 | 操作 | 期待 |
|----|------|------|------|
| E2E-06a | P2 | 空の `/mypage/tackle` | 「まだマイタックルがありません」 |
| E2E-06b | P2 | 追加保存 | 一覧に出る。空保存は「いずれかの項目を入力してください」 |
| E2E-06c | P2 | コピー → 削除確認 | 「{name}のコピー」。削除で消える |

モード: 無。[SCR-11](../screens/if.md#scr-11-マイタックル)

### E2E-07 魚種図鑑

| ID | 優先 | 操作 | 期待 |
|----|------|------|------|
| E2E-07a | P2 | 魚種なし記録だけ | 「魚種付きの記録がまだありません」 |
| E2E-07b | P2 | アジを保存 → 図鑑 | アジカード。詳細でその記録 |

モード: 無。[SCR-12](../screens/if.md#scr-12-マイ魚種図鑑)

### E2E-08 単位

| | |
|--|--|
| 画面 | SCR-10 |
| モード | 無 |
| 優先 | P2 |
| 操作 | 体長 25 で保存 → 単位を inch に |
| 期待 | 履歴の表示が inch。再保存値は cm のまま（再編集で 25 cm 相当） |

### E2E-09 クラウド同期

| | |
|--|--|
| 画面 | SCR-06 / SCR-07 |
| モード | 有・ログイン相当 |
| 優先 | P1 |
| 前提 | ローカル API + JWT |
| 操作 | 記録する → LocalStack の記録テーブル / GET `/records` |
| 期待 | クラウドに 1 件。リロード後も履歴にある |

### E2E-10 オフライン

| | |
|--|--|
| 画面 | SCR-06 |
| モード | 有 |
| 優先 | P1 |
| 操作 | `offline` にして記録する |
| 期待 | 端末に残る。エラーでもフォームは消えない（仕様: 失敗時はフォーム残） |

### E2E-11 シェル

| ID | 優先 | 操作 | 期待 |
|----|------|------|------|
| E2E-11a | P2 | ログイン相当で `/` | COM-01 バナーと COM-02。記録タブアクティブ |
| E2E-11b | P2 | `/guide` | バナー・ナビなし |

### E2E-12 静的ページ

| | |
|--|--|
| 画面 | SCR-17〜19 |
| 優先 | P2 |
| 操作 | `/guide` `/privacy` `/terms` |
| 期待 | 本文が出る。未ログイン（有）の戻るは `/`、ログインまたは無効なら `/mypage` |

---

## 5. 手動 MAN

開発用 User Pool。`.env.development.local` のキー。本番アカウント禁止。

### MAN-01 Cognito 認証

| ID | 画面 | 操作 | 期待 |
|----|------|------|------|
| MAN-01a | SCR-03 / 04 / 02 | 同意して登録 → メールのコード → ログイン | 記録 `/`。確認成功後は自動ログインしない |
| MAN-01b | SCR-03 | 未同意で登録 | 「利用規約とプライバシーポリシーへの同意が必要です」 |
| MAN-01c | SCR-05 | 再設定 → コード → 新パスワード | `/` に自動ログイン |
| MAN-01d | COM-01 | ログアウト | ランディング（クラウド有効時） |

### MAN-02 アカウント

| ID | 画面 | 操作 | 期待 |
|----|------|------|------|
| MAN-02a | SCR-14 | 別メールへ変更してコード確定 | 「メールアドレスを変更しました」 |
| MAN-02b | SCR-15 | パスワード変更 | 「パスワードを変更しました」 |
| MAN-02c | SCR-16 | 同意して退会 | `/login`。古いトークンは API 403。端末記録は消える |

### MAN-03 写真

カメラ実機または PC のファイル。

| 操作 | 期待 |
|------|------|
| アルバムから JPEG | プレビュー。記録後に履歴サムネ |
| 非画像 | 「画像ファイルを選択してください」 |

### MAN-04 環境データ

| 操作 | 期待 |
|------|------|
| キーありで記録 | 気温・場所名・潮位が入ることがある |
| キーなし / オフライン | それらが「—」でも保存できる |

### MAN-05 PWA

| 操作 | 期待 |
|------|------|
| インストール（対応ブラウザ） | ホーム画面から起動 |
| オフラインで再訪 | 記録画面が開く（SW キャッシュ） |

### MAN-06 初回移行

| 操作 | 期待 |
|------|------|
| クラウド無効相当、または未ログインで記録を付ける → ログイン | 端末の件がクラウドに載る。二重で増えない |

[sync `migrateLocalRecordsToServer`](../../src/lib/sync.ts)

---

## 6. 仕様との対応

### API

| API / バッチ | テスト |
|--------------|--------|
| API-01 | INT-01, INT-02c |
| 認証 401 / 403 | INT-02, UNIT-11 |
| API-02 | INT-03 |
| API-03 | INT-04, UNIT-12 |
| API-04 | INT-05 |
| API-05 / 06 | INT-06 |
| API-07〜09 | INT-07, MAN-04 |
| API-10 | INT-08, MAN-02c |
| BATCH-01 | INT-09 |
| 404 | INT-10 |

### 画面

| ID | テスト |
|----|--------|
| SCR-01 | E2E-01 |
| SCR-02〜05 | MAN-01 |
| SCR-06 | E2E-03, E2E-04, E2E-09, E2E-10 |
| SCR-07〜09 | E2E-05 |
| SCR-10 | E2E-08, E2E-02c |
| SCR-11 | E2E-06 |
| SCR-12〜13 | E2E-07, UNIT-05 |
| SCR-14〜16 | MAN-02 |
| SCR-17〜19 | E2E-12 |
| COM-01 / 02 | E2E-11, MAN-01d |
| COM-03 | MAN-03 |
