# ローカル開発

本番 AWS とは別に、**Docker 上の Lambda（SAM local）+ LocalStack（DynamoDB / S3）** で API を動かす。

## 前提

- Docker / Docker Compose
- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
- Node.js 20+

## 初回セットアップ

```bash
cp .env.development.local.example .env.development.local
# VITE_COGNITO_* と OPENWEATHER_API_KEY を記入

cp infra/env.local.json.example infra/env.local.json
# OPENWEATHER_API_KEY は dev:api 実行時に .env.development.local から自動反映も可
```

## 起動（2 ターミナル）

**ターミナル 1 — ローカル API**

```bash
npm run dev:api
```

- `docker compose up` → LocalStack 起動
- `scripts/local-init.mjs` → テーブル / バケット作成
- `sam local start-api` → Lambda を **Docker コンテナ**で実行
- API: http://127.0.0.1:3000

**ターミナル 2 — フロント**

```bash
npm run dev
```

`.env.development.local` の `VITE_API_URL=http://127.0.0.1:3000` により、本番 API には接続しません。

## 構成

```
npm run dev          → Vite (localhost:5173)
npm run dev:api      → SAM local (Lambda in Docker) :3000
                       └─ LocalStack :4566 (DynamoDB + S3)
```

| 項目 | ローカル | 本番 |
|------|---------|------|
| Lambda | Docker（SAM local） | AWS Lambda |
| DynamoDB | LocalStack | AWS DynamoDB |
| S3（写真） | LocalStack | AWS S3 |
| デプロイ | なし | GitHub Actions |
| OpenWeather キー | `.env.development.local` | GitHub Secret |

## 認証

`sam local` では API Gateway の Cognito オーソライザを使わず、Lambda が Authorization ヘッダーの JWT から `sub` を読み取ります（`LOCAL_DEV=true`）。

Cognito User Pool は `.env.development.local` の `VITE_COGNITO_*` を使用。**完全分離**する場合は開発専用 User Pool を別途作成してください（データは LocalStack に保存されるため、Pool だけ本番共有でも記録データは混ざりません）。

## 停止

```bash
# dev:api を Ctrl+C で停止後
npm run dev:stack:down
```

## トラブルシュート

| 症状 | 対処 |
|------|------|
| `LocalStack not ready` | `docker compose ps` で起動確認。数十秒待って `npm run local:init` |
| `Cannot connect to Docker` | Docker デーモン起動 |
| 401 / Missing user id | ログインするか `infra/env.local.json` の `LOCAL_DEV_USER_ID` を設定 |
| 写真 URL が開けない | `AWS_ENDPOINT_URL_PUBLIC=http://127.0.0.1:4566` が env.local.json にあるか |
