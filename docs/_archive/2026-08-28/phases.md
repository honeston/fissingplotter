# 実装フェーズ

| Phase | 内容 | 状態 |
|-------|------|------|
| 1 | プロジェクト基盤（Vite / React / Tailwind / PWA）+ 最小シェル UI | **完了** |
| 2 | IndexedDB ストレージ層 + 仮保存 / 履歴 / エクスポート | **完了** |
| 3 | データ取得（Geolocation / OpenWeather / 海しる潮汐） | **完了** |
| 4 | 記録フロー本実装（並列取得 → 保存、取得状況 UI） | **完了** |
| 5 | デプロイ + 実機確認 | **完了** |
| 6 | AWS サーバー保存（Cognito + API + DynamoDB + S3/CloudFront） | **完了** |

## Phase 5 成果物

| 項目 | 内容 |
|------|------|
| GitHub | https://github.com/honeston/fissingplotter |
| [`docs/deploy-aws.md`](deploy-aws.md) | デプロイ手順・実機チェックリスト |

スマホで HTTPS を開き、位置情報・記録・ホーム画面追加を確認する。

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
