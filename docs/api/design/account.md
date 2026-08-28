# 退会

[API 設計](README.md) / [API 概要](../overview.md) / [API IF API-10](../if.md#api-10-delete-account) / [BATCH-01](../if.md#batch-01-アカウント物理削除)

### DELETE `/account`

1. 退会キュー（`AccountDeletionsTable`）へ `userId` を書く
2. Cognito `AdminDeleteUser`（メールを Username として使う）
3. 204

残っているトークンでは以降 403。記録・写真・削除ログの物理削除は日次バッチ（既定 7 日後）。

```mermaid
sequenceDiagram
  actor App as アプリ
  participant API as API
  participant Q as 退会キュー
  participant Cog as Cognito
  participant Batch as 日次バッチ

  App->>API: DELETE /account
  API->>Q: Put userId / deletedAt
  API->>Cog: AdminDeleteUser
  API-->>App: 204
  Note over App: 端末データ消去・ログアウトはクライアント側
  Batch->>Q: 7 日超をスキャン
  Batch->>Batch: 記録・削除ログ・写真を物理削除
```
