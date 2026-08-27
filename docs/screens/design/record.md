# 記録

[画面設計](README.md) / [画面概要](../overview.md) / [画面 IF SCR-06](../if.md#scr-06-記録)

任意入力のあと「記録する」。GPS がなくても保存できる（オフライン時は端末のみ）。

```mermaid
flowchart TD
  form["記録フォーム"] --> tap["記録する"]
  form -->|"タックル入力を開く"| tackle["タックルパネル"]
  tackle -->|"マイタックルを使う"| picker["保存済みセットから選択"]
  tackle -->|"マイタックルに保存"| saved["セット追加"]
  picker --> tackle

  tap --> progress["進捗: 座標 / 天気 / 潮位 / 保存"]
  progress -->|"成功"| summary["保存サマリー"]
  progress -->|"失敗"| err["エラー表示。フォームは残る"]

  summary -->|"続けて記録"| form
  summary -->|"履歴を見る"| history["履歴"]
```

フォームの主な項目:

- 写真（任意）
- 魚種（任意・候補入力）
- 体長・重さ（任意。単位はマイページ）
- タックル（任意。「次回もこのタックルを使う」で下書きを残す）

保存後、魚種・サイズ・写真はクリアする。タックルは「次回も使う」がオンなら残す。

```mermaid
sequenceDiagram
  actor U as 利用者
  participant Rec as 記録
  participant GPS as GPS
  participant API as API
  participant Store as IndexedDB / クラウド

  U->>Rec: 任意項目を入力
  opt タックル
    U->>Rec: タックル入力を開く
    alt マイタックルを使う
      Rec-->>U: 保存済みセット
      U->>Rec: セットを選択
    else マイタックルに保存
      U->>Rec: 保存
    end
  end
  U->>Rec: 記録する
  Rec->>GPS: 現在地
  alt 取得成功
    GPS-->>Rec: 座標
    Rec->>API: 天気・潮位・場所名（並列）
    API-->>Rec: 結果（失敗時は null）
  else 失敗
    GPS-->>Rec: エラー（座標なしで続行）
  end
  Rec->>Store: 保存
  Rec-->>U: 保存サマリー
  alt 続けて記録
    U->>Rec: 続けて記録
    Rec-->>U: フォーム（魚種・サイズ・写真はクリア）
  else 履歴を見る
    U->>Rec: 履歴を見る
    Rec-->>U: 履歴 /
  end
```
