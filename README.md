# Fissing Plotter

スマホ向け釣り記録 PWA。ワンタップで気温・時刻・座標・潮位・魚種を端末内に保存する。

- リポジトリ: https://github.com/honeston/fissingplotter
- 設計: [`docs/design.md`](docs/design.md)
- フェーズ: [`docs/phases.md`](docs/phases.md)
- デプロイ: [`docs/deploy.md`](docs/deploy.md)

## 開発

```bash
npm install
npm run dev
```

## 現状（Phase 1–5 準備完了）

- ワンタップ記録: GPS + 気温 + 潮位 → IndexedDB
- 履歴・削除・JSON エクスポート
- Cloudflare Pages 用設定済み。公開にはログインが必要

## ビルド / デプロイ

```bash
npm run build
npm run preview

# Cloudflare に公開（要ログイン）
npx wrangler login
npm run deploy
```
