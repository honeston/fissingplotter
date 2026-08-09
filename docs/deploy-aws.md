# AWS デプロイ手順

Cloudflare Pages から AWS（S3 + CloudFront + Cognito + API + DynamoDB）へ移行する手順。

## アーキテクチャ

```
PWA (CloudFront/S3)
  → Cognito ログイン
  → API Gateway → Lambda → DynamoDB
  → IndexedDB（オフラインキャッシュ）
```

## 1. インフラデプロイ

```bash
cd infra
sam build
sam deploy --guided
```

スタック名の例: `fissingplotter`

## 2. 環境変数

CloudFormation Outputs から `.env` を作成:

| 変数 | Output キー |
|------|------------|
| `VITE_API_URL` | ApiUrl |
| `VITE_COGNITO_USER_POOL_ID` | UserPoolId |
| `VITE_COGNITO_CLIENT_ID` | UserPoolClientId |
| `VITE_AWS_REGION` | `ap-northeast-1` |

```bash
cp .env.example .env
# 値を編集
```

未設定の場合は **ローカル専用モード**（IndexedDB のみ、ログイン不要）で動作します。

## 3. フロントエンドビルド & デプロイ

```bash
npm run build
npm run deploy:aws
```

公開 URL は Output の `WebsiteUrl`（CloudFront またはカスタムドメイン）。

## 4. 初回利用

1. HTTPS の URL で PWA を開く
2. 新規登録 → メール確認コード入力 → ログイン
3. 既存の IndexedDB 記録は **初回ログイン時に自動アップロード**
4. 履歴画面を開くとサーバーから差分同期

## 5. GitHub Actions（CI）

`main` ブランチへの push で自動デプロイ。

### OIDC 設定（概要）

1. IAM IdP: GitHub OIDC を追加
2. IAM ロール: CloudFormation / S3 / CloudFront / Lambda 権限
3. GitHub リポジトリ Secret: `AWS_ROLE_ARN`

## 6. 実機確認チェックリスト

- [ ] HTTPS で開ける
- [ ] ログイン / 新規登録 / 確認コード
- [ ] 記録 → 履歴に表示（端末 + クラウド）
- [ ] 別端末ログインで同期される
- [ ] オフライン記録 → オンライン復帰後に履歴同期
- [ ] JSON エクスポート
- [ ] ホーム画面追加（PWA）

## コスト目安

個人利用: **$0〜2/月**（無料枠内ならほぼ $0）

詳細は設計書 [`docs/design.md`](design.md) の AWS セクション参照。

## ローカル開発

```bash
# クラウド同期なし（.env なし）
npm run dev

# クラウド同期あり（.env 設定済み）
npm run dev
```

API のローカルテスト:

```bash
cd infra && sam local start-api
```
