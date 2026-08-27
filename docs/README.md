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

旧資料は [`_archive/`](_archive/README.md) に退避してある。インフラ・デプロイ手順などは順次こちらへ書き直す。
