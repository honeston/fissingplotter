# 実装フェーズ

| Phase | 内容 | 状態 |
|-------|------|------|
| 1 | プロジェクト基盤（Vite / React / Tailwind / PWA）+ 最小シェル UI | **完了** |
| 2 | IndexedDB ストレージ層 + 仮保存 / 履歴 / エクスポート | **完了** |
| 3 | データ取得（Geolocation / Open-Meteo / tide736 + 港マスタ） | **完了** |
| 4 | 記録フロー本実装（並列取得 → 保存、取得状況 UI） | **完了** |
| 5 | デプロイ（Cloudflare Pages）+ 実機 PWA 確認 | 未着手 |

## Phase 4 成果物

| ファイル | 内容 |
|----------|------|
| `src/hooks/useRecord.ts` | GPS → 気温/潮位並列 → IndexedDB |
| `src/components/RecordProgress.tsx` | 項目別の取得状況表示 |
| `HomePage` | 本番記録 UI（テストパネル撤去） |
| `HistoryPage` | Maps リンク・港名表示 |

### 確認手順

```bash
npm run dev
```

1. 位置情報を許可できる環境で「記録する」
2. 取得状況が座標 → 気温/潮位 → 保存と進むこと
3. 履歴に気温・潮位・座標が入っていること

## Phase 5 予定

- Cloudflare Pages へデプロイ
- スマホで HTTPS + 位置情報 + PWA インストール確認
