# 実装フェーズ

| Phase | 内容 | 状態 |
|-------|------|------|
| 1 | プロジェクト基盤（Vite / React / Tailwind / PWA）+ 最小シェル UI | **完了** |
| 2 | IndexedDB ストレージ層 + 仮保存 / 履歴 / エクスポート | **完了** |
| 3 | データ取得（Geolocation / OpenWeather / 海しる潮汐） | **完了** |
| 4 | 記録フロー本実装（並列取得 → 保存、取得状況 UI） | **完了** |
| 5 | デプロイ（Cloudflare Pages）+ 実機確認 | **デプロイ完了** |
| 6 | AWS サーバー保存（Cognito + API + DynamoDB + S3/CloudFront） | **完了** |

## Phase 5 成果物

| 項目 | 内容 |
|------|------|
| `public/_redirects` | SPA フォールバック（`/history` 対応） |
| `wrangler.toml` | Pages プロジェクト設定 |
| `npm run deploy` | build + `wrangler pages deploy` |
| [`docs/deploy.md`](deploy.md) | 手順・実機チェックリスト |
| GitHub | https://github.com/honeston/fissingplotter |

### 公開 URL

- 今回のデプロイ: https://a1c5cbe6.fissingplotter.pages.dev
- 本番エイリアス: https://fissingplotter.pages.dev （反映されていればこちら）

スマホで HTTPS を開き、位置情報・記録・ホーム画面追加を確認する。詳細は [`docs/deploy.md`](deploy.md)。

## Phase 6 成果物（AWS）

| 項目 | 内容 |
|------|------|
| `infra/template.yaml` | SAM: S3/CloudFront/Cognito/API/Lambda/DynamoDB |
| `api/` | Lambda 記録 CRUD |
| `src/lib/sync.ts` | IndexedDB + クラウド同期 |
| `src/contexts/AuthContext.tsx` | Cognito 認証 |
| `src/pages/LoginPage.tsx` | ログイン / 登録 UI |
| `.github/workflows/deploy-aws.yml` | CI デプロイ |
| [`docs/deploy-aws.md`](deploy-aws.md) | AWS 手順 |
