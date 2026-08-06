# 実装フェーズ

| Phase | 内容 | 状態 |
|-------|------|------|
| 1 | プロジェクト基盤（Vite / React / Tailwind / PWA）+ 最小シェル UI | **完了** |
| 2 | IndexedDB ストレージ層 + 仮保存 / 履歴 / エクスポート | **完了** |
| 3 | データ取得（Geolocation / Open-Meteo / tide736 + 港マスタ） | **完了** |
| 4 | 記録フロー本実装（並列取得 → 保存、取得状況 UI） | **完了** |
| 5 | デプロイ準備（設定 + GitHub）/ Cloudflare 本番公開 | **準備完了・公開は要ログイン** |

## Phase 5 成果物

| 項目 | 内容 |
|------|------|
| `public/_redirects` | SPA フォールバック（`/history` 対応） |
| `wrangler.toml` | Pages プロジェクト設定 |
| `npm run deploy` | build + `wrangler pages deploy` |
| [`docs/deploy.md`](deploy.md) | 手順・実機チェックリスト |
| GitHub | https://github.com/honeston/fissingplotter |

### あなたが行う最終ステップ（どちらか）

**A. CLI（手元のターミナル）**

```bash
npx wrangler login
npm run deploy
```

**B. Cloudflare Dashboard**

1. https://dash.cloudflare.com/ → Workers & Pages → Create
2. Connect to Git → `honeston/fissingplotter`
3. Build command: `npm run build` / Output: `dist`
4. Deploy

公開後の URL（例: `https://fissingplotter.pages.dev`）でスマホから位置情報・PWA を確認する。
