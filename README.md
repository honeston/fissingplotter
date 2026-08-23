# Fissing Plotter

スマホ向け釣り記録 PWA。ワンタップで気温・時刻・座標・潮位・魚種を保存する（端末 + クラウド同期）。

- リポジトリ: https://github.com/honeston/fissingplotter
- 設計: [`docs/design.md`](docs/design.md)
- **インフラ資料**: [`docs/infra.md`](docs/infra.md)（構成・チェックリスト）
- フェーズ: [`docs/phases.md`](docs/phases.md)
- AWS デプロイ: [`docs/deploy-aws.md`](docs/deploy-aws.md)
- Cloudflare デプロイ: [`docs/deploy.md`](docs/deploy.md)

## 開発

```bash
npm install
cp .env.development.local.example .env.development.local
```

**ローカル（本番と分離）** — [`docs/local-dev.md`](docs/local-dev.md)

```bash
npm run dev:api   # ターミナル1: LocalStack + SAM local (Docker Lambda)
npm run dev       # ターミナル2: Vite
```

**本番** — GitHub Actions のみ。[`docs/deploy-aws.md`](docs/deploy-aws.md)

## 機能

- ワンタップ記録: GPS + 気温 + 潮位 → IndexedDB（+ オンライン時クラウド）
- Cognito ログイン / 端末間同期
- 履歴・削除
- PWA（オフライン対応）

## ビルド / デプロイ

```bash
npm run build
npm run preview
```

### AWS（本番）

GitHub Actions（`main` push / `workflow_dispatch`）のみ。手順は [`docs/deploy-aws.md`](docs/deploy-aws.md)。

### Cloudflare（レガシー）

```bash
npx wrangler login
npm run deploy
```
