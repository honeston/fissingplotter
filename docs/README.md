# ドキュメント

cast mark（スマホ向け釣り記録 PWA）の現行資料。概要から入り、設計・IF へ進む。

## 画面

| 資料 | 粒度 | 内容 |
|------|------|------|
| [画面概要](screens/overview.md) | 荒い | 領域・役割・全体の見取り図 |
| [画面設計](screens/design/README.md) | 中 | 画面一覧・認証ゲート・[公開・認証](screens/design/auth.md) / [記録](screens/design/record.md) / [履歴](screens/design/history.md) / [マイページ](screens/design/mypage.md) |
| [画面 IF](screens/if.md) | 細かい | 項目・操作・メッセージ・画面 ID |

## API

| 資料 | 粒度 | 内容 |
|------|------|------|
| [API 概要](api/overview.md) | 荒い | リソース・役割・全体の見取り図 |
| [API 設計](api/design/README.md) | 中 | 認証・パス・[記録](api/design/records.md) / [写真](api/design/photos.md) / [天気・潮位](api/design/weather.md) / [退会](api/design/account.md) |
| [API IF](api/if.md) | 細かい | 入出力・ステータス・データ型・エラー |

## テスト

ローカル（本番 AWS と分離）。記録 CRUD の API 結合は `npm run test:api`。UNIT / E2E は未導入。

| 資料 | 粒度 | 内容 |
|------|------|------|
| [テスト概要](tests/overview.md) | 荒い | 層・環境・全体の見取り図 |
| [テスト設計](tests/design/README.md) | 中 | 方針・環境・[単体](tests/design/unit.md) / [API](tests/design/api.md) / [画面](tests/design/screens.md) |
| [テスト IF](tests/if.md) | 細かい | ケース ID・前提・期待結果 |

仕様の穴・層の食い違いは [仕様の理論チェックリスト](spec-checklist.md)（実装は見ず、ドキュメントだけ突き合わせたもの。修正用）。

旧資料は [`_archive/`](_archive/README.md) に退避してある。インフラ・デプロイ手順などは順次こちらへ書き直す。
