# 仕様の理論チェックリスト

実装は見ず、現行ドキュメント（画面 / API / テスト）だけを突き合わせた結果。概要 → 設計 → IF の層で矛盾・未定義がないかを見る。

使い方: 方針を決めてから、関係する資料を直す。IF を正にする（[テスト設計 方針](tests/design/README.md#方針)）。概要・設計は IF に合わせる。

対象: [画面](screens/overview.md) / [API](api/overview.md) / [テスト](tests/overview.md)（2026-08-28 時点）

---

## 先に決めること

ここが決まらないと、下の項目を直せない。

### S-01 同期モデル

- [x] **正の所在**: 端末（IndexedDB）が正。クラウドは同期先。`GET` に無いことは削除理由にしない
- [x] **他端末への取り込み**: ログイン直後、履歴を開いたとき、オンライン復帰時に `GET /records`（`?since=` は前回同期時刻）
- [x] **削除の伝播**: クラウドの削除ログ（`GET` の `deleted`）。他端末の削除は同期中だけ、この ID だけを根拠に消す
- [x] **衝突**: 削除が編集に勝つ（削除ログの id を POST すると 409）。編集同士は未送信の端末を GET で上書きしない。両方未送信なら後勝ち POST
- [x] [画面概要](screens/overview.md) / [API 概要](api/overview.md) / [画面 IF 1.5](screens/if.md#15-同期) / [API 設計 記録](api/design/records.md) / [API IF API-02〜04](api/if.md#api-02-get-records)
- [x] テスト: [UNIT-13](tests/if.md#unit-13-同期マージ) / [INT-03e](tests/if.md#int-03-記録一覧) / [INT-04g](tests/if.md#int-04-記録作成更新) / [E2E-09](tests/if.md#e2e-09-クラウド同期)

決めたこと: ユーザー削除はいつでも可。未送信の削除 ID は端末の削除ログに残す。削除ログはアカウント存続中残し、退会バッチで消す。

### S-02 未ログイン記録の有無

- [x] **クラウド有効時、未ログインで記録できるか**: できない（ゲスト記録なし）。`/` はランディング専用
- [x] 「初回移行」は捨て、未送信はログイン済みオフライン（および同期失敗）に限定
- [x] [画面概要 公開・認証](screens/overview.md#公開認証) / [認証ゲート](screens/design/README.md#認証ゲート) / [公開・認証](screens/design/auth.md) / [画面 IF 1.3](screens/if.md#13-認証ゲート) / [1.5](screens/if.md#15-同期) / [SCR-02](screens/if.md#scr-02--scr-03--scr-04-ログイン登録確認)
- [x] テスト: [E2E-01](tests/if.md#e2e-01-ランディング) / [MAN-06](tests/if.md#man-06-オフライン後の同期)
- [ ] ログアウト後も IndexedDB は残るか（退会だけ端末消去）を明示する。残すなら未送信の粒度（端末かアカウントか）を書き、別アカウントへの取り違えを防ぐ

決めたこと: クラウド有効かつ未ログインでは記録できない。未送信の POST はログイン済みでオフライン中に付けた件（と同期失敗）。新規登録直後の端末に送る件は無い。

### S-03 編集時の環境データ

- [ ] 方針を IF にそろえる: **天気は記録時のスナップショット（再取得しない）**。潮位・場所名・日出没は座標 / 時刻変更で取り直す
- [ ] [画面概要 履歴](screens/overview.md#履歴)「天気・潮位などを取り直す」を直す
- [ ] [履歴設計](screens/design/history.md) の同文言を直す
- [ ] [SCR-09](screens/if.md#scr-09-記録編集) と [API IF API-07](api/if.md#api-07-get-weathercurrent)「編集時は呼ばない」は維持（天気 API に `at` が無いので、取り直しても過去時刻の天気にならない）

---

## 層の食い違い

概要・設計と IF が違う。IF を正にして上の層を合わせる。

### C-01 写真の順序と `photoKey`

- [ ] 推奨手順を一択にする: `presign → S3 PUT → POST /records（photoKey 付き）` か、画面進捗どおり「保存のあと写真」か
- [ ] 後者にするなら: 二回目の POST で `photoKey` を付けるか、削除時にキー規約 `{userId}/{recordId}.jpg` でも S3 を消すかを [API 設計 写真](api/design/photos.md) / [API-04](api/if.md#api-04-delete-recordsid) に書く
- [ ] [画面 IF SCR-06 記録する](screens/if.md#記録する) の進捗順（save のあと photo）を、決めた手順に合わせる
- [ ] [API 概要 写真](api/overview.md#写真) の「推奨手順」を同じ一文にする

現状の穴: 先に POST して `photoKey` 無しのまま S3 に置くと、削除は `photoKey` があるときだけ S3 を消すのでオブジェクトが残る。

### C-02 オフライン保存の成功条件

- [ ] ローカル保存成功 = 成功（サマリーへ）。クラウド失敗は警告だけ、でよいか
- [ ] [画面 IF SCR-06](screens/if.md#記録する) の進捗 `save` を「IndexedDB」と「クラウド POST」に分ける（一段にしない）
- [ ] 「失敗時はフォームが残る」の失敗を、ローカル保存失敗に限定する
- [ ] [画面概要 記録](screens/overview.md#記録) / [記録設計](screens/design/record.md)
- [ ] [E2E-10](tests/if.md#e2e-10-オフライン): 「端末に残る」かつ「フォームは消えない」だと、再タップで別 `id` の二重記録になり得る。期待を成功条件に合わせる

### C-03 「現行コードに基づく」の宣言

- [ ] [画面設計](screens/design/README.md) / [画面 IF](screens/if.md) / [API 設計](api/design/README.md) / [API IF](api/if.md) 冒頭の「現行コードに基づく」をやめる（テスト方針「仕様書が正」と逆）
- [x] [テスト IF MAN-06](tests/if.md#man-06-オフライン後の同期) の実装パス参照をやめる。仕様の言葉で書く（S-01 で実施）

---

## モデルの穴（矛盾というより未定義）

### G-01 ローカルのみのナビ

- [ ] クラウド無効を第一級（記録・履歴・タックルが普通に使える）にするか、開発用の縮退にするか
- [ ] 第一級なら: ボトムナビをログイン無しでも出す、または記録 / 履歴 / マイページの定常導線を [共通シェル](screens/design/README.md#共通シェル) / [COM-02](screens/if.md#com-02-ボトムナビ) に書く
- [ ] 縮退なら: [画面概要](screens/overview.md) で「Cognito 未設定時は記録がホーム。ナビはログイン後のみ」と明示し、[テスト概要](tests/overview.md)「端末だけでも履歴・タックルが使える」との温度差を揃える
- [ ] [画面概要 公開・認証](screens/overview.md#公開認証)「要ログインなら `/login`」に、ローカルのみの例外を書く（[認証ゲート](screens/design/README.md#認証ゲート) には既にある）

### G-02 日出没

- [ ] 新規記録で `dawnAt` 等をいつ埋めるか（クライアント計算、座標と日付）を [SCR-06](screens/if.md#scr-06-記録) に書く。進捗にステップを足すか、「位置のあと端末で計算」と注記する
- [ ] HTTP API に出さないことを [API 概要](api/overview.md) / [画面 IF 8](screens/if.md#8-画面と-api--外部-if) に書く（[単体設計](tests/design/unit.md) の `sun.ts` と揃える）
- [ ] 編集の「日出没を取り直す」([SCR-09](screens/if.md#scr-09-記録編集)) と同じ計算である旨を一文でつなぐ

### G-03 端末間同期の範囲

- [ ] 同期されるのは記録と写真だけ、と概要に書く
- [ ] マイタックルは IndexedDB のみ、単位は `localStorage`、図鑑は記録の集計（記録が同期されればついてくる）
- [ ] [画面概要 マイページ](screens/overview.md#マイページ) / [API 概要](api/overview.md) / [SCR-11](screens/if.md#scr-11-マイタックル)（IF には既にある）

### G-04 退会の保持期間と遷移

- [ ] 画面「7 日**以内**」と API「7 日**後** / 7 日**超**」を一語にする（いつ消えたと言えるか）
- [ ] [SCR-16](screens/if.md#scr-16-退会) / [API 概要 退会](api/overview.md#退会) / [退会設計](api/design/account.md) / [BATCH-01](api/if.md#batch-01-アカウント物理削除) / [マイページ設計](screens/design/mypage.md)
- [ ] 退会後の遷移: `/login`（直後はログインできない）か、ログアウトと同じランディングか。揃える

### G-05 潮種・月相の区分表

- [ ] 月齢 → 潮種（大潮〜若潮）と月相（新月〜晦）の区分を [API IF](api/if.md) か [天気設計](api/design/weather.md) に表で書く
- [ ] [UNIT-02](tests/if.md#unit-02-潮種) / [UNIT-03](tests/if.md#unit-03-月相) の「仕様どおり」が指せるようにする

### G-06 同一地点の定義

- [ ] 地図ピンの「同じ地点」の距離（または丸め）を [履歴設計](screens/design/history.md) / [SCR-07](screens/if.md#scr-07-履歴) に書く
- [ ] [UNIT-10](tests/if.md#unit-10-地点グループ) の期待と一致させる

---

## 小さい不整合

- [ ] **パスワード方針**: 登録・再設定は「8 文字・英小文字と数字」。[SCR-15](screens/if.md#scr-15-パスワード変更) は「8 文字以上」だけ。Cognito が一つなら IF を揃える
- [ ] **履歴のパス**: [記録設計](screens/design/record.md) シーケンスの `履歴 /` を `/history` にする
- [ ] **天気 API と画面の対応**: 新規のみ [API-07](api/if.md#api-07-get-weathercurrent)、編集は place / tide。概要の表（[API 概要](api/overview.md#天気場所名潮位)）に「編集では天気を呼ばない」を足す

---

## 直さなくてよい（層は揃っている）

確認用。壊れていないので、直すときに崩さない。

- [x] `/` の二重役割（ランディング / 記録）と、クラウド有無での出し分け
- [x] 天気・場所・潮位は JWT 必須。欠測は null。記録は止めない。クラウド有効時だけ呼ぶ
- [x] 写真キー `{userId}/{recordId}.jpg`、1 記録 1 枚
- [x] 図鑑は手入力ではなく記録の集計。魚種なしは対象外
- [x] 単位は表示だけ。保存は cm / g
- [x] 退会は即 403。物理削除はバッチ。端末消去はクライアント
- [x] 登録は手動ログイン、再設定は自動ログイン（非対称だが本文で明示）
- [x] テストが「画面 IF / API IF が正」と置いていること

---

## 修正の順番（案）

1. S-02 残り（ログアウト後の IndexedDB）/ S-03 を決める
2. C-01 / C-02（写真順・オフライン成功）を IF に落とす
3. 概要・設計を IF に追従（C-03、履歴の天気文言、認証ゲートの例外）
4. G-01〜G-06 を埋める
5. 小さい不整合
6. テスト IF を仕様に合わせて直す（E2E-10、UNIT-02/03/10）
