# AWS インフラ（SAM）

Fissing Plotter の AWS リソースを CloudFormation SAM で管理します。

## 含まれるリソース

| リソース | 用途 |
|---------|------|
| S3 + CloudFront | PWA 静的ホスティング |
| Route 53（任意） | カスタムドメイン |
| Cognito User Pool | ユーザー認証 |
| API Gateway HTTP API | REST API |
| Lambda | 記録 CRUD |
| DynamoDB | 記録保存（オンデマンド） |

## 前提

- AWS CLI 設定済み
- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
- Node.js 20+

## 初回デプロイ

```bash
cp infra/samconfig.toml.example infra/samconfig.toml
# 必要なら samconfig.toml を編集

cd infra
sam build
sam deploy --guided
```

デプロイ後、Outputs を `.env` に反映:

```bash
aws cloudformation describe-stacks --stack-name fissingplotter \
  --query 'Stacks[0].Outputs' --output table
```

`.env.example` をコピーして値を設定:

```bash
cp .env.example .env
```

## フロントエンドデプロイ

```bash
npm run build
node scripts/deploy-aws.mjs
```

または:

```bash
npm run deploy:aws
```

## カスタムドメイン（任意）

ACM 証明書は **us-east-1** で作成（CloudFront 用）。

`sam deploy` の parameter overrides:

```
DomainName=fissingplotter.example.com
HostedZoneId=Z1234567890ABC
AcmCertificateArn=arn:aws:acm:us-east-1:123456789012:certificate/abc-123
```

## GitHub Actions

`.github/workflows/deploy-aws.yml` が push to `main` で SAM + S3 デプロイを実行。

必要なリポジトリ Secret:

| Secret | 内容 |
|--------|------|
| `AWS_ROLE_ARN` | OIDC 連携した IAM ロール ARN |

詳細は [`docs/deploy-aws.md`](../docs/deploy-aws.md)。リソース一覧・不足チェックは [`docs/infra.md`](../docs/infra.md)。
