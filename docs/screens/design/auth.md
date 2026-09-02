# 公開・認証

[画面設計](README.md) / [画面概要](../overview.md) / [画面 IF 公開・認証](../if.md#3-公開認証)

ランディング、新規登録、ログイン、パスワード再設定、ログアウト、使い方・規約の戻り先。

---

## 初回: ランディング → 登録 → 記録

```mermaid
flowchart TD
  open["/ を開く"] --> land["ランディング"]
  land -->|"無料ではじめる"| signup["新規登録"]
  land -->|"ログイン"| login["ログイン"]
  land -->|"使い方を見る"| guide["使い方"]

  signup --> agree{"規約・プライバシーに同意"}
  agree -->|"未チェック"| stay["登録できない"]
  agree -->|"チェック"| send["確認コードをメール送信"]
  send --> confirm["確認コード入力"]
  confirm --> login2["ログイン画面"]
  login2 -->|"メール + パスワード"| home["記録 /"]
```

```mermaid
sequenceDiagram
  actor U as 利用者
  participant L as ランディング
  participant Login as ログイン
  participant Auth as Cognito
  participant Rec as 記録

  U->>L: / を開く
  U->>L: 無料ではじめる
  L-->>U: 新規登録 /login?mode=signup
  opt 規約・プライバシー
    U->>Login: 別タブで開く
  end
  U->>Login: 同意チェック + 登録する
  Login->>Auth: signUp
  Auth-->>Login: 確認コード送信
  Login-->>U: 確認コード入力
  U->>Login: 確認する
  Login->>Auth: confirmSignUp
  Auth-->>Login: 完了
  Login-->>U: ログイン画面（手動ログイン）
  U->>Login: メール + パスワード
  Login->>Auth: signIn
  Auth-->>Login: セッション
  Login-->>Rec: /
  Rec-->>U: 記録（同期あり）
```

- クラウド有効時、ランディングでは記録できない。登録・ログイン後に記録する。
- 新規登録は `/login?mode=signup`。規約・プライバシーは別タブで開く。
- 確認コード成功後はログイン画面に戻り、手動ログインする（自動ログインではない）。
- ログイン後は [画面 IF 1.5](../if.md#15-同期)。未送信件（ログイン済みオフライン中に付けたもの）があれば POST し、クラウドの生存件と削除ログも取り込む。未ログインで記録は付かない。

---

## 復帰: ログイン / パスワード再設定

```mermaid
flowchart TD
  land["ランディング"] -->|"ログイン"| login["ログイン"]
  login -->|"パスワードを忘れた"| fp1["メール入力"]
  fp1 -->|"確認コード送信"| fp2["コード + 新パスワード"]
  fp2 -->|"再設定成功"| auto["自動ログイン → 記録 /"]
  fp2 -->|"コード再送信"| fp2
  fp2 -->|"メール入力に戻る"| fp1
  login -->|"ログイン成功"| home["記録 /"]
```

パスワード再設定は成功すると新パスワードで自動ログインし、`/` へ進む。

```mermaid
sequenceDiagram
  actor U as 利用者
  participant L as ランディング
  participant Login as ログイン
  participant FP as パスワード再設定
  participant Auth as Cognito
  participant Rec as 記録

  U->>L: ログイン
  L-->>U: /login
  alt ログイン
    U->>Login: メール + パスワード
    Login->>Auth: signIn
    Auth-->>Login: セッション
    Login-->>Rec: /
  else パスワードを忘れた
    U->>Login: パスワードを忘れた
    Login-->>FP: /forgot-password
    U->>FP: メール送信
    FP->>Auth: ForgotPassword
    Auth-->>FP: 確認コード送信
    U->>FP: コード + 新パスワード
    FP->>Auth: ConfirmForgotPassword
    Auth-->>FP: 完了
    FP->>Auth: signIn（自動）
    Auth-->>FP: セッション
    FP-->>Rec: /
  end
```

---

## ログアウト

同期バナーの「ログアウト」（クラウド有効時）。成功すると未ログインになり、`/` はランディングになる。ログイン・公開ページ・ローカルのみではバナー自体を出さない。

```mermaid
sequenceDiagram
  actor U as 利用者
  participant Banner as 同期バナー
  participant App as アプリ
  participant L as ランディング

  Note over Banner: ログイン中の非公開画面のみ表示
  U->>Banner: ログアウト
  Banner->>App: signOut
  App-->>L: /
  L-->>U: ランディング
```

---

## 公開ページの戻り先

`/guide` `/privacy` `/terms` の「戻る」は、ログイン済みまたはローカルのみなら `/mypage`、未ログイン（クラウド有効）なら `/`。
