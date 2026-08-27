# cast mark

スマホ向け釣り記録 PWA。ワンタップで気温・時刻・座標・潮位・魚種を保存する（端末 + クラウド同期）。

- リポジトリ: https://github.com/honeston/fissingplotter
- ドキュメント: [`docs/`](docs/README.md)（再編中。[画面 IF](docs/screens/if.md) / [画面設計](docs/screens/design.md) / [API IF](docs/api/if.md) / [API 設計](docs/api/design.md)）
- 旧資料: [`docs/_archive/2026-08-28/`](docs/_archive/2026-08-28/)

## 開発

```bash
npm install
cp .env.development.local.example .env.development.local
```

**ローカル（本番と分離）** — [`docs/_archive/2026-08-28/local-dev.md`](docs/_archive/2026-08-28/local-dev.md)

```bash
npm run dev:api   # ターミナル1: LocalStack + SAM local (Docker Lambda)
npm run dev       # ターミナル2: Vite
```

**本番** — GitHub Actions のみ。[`docs/_archive/2026-08-28/deploy-aws.md`](docs/_archive/2026-08-28/deploy-aws.md)

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

GitHub Actions（`main` push / `workflow_dispatch`）のみ。手順は [`docs/_archive/2026-08-28/deploy-aws.md`](docs/_archive/2026-08-28/deploy-aws.md)。

### Cloudflare（レガシー）

```bash
npx wrangler login
npm run deploy
```
