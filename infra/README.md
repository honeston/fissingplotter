# AWS インフラ（SAM）

Fissing Plotter の AWS リソースを CloudFormation SAM で管理します。

## 含まれるリソース

| リソース | 用途 |
|---------|------|
| S3 + CloudFront | PWA 静的ホスティング |
| Route 53（任意） | カスタムドメイン |
| Cognito User Pool | ユーザー認証 |
| API Gateway HTTP API | REST API |
| Lambda | 記録 CRUD・天気プロキシ |
| DynamoDB | 記録保存・天気キャッシュ（オンデマンド） |

## デプロイ

本番デプロイは **GitHub Actions のみ**（`.github/workflows/deploy-aws.yml`）。

- トリガー: `main` push / `workflow_dispatch`
- Secret: `AWS_ROLE_ARN`、`OPENWEATHER_API_KEY`（天気）

詳細は [`docs/deploy-aws.md`](../docs/deploy-aws.md)。リソース一覧・不足チェックは [`docs/infra.md`](../docs/infra.md)。

## OpenWeatherMap（天気）

Repository Secret `OPENWEATHER_API_KEY` → SAM パラメータ `OpenWeatherApiKey` → Lambda 環境変数。

未設定の場合 `/weather/current` は 500 を返します。15 分・約 1km グリッドで DynamoDB にキャッシュします。

## カスタムドメイン（任意）

ACM 証明書は **us-east-1** で作成（CloudFront 用）。workflow / スタックパラメータ:

```
DomainName=fissingplotter.example.com
HostedZoneId=Z1234567890ABC
AcmCertificateArn=arn:aws:acm:us-east-1:123456789012:certificate/abc-123
```
