# AWS インフラ（SAM）

Fissing Plotter の AWS リソースを CloudFormation SAM で管理します。

## 含まれるリソース

| リソース | 用途 |
|---------|------|
| S3 + CloudFront | PWA 静的ホスティング |
| Route 53（任意） | カスタムドメイン |
| Cognito User Pool | ユーザー認証 |
| API Gateway HTTP API | REST API |
| Lambda | 記録 CRUD・天気 / 場所名 / 潮位プロキシ |
| DynamoDB | 記録保存・天気・場所名・潮位キャッシュ（オンデマンド） |

## デプロイ

本番デプロイは **GitHub Actions のみ**（`.github/workflows/deploy-aws.yml`）。

- トリガー: `main` push / `workflow_dispatch`
- Secret: `AWS_ROLE_ARN`、`OPENWEATHER_API_KEY`（天気）、`MSIL_SUBSCRIPTION_KEY`（潮位）

詳細は [`docs/deploy-aws.md`](../docs/deploy-aws.md)。リソース一覧・不足チェックは [`docs/infra.md`](../docs/infra.md)。

## OpenWeatherMap（天気）

Repository Secret `OPENWEATHER_API_KEY` → SAM パラメータ `OpenWeatherApiKey` → Lambda 環境変数。

未設定の場合 `/weather/current` は 500 を返します。15 分・約 1km グリッドで DynamoDB にキャッシュします。

## 海しる（潮位）

Repository Secret `MSIL_SUBSCRIPTION_KEY` → SAM パラメータ `MsilSubscriptionKey` → Lambda 環境変数。

- API: 潮汐推算 v3（`/tide/current`）
- 推算点マスタ: `api/src/tideStations.json`（更新: `npm run build:tide-stations`）
- 未設定の場合 `/tide/current` は 500
- 試用キーは予告なく変更されうるため、本番は個別キー申請を推奨（https://portal.msil.go.jp/howtouse）

## Nominatim（場所名）

`GET /place/current` が公式 Nominatim をプロキシする。User-Agent にアプリ名を付け、約 11m グリッドで 30 分キャッシュする。ブラウザ直叩きはしない。

## カスタムドメイン（任意）

ACM 証明書は **us-east-1** で作成（CloudFront 用）。workflow / スタックパラメータ:

```
DomainName=fissingplotter.example.com
HostedZoneId=Z1234567890ABC
AcmCertificateArn=arn:aws:acm:us-east-1:123456789012:certificate/abc-123
```
