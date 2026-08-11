# インフラ資料

Fissing Plotter のインフラ構成・運用・不足項目の一覧。更新時は `npm run check:infra` でコードベースとの整合を確認する。

## 目次

- [アーキテクチャ](#アーキテクチャ)
- [環境一覧](#環境一覧)
- [AWS リソース一覧](#aws-リソース一覧)
- [設定・シークレット](#設定シークレット)
- [デプロイ経路](#デプロイ経路)
- [外部依存](#外部依存)
- [不足チェックリスト](#不足チェックリスト)
- [関連ドキュメント](#関連ドキュメント)

---

## アーキテクチャ

### AWS（本番推奨）

```
[ブラウザ PWA]
    │ HTTPS
    ▼
[CloudFront] ──OAC──▶ [S3 静的ホスティング]
    │
    │ Cognito JWT (Authorization)
    ▼
[API Gateway HTTP API] ──▶ [Lambda] ──▶ [DynamoDB]
    │
[Cognito User Pool]（SRP / パスワード認証）
```

- IaC: [`infra/template.yaml`](../infra/template.yaml)（SAM / CloudFormation）
- API 実装: [`api/`](../api/)
- フロント同期: [`src/lib/sync.ts`](../src/lib/sync.ts)

### Cloudflare Pages（レガシー）

Phase 5 時点のホスティング。IndexedDB のみ（クラウド同期なし）。

- 設定: [`wrangler.toml`](../wrangler.toml)
- 手順: [`docs/deploy.md`](deploy.md)

---

## 環境一覧

| 環境 | ホスティング | 認証・同期 | 用途 |
|------|-------------|-----------|------|
| ローカル dev | `npm run dev` | なし（IndexedDB のみ） | 開発 |
| AWS 本番 | S3 + CloudFront | Cognito + DynamoDB | 本番推奨 |
| Cloudflare | Pages | なし | レガシー公開 URL |

| 項目 | 値 |
|------|-----|
| AWS アカウント ID | `319640345981` |
| AWS リージョン | `ap-northeast-1` |
| CloudFormation スタック名 | `fissingplotter` |
| 本番 Website URL | _（SAM Outputs `WebsiteUrl` — 未デプロイ）_ |
| 本番 API URL | _（SAM Outputs `ApiUrl` — 未デプロイ）_ |
| カスタムドメイン | 未設定 |
| Cloudflare 本番 URL | https://fissingplotter.pages.dev |

---

## AWS リソース一覧

| リソース | CloudFormation 論理 ID | 命名 / 備考 |
|---------|----------------------|------------|
| S3 バケット | `StaticBucket` | `{AppName}-static-{AccountId}` |
| CloudFront 配信 | `CloudFrontDistribution` | OAC で S3 限定公開、SPA 403/404→index.html |
| Route 53 レコード | `DnsRecord` | カスタムドメイン時のみ |
| Cognito User Pool | `UserPool` | メールログイン |
| Cognito App Client | `UserPoolClient` | シークレットなし Web クライアント |
| DynamoDB テーブル | `RecordsTable` | `{AppName}-records`、PAY_PER_REQUEST |
| HTTP API | `HttpApi` | stage: `prod`、Cognito JWT 認可 |
| Lambda | `ApiFunction` | Node.js 20、esbuild ビルド |

### API エンドポイント

| メソッド | パス | 認証 | 用途 |
|---------|------|------|------|
| GET | `/health` | なし | ヘルスチェック |
| GET | `/records` | JWT | 一覧（`?since=` 差分） |
| POST | `/records` | JWT | 作成 / 更新 |
| DELETE | `/records/{id}` | JWT | 削除 |

### SAM Outputs → フロント `.env` 対応

| OutputKey | 環境変数 |
|-----------|---------|
| `ApiUrl` | `VITE_API_URL` |
| `UserPoolId` | `VITE_COGNITO_USER_POOL_ID` |
| `UserPoolClientId` | `VITE_COGNITO_CLIENT_ID` |
| _(固定)_ | `VITE_AWS_REGION` |
| `StaticBucketName` | _(deploy スクリプトが参照、`.env` 不要)_ |
| `CloudFrontDistributionId` | _(deploy スクリプトが参照、`.env` 不要)_ |

---

## 設定・シークレット

### ローカル（`.env`）

[`/.env.example`](../.env.example) をコピー。未設定時は IndexedDB のみモード。

### Git 管理外

| ファイル / 場所 | 内容 |
|----------------|------|
| `.env` | Vite ビルド時注入 |
| `infra/samconfig.toml` | SAM デプロイ設定（[`samconfig.toml.example`](../infra/samconfig.toml.example) からコピー） |

### GitHub Actions Secrets

| Secret | 値 | 設定済み |
|--------|-----|---------|
| `AWS_ROLE_ARN` | `arn:aws:iam::319640345981:role/github-actions-deploy-roll` | ✅ |

### IAM / OIDC（GitHub Actions 用）

| リソース | 名前 / ARN | 状態 |
|---------|-----------|------|
| OIDC プロバイダ | `token.actions.githubusercontent.com` | ✅ 作成済み |
| OIDC プロバイダ ARN | `arn:aws:iam::319640345981:oidc-provider/token.actions.githubusercontent.com` | |
| 対象者 (aud) | `sts.amazonaws.com` | |
| IAM ロール | `github-actions-deploy-roll` | ✅ 作成済み |
| ロール ARN | `arn:aws:iam::319640345981:role/github-actions-deploy-roll` | |
| インラインポリシー | `github-actions-deploy-rollPolicy` | ✅ 設定済み |
| 信頼ポリシー | [`infra/iam/github-actions-trust-policy.json`](../infra/iam/github-actions-trust-policy.json) | ⚠️ immutable sub 形式に要更新 |
| 権限ポリシー | [`infra/iam/github-actions-permissions-policy.json`](../infra/iam/github-actions-permissions-policy.json) | ✅ リポジトリに記録 |
| ロール最終使用 | 未使用（2026-08-11 時点） | workflow 未実行 |

手動デプロイ用 IAM ユーザー `ken`（`AdministratorAccess`）は開発・初回デプロイ用。CI とは別経路。

OIDC 設定手順: [`docs/deploy-aws.md`](deploy-aws.md#github-actions-oidc)

---

## デプロイ経路

| 経路 | コマンド / トリガー | 対象 |
|------|-------------------|------|
| 手動（インフラ） | `npm run deploy:infra` | SAM スタック |
| 手動（フロント） | `npm run deploy:aws` | build → S3 → CloudFront 無効化 |
| GitHub Actions | `.github/workflows/deploy-aws.yml` | `workflow_dispatch`（push は未启用） |
| Cloudflare | `npm run deploy` | Pages（レガシー） |

詳細: [`docs/deploy-aws.md`](deploy-aws.md)、[`docs/deploy.md`](deploy.md)

---

## 外部依存

| サービス | 用途 | インフラ管理 |
|---------|------|-------------|
| Open-Meteo | 気温 | なし（クライアント直接） |
| tide736 | 潮位 | なし（クライアント直接） |
| GitHub | ソース・CI | リポジトリ |
| Cloudflare | レガシー CDN | アカウント手動 |

---

## 不足チェックリスト

`npm run check:infra` が **自動** 列を検証する。**手動** 列は運用で記入・確認する。

### ドキュメント・コード整合

| 項目 | 自動 | 手動 | 状態 |
|------|:----:|:----:|------|
| `docs/deploy-aws.md` が存在 | ✓ | | |
| `docs/infra.md` が存在 | ✓ | | |
| README からインフラ資料へリンク | ✓ | | |
| `.env.example` が SAM Outputs と対応 | ✓ | | |
| `infra/template.yaml` が存在 | ✓ | | |
| GitHub workflow が存在 | ✓ | | |

### ローカル開発環境

| 項目 | 自動 | 手動 | 状態 |
|------|:----:|:----:|------|
| `.env` が存在 | ✓ | | |
| `.env` にプレースホルダー以外の値 | ✓ | | |
| `infra/samconfig.toml` が存在 | ✓ | | |
| AWS CLI 認証済み | | ✓ | |
| SAM CLI インストール済み | | ✓ | |

### AWS 本番（デプロイ後）

| 項目 | 自動 | 手動 | 状態 |
|------|:----:|:----:|------|
| CloudFormation スタック `fissingplotter` が存在 | ✓ | | |
| スタック Outputs と `.env` が一致 | ✓ | | |
| `/health` が 200 | ✓ | | |
| Website URL が HTTPS で開ける | | ✓ | |
| Cognito ユーザー登録・ログイン | | ✓ | |
| 記録のクラウド同期 | | ✓ | |

### CI/CD

| 項目 | 自動 | 手動 | 状態 |
|------|:----:|:----:|------|
| GitHub OIDC プロバイダ | | ✓ | ✅ 作成済み |
| IAM ロール `github-actions-deploy-roll` | | ✓ | ✅ 作成済み |
| 信頼ポリシーがリポジトリ限定 | | ✓ | ⚠️ immutable sub（`@OWNER_ID`/`@REPO_ID`）対応要 |
| インラインポリシーに SAM 権限 | | ✓ | ✅ 確認済み |
| S3 バケット ARN がアカウント ID 一致 | | ✓ | ✅ `319640345981` |
| `AWS_ROLE_ARN` Secret 設定 | | ✓ | ✅ 設定済み（2026-08-11） |
| workflow 手動実行成功 | | ✓ | ☐ 再実行待ち（信頼ポリシー修正後） |
| `main` push 自動デプロイ | ✓ | | _（現状 workflow_dispatch のみ）_ |

### 未実装・検討事項

| 項目 | 優先度 | メモ |
|------|--------|------|
| カスタムドメイン + ACM + Route 53 | 低 | パラメータ未設定時は CloudFront デフォルト URL |
| ステージング環境（dev スタック） | 低 | 単一スタックのみ |
| DynamoDB バックアップ / PITR | 中 | template に未設定 |
| CloudWatch アラーム | 中 | 未設定 |
| WAF | 低 | 未設定 |
| API CORS `AllowOrigins: '*'` 制限 | 中 | 本番ドメインに絞る余地 |
| Cloudflare 本番から AWS への移行完了 | 中 | 両方ドキュメント化済み |

---

## 関連ドキュメント

| 資料 | 内容 |
|------|------|
| [`docs/design.md`](design.md) | アプリ設計 |
| [`docs/deploy-aws.md`](deploy-aws.md) | AWS デプロイ手順 |
| [`docs/deploy.md`](deploy.md) | Cloudflare デプロイ |
| [`docs/phases.md`](phases.md) | 実装フェーズ |
| [`infra/README.md`](../infra/README.md) | SAM クイックリファレンス |
