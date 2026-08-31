# マイページ

[画面設計](README.md) / [画面概要](../overview.md) / [画面 IF SCR-10](../if.md#scr-10-マイページ)

```mermaid
flowchart TD
  my["マイページ"] --> tackle["マイタックル"]
  my --> encyclo["マイ魚種図鑑"]
  my --> units["単位設定（体長・重さ）"]
  my --> email["メールアドレスを変更"]
  my --> pass["パスワードを変更"]
  my --> del["退会する"]
  my --> legal["使い方 / プライバシー / 利用規約"]
```

単位は表示と入力だけ変わり、保存済みの数値は変わらない。アカウント欄はクラウド有効時のみ。ローカルのみのときは「この端末に記録を保存しています」と出す。

```mermaid
sequenceDiagram
  actor U as 利用者
  participant My as マイページ

  U->>My: /mypage
  alt マイデータ
    U->>My: マイタックル / マイ魚種図鑑
  else 単位設定
    U->>My: 体長・重さの単位を切替
  else アカウント（クラウド有効時）
    U->>My: メール変更 / パスワード変更 / 退会
  else 使い方・規約
    U->>My: 使い方 / プライバシー / 利用規約
  end
```

---

## マイタックル

[画面 IF SCR-11](../if.md#scr-11-マイタックル)

同一ページ内で一覧とフォームを切り替える（別ルートではない）。

```mermaid
flowchart TD
  list["タックル一覧"] -->|"新しいタックルを追加"| create["追加フォーム"]
  list -->|"編集"| edit["編集フォーム"]
  list -->|"コピー"| copy["コピーして追加"]
  list -->|"削除"| confirm["confirm ダイアログ"]
  confirm -->|"OK"| list
  create -->|"保存 / キャンセル"| list
  edit -->|"保存 / キャンセル"| list
  copy -->|"保存 / キャンセル"| list
```

記録画面の「マイタックルに保存」でも同じセットに追加できる。

```mermaid
sequenceDiagram
  actor U as 利用者
  participant List as タックル一覧
  participant Form as フォーム

  U->>List: 開く
  alt 追加
    U->>List: 新しいタックルを追加
    List-->>Form: 空のフォーム
  else 編集
    U->>List: 編集
    List-->>Form: 既存内容
  else コピー
    U->>List: コピー
    List-->>Form: 「〜のコピー」
  end
  alt 保存
    U->>Form: 保存
    Form-->>List: 一覧を更新
  else キャンセル
    U->>Form: キャンセル
    Form-->>List: 一覧
  end
  opt 削除
    U->>List: 削除
    List-->>U: confirm
    U->>List: OK
    List-->>U: 一覧を更新
  end
```

---

## マイ魚種図鑑

[画面 IF SCR-12](../if.md#scr-12-マイ魚種図鑑)

記録から魚種ごとの尾数・最大サイズなどを集計する。一覧カードにはその魚種の代表画像（写真付き記録のうち最大サイズ）を出す。手入力の図鑑ではない。

```mermaid
flowchart TD
  list["図鑑一覧"] -->|"ソート: 数 / 魚種 / 最大サイズ / 最大重量"| list
  list -->|"魚種カード"| detail["魚種詳細"]
  detail --> stats["集計（匹数・最大など）"]
  detail --> days["日付ごとの記録"]
  stats -->|"最大サイズ / 最大重量"| scrollRec["該当カードへスクロール"]
  stats -->|"最大釣果日"| scrollDay["その日のセクションへ"]
  days --> sheet["記録詳細シート"]
  sheet -->|"編集 / 削除 / スワイプ"| sheet
```

魚種詳細は `/mypage/encyclopedia/:species`。`?record=` と `?date=` で該当カードや日を強調する。

```mermaid
sequenceDiagram
  actor U as 利用者
  participant Enc as 図鑑一覧
  participant Sp as 魚種詳細
  participant Sheet as 記録詳細シート

  U->>Enc: 開く
  U->>Enc: ソート（数 / 魚種 / 最大サイズ / 最大重量）
  U->>Enc: 魚種カード
  Enc-->>Sp: /mypage/encyclopedia/:species
  alt 最大サイズ / 最大重量
    U->>Sp: タップ
    Sp-->>Sp: ?record= で該当カードへスクロール
  else 最大釣果日
    U->>Sp: タップ
    Sp-->>Sp: ?date= でその日へスクロール
  end
  U->>Sp: 記録カード
  Sp-->>Sheet: 詳細
  U->>Sheet: 編集 / 削除 / スワイプ
```

---

## アカウント変更・退会

[画面 IF SCR-14〜16](../if.md#scr-14-メールアドレス変更)

```mermaid
flowchart TD
  subgraph emailFlow ["メール変更"]
    e1["新しいメール"] --> e2["確認コード"]
    e2 -->|"成功"| e3["変更完了（同画面）"]
  end

  subgraph passFlow ["パスワード変更"]
    p1["現在 + 新しいパスワード"] -->|"成功"| p2["変更完了（同画面）"]
  end

  subgraph delFlow ["退会"]
    d1["注意書き + 同意チェック"] -->|"退会する"| d2["クラウド削除キュー / 端末データ消去 / ログアウト"]
    d2 --> d3["/login"]
  end
```

退会後はすぐログインできなくなる。クラウド上の記録・写真は 7 日以内に削除する旨を画面に出す。

```mermaid
sequenceDiagram
  actor U as 利用者
  participant My as マイページ
  participant Page as 対象画面
  participant Auth as Cognito
  participant API as API
  participant Login as ログイン

  alt メール変更
    U->>My: メールアドレスを変更
    My-->>Page: /mypage/email
    U->>Page: 新しいメール
    Page->>Auth: 確認コード送信
    U->>Page: 確認コード
    Page->>Auth: 検証
    Page-->>U: 変更完了（同画面）
  else パスワード変更
    U->>My: パスワードを変更
    My-->>Page: /mypage/password
    U->>Page: 現在 + 新しいパスワード
    Page->>Auth: changePassword
    Page-->>U: 変更完了（同画面）
  else 退会
    U->>My: 退会する
    My-->>Page: /mypage/delete-account
    U->>Page: 同意チェック + 退会する
    Page->>API: DELETE /account
    Page->>Page: 端末データ消去
    Page->>Auth: ログアウト
    Page-->>Login: /login
  end
```
