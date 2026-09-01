# 履歴

[画面設計](README.md) / [画面概要](../overview.md) / [画面 IF SCR-07〜09](../if.md#4-記録履歴)

```mermaid
flowchart TD
  hist["履歴"] --> cal["カレンダーで期間指定"]
  hist --> map["地図ピン"]
  hist --> list["日ごとのカード一覧"]
  hist -->|"マイ魚種図鑑"| encyclo["図鑑一覧"]

  cal --> list
  cal --> map
  map --> sheet["記録詳細シート"]
  list --> sheet

  sheet -->|"左右スワイプ / 前後"| next["別の記録"]
  sheet -->|"下スワイプ / 閉じる"| hist
  sheet -->|"写真タップ"| zoom["拡大表示"]
  zoom -->|"閉じる / 背景タップ"| sheet
  sheet -->|"編集"| edit["編集フォーム"]
  sheet -->|"削除"| confirm["削除確認"]
  edit -->|"保存"| sheet
  edit -->|"キャンセル"| sheet
  confirm -->|"削除する"| hist
  confirm -->|"キャンセル"| sheet
```

- 期間はクエリ `?from=` `?to=`（または旧 `?date=`）でも初期化できる。
- 地図ピンは同じ地点の記録グループを開き、シート内でスワイプできる。
- 一覧タップはフィルタ後の全件をシートの前後対象にする。
- 空状態: 記録ゼロ / 期間内ゼロ。
- 詳細シートは写真・環境値の下に、記録日の潮位グラフを出す（クラウドかつ座標あり。記録時刻の印、当日ならいま、満潮・干潮。失敗時は出さない）。
- 削除は端末からすぐ消す。他端末の削除は同期時だけ、削除ログを見て消す（[画面 IF 1.5](../if.md#15-同期)）。

編集フォームでは写真・魚種・サイズ・タックル・日時・地図上の座標を変えられる。座標や時刻を変えると天気・潮位などを取り直す。

```mermaid
sequenceDiagram
  actor U as 利用者
  participant Hist as 履歴
  participant Sheet as 記録詳細シート
  participant Edit as 編集フォーム
  participant Store as IndexedDB / クラウド

  U->>Hist: カレンダー / 地図 / 一覧
  alt 地図ピン
    Hist-->>Sheet: 同地点の記録グループ
  else カードタップ
    Hist-->>Sheet: フィルタ後の全件を前後対象
  end
  alt 左右スワイプ
    U->>Sheet: 前後の記録
    Sheet-->>U: 別の記録
  else 編集
    U->>Sheet: 編集
    Sheet-->>Edit: フォーム
    opt 座標・時刻を変更
      Edit->>Edit: 天気・潮位などを取り直す
    end
    alt 保存
      U->>Edit: 保存
      Edit->>Store: 更新
      Edit-->>Sheet: 閲覧に戻る
    else キャンセル
      U->>Edit: キャンセル
      Edit-->>Sheet: 閲覧に戻る
    end
  else 削除
    U->>Sheet: 削除
    Sheet-->>U: 削除確認
    U->>Sheet: 削除する
    Sheet->>Store: 端末から削除（オンラインなら API DELETE。失敗時は端末の削除ログ）
    Sheet-->>Hist: 一覧を更新
  else 閉じる
    U->>Sheet: 下スワイプ / 閉じる
    Sheet-->>Hist: 履歴
  end
```
