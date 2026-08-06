# Fissing Plotter

スマホ向け釣り記録 PWA。ワンタップで気温・時刻・座標・潮位・魚種を端末内に保存する。

設計・進捗は [`docs/design.md`](docs/design.md) / [`docs/phases.md`](docs/phases.md) を参照。

## 開発

```bash
npm install
npm run dev
```

## 現状（Phase 1–4）

- ワンタップ記録: GPS + 気温 + 潮位 → IndexedDB
- 履歴・削除・JSON エクスポート
- 次は **Phase 5**（Cloudflare Pages デプロイ）

## ビルド

```bash
npm run build
npm run preview
```
