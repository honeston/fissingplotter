# AWS デプロイ手順

本番推奨構成: **S3 + CloudFront + Cognito + API Gateway + Lambda + DynamoDB**。

詳細なリソース一覧・不足チェックは [`docs/infra.md`](infra.md) を参照。

## 前提

- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) 設定済み
- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
- Node.js 20+
- リージョン: `ap-northeast-1`（変更する場合は `infra/samconfig.toml` と workflow を合わせる）

## 1. インフラ初回デプロイ

```bash
cp infra/samconfig.toml.example infra/samconfig.toml
# 必要なら samconfig.toml を編集

cd infra
sam build
sam deploy --guided
```

または:

```bash
npm run deploy:infra
```

### デプロイ後: Outputs を `.env` に反映

```bash
aws cloudformation describe-stacks --stack-name fissingplotter \
  --query 'Stacks[0].Outputs' --output table
```

```bash
cp .env.example .env
# VITE_API_URL, VITE_COGNITO_USER_POOL_ID, VITE_COGNITO_CLIENT_ID を設定
```

## 2. フロントエンドデプロイ

`.env` を設定したうえで:

```bash
npm run deploy:aws
```

内部処理: `npm run build` → S3 アップロード → CloudFront キャッシュ無効化（[`scripts/deploy-aws.mjs`](../scripts/deploy-aws.mjs)）。

## 3. 動作確認

```bash
# API ヘルス（認証不要）
curl "$(grep VITE_API_URL .env | cut -d= -f2)/health"
# → {"ok":true}
```

ブラウザ:

1. SAM Outputs の `WebsiteUrl` を HTTPS で開く
2. ユーザー登録 / ログイン
3. 記録 → 履歴に反映 → 別端末で同期確認

チェックリスト全文: [`docs/infra.md#不足チェックリスト`](infra.md#不足チェックリスト)

## カスタムドメイン（任意）

CloudFront 用 ACM 証明書は **us-east-1** で作成する。

`sam deploy` の parameter overrides 例:

```
DomainName=fissingplotter.example.com
HostedZoneId=Z1234567890ABC
AcmCertificateArn=arn:aws:acm:us-east-1:123456789012:certificate/abc-123
```

`samconfig.toml` の `parameter_overrides` に追記してもよい（[`infra/samconfig.toml.example`](../infra/samconfig.toml.example) 参照）。

## GitHub Actions

[`.github/workflows/deploy-aws.yml`](../.github/workflows/deploy-aws.yml) が SAM + フロントデプロイを実行。

- トリガー: **`workflow_dispatch` のみ**（`main` push はコメントアウト）
- 必要 Secret: `AWS_ROLE_ARN`

### 登録する Secret

GitHub リポジトリ → Settings → Secrets and variables → Actions:

| Name | Value |
|------|-------|
| `AWS_ROLE_ARN` | `arn:aws:iam::319640345981:role/github-actions-deploy-roll` |

### GitHub Actions OIDC（設定済み）

| 項目 | 値 |
|------|-----|
| AWS アカウント | `319640345981` |
| OIDC プロバイダ ARN | `arn:aws:iam::319640345981:oidc-provider/token.actions.githubusercontent.com` |
| 対象者 (aud) | `sts.amazonaws.com` |
| IAM ロール | `github-actions-deploy-roll` |
| ロール ARN | `arn:aws:iam::319640345981:role/github-actions-deploy-roll` |

#### ポリシー確認結果（2026-08-11）

| ポリシー | 状態 | メモ |
|---------|------|------|
| 信頼ポリシー | ✅ OK | `repo:honeston/fissingplotter:*` で限定 |
| 許可ポリシー全体 | ✅ OK | SAM + フロントデプロイに必要な権限を網羅 |
| `StaticSiteBucket` | ✅ OK | `fissingplotter-static-319640345981` |

#### 残タスク

1. ~~信頼ポリシー確認~~ ✅
2. ~~権限ポリシー確認~~ ✅
3. ~~GitHub Secret 登録~~ ✅
4. **workflow 実行** — Actions → Deploy AWS → Run workflow

## インフラ更新

`infra/template.yaml` または `api/` を変更したら:

```bash
cd infra && sam build && sam deploy
npm run deploy:aws
```

## トラブルシュート

| 症状 | 確認 |
|------|------|
| `Not authorized to perform sts:AssumeRoleWithWebIdentity` | 下記 [OIDC AssumeRole 失敗](#oidc-assumerole-失敗) を参照 |
| workflow で S3 PutObject 拒否 | 許可ポリシー `StaticSiteBucket` の ARN に `319640345981` が入っているか |
| ログインできない | `.env` の Cognito ID が Outputs と一致しているか |
| API 401 | トークン期限切れ → 再ログイン |
| 同期しない | `isCloudSyncEnabled()` — 3 つの `VITE_*` がビルド時に注入されているか |
| 古い UI が表示 | CloudFront 無効化完了を待つ（数分） |
| CORS エラー | API の `AllowOrigins` は現状 `*` |

不足検知: `npm run check:infra`

### OIDC AssumeRole 失敗

エラー例: `Could not assume role with OIDC: Not authorized to perform sts:AssumeRoleWithWebIdentity`

**重要:** `github-actions-deploy-rollPolicy` は**許可ポリシー**（Permissions）。AssumeRole 失敗は**信頼関係**（Trust relationships）タブの問題。

#### 手順 1: OIDC クレームを確認（AWS 不要）

1. workflow 変更を push
2. Actions → **Debug OIDC** → Run workflow
3. ログの `sub` と `aud` をメモ

#### 手順 2: 信頼ポリシーを試す（AWS は条件なしを拒否する）

AWS は GitHub OIDC で **`sub` または `job_workflow_ref` によるリポジトリ限定**が必須。条件なしポリシーは保存できない。

**試す順番:**

**A. `aud` 条件を外す（`sub` のみ）** — まずこれ  
[`infra/iam/github-actions-trust-policy-debug.json`](../infra/iam/github-actions-trust-policy-debug.json)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::319640345981:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:honeston/fissingplotter:*"
        }
      }
    }
  ]
}
```

Deploy AWS を再実行。失敗したら **B** へ。

**B. `job_workflow_ref` で限定**  
[`infra/iam/github-actions-trust-policy-workflow-ref.json`](../infra/iam/github-actions-trust-policy-workflow-ref.json)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::319640345981:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:job_workflow_ref": "honeston/fissingplotter/.github/workflows/deploy-aws.yml@refs/heads/*"
        }
      }
    }
  ]
}
```

| 結果 | 意味 |
|------|------|
| A 成功 | 以前の `aud` 条件が不一致だった |
| B 成功 | `sub` 形式が想定と異なる |
| 両方失敗 | OIDC プロバイダ / Secret / GitHub 設定 → 手順 3 へ |

#### 手順 3: OIDC プロバイダ確認

IAM → アイデンティティプロバイダ → `token.actions.githubusercontent.com`

| 項目 | 期待値 |
|------|--------|
| プロバイダ URL | `https://token.actions.githubusercontent.com` |
| 対象者 | `sts.amazonaws.com` |
| サムプリント | `6938fd4d98bab03faadb97b34396831e2780e1` と `1c58a3a8518e8759bf075b76b750d4f2df264fcd` の両方 |

サムプリントが 1 つだけの場合、もう 1 つを追加して再試行。

#### 本番信頼ポリシー（登録済み 2026-08-11）

`aud` 条件付きだと AssumeRole 失敗したため、**`sub` のみ**で運用:

[`infra/iam/github-actions-trust-policy.json`](../infra/iam/github-actions-trust-policy.json)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::319640345981:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:honeston/fissingplotter:*"
        }
      }
    }
  ]
}
```

> **メモ:** `aud: sts.amazonaws.com` 条件を付けると AssumeRole 失敗。GitHub トークンの `aud` が一致していなかった可能性。リポジトリ限定（`sub`）で十分。

#### よくあるミス

| ミス | 症状 |
|------|------|
| **許可**タブの `github-actions-deploy-rollPolicy` だけ更新 | AssumeRole 失敗のまま |
| 信頼関係 JSON に古い `}` が残る | ポリシー無効 or 意図しない内容 |
| Secret 末尾に改行 | AssumeRole 失敗 |
| GitHub repo Settings → Actions → Workflow permissions が Read-only | OIDC トークン取得失敗（別エラー） |

#### GitHub リポジトリ設定

Settings → Actions → General → **Workflow permissions**  
→ **Read and write permissions** を選択
