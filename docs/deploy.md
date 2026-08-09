# デプロイ手順（Cloudflare Pages）

## 前提

- 位置情報 API は **HTTPS** 必須（本番 URL で使う）
- ビルド成果物は `dist/`（静的サイト）

## 方法 A: Wrangler（CLI・推奨）

1. [Cloudflare](https://dash.cloudflare.com/) アカウントを用意
2. ログイン（ブラウザが開く）

```bash
npx wrangler login
```

3. デプロイ

```bash
npm run deploy
```

成功例（本番）:

- プレビュー: https://a1c5cbe6.fissingplotter.pages.dev
- 本番（安定）: https://fissingplotter.pages.dev （DNS 反映後）

## 方法 B: GitHub 連携

1. このリポジトリを GitHub に push
2. Cloudflare Dashboard → Workers & Pages → Create → Connect to Git
3. ビルド設定:

| 項目 | 値 |
|------|-----|
| Framework preset | Vite |
| Build command | `npm run build` |
| Build output directory | `dist` |

4. Save and Deploy

## SPA ルーティング

`public/_redirects` により `/history` なども `index.html` にフォールバックする。

## 実機確認チェックリスト

- [ ] HTTPS の URL で開く
- [ ] 位置情報を許可できる
- [ ] 「記録する」で気温・潮位・座標が保存される
- [ ] 履歴・削除・JSON エクスポート
- [ ] ブラウザメニューから「ホーム画面に追加」（PWA）
