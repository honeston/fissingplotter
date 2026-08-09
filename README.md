# Fissing Plotter

スマホ向け釣り記録 PWA。ワンタップで気温・時刻・座標・潮位・魚種を保存する（端末 + クラウド同期）。

- リポジトリ: https://github.com/honeston/fissingplotter
- 設計: [`docs/design.md`](docs/design.md)
- フェーズ: [`docs/phases.md`](docs/phases.md)
- AWS デプロイ: [`docs/deploy-aws.md`](docs/deploy-aws.md)
- Cloudflare デプロイ: [`docs/deploy.md`](docs/deploy.md)

## 開発

```bash
npm install
npm run dev
```

`.env` 未設定時は IndexedDB のみ（ログイン不要）。AWS 連携時は `.env.example` を参照。

## 機能

- ワンタップ記録: GPS + 気温 + 潮位 → IndexedDB（+ オンライン時クラウド）
- Cognito ログイン / 端末間同期
- 履歴・削除・JSON エクスポート
- PWA（オフライン対応）

## ビルド / デプロイ

```bash
npm run build
npm run preview
```

### AWS（本番）

```bash
cd infra && sam build && sam deploy --guided
cp .env.example .env   # Outputs を設定
npm run deploy:aws
```

### Cloudflare（レガシー）

```bash
npx wrangler login
npm run deploy
```
