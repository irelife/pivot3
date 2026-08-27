# PIVOT3 — 岡山エリア

PIVOT のエリア別インスタンス。岡山エリアの物件・契約・オーナーメールを管理します。

- 公開URL: https://irelife.github.io/pivot3/
- GAS: ★PIVOT3（スプレッドシート連動）
- 画像フォルダ: PIVOT3_画像_OKAYAMA

## インスタンス構成

| リポジトリ | エリア | サイドバー色 |
|---|---|---|
| pivot2 | 広島（福山） | 白 |
| pivot3 | 岡山 | 臙脂 #8C1235 |
| pivot4 | 倉敷 | 未構築 |

データ（localStorage・GAS・スプレッドシート・画像フォルダ）は各インスタンスで完全に分離しています。

## localStorage キーの仕組み

`js/core.js` の `insPrefix()` が URL パスからプレフィックスを自動生成します。
`/pivot3/` なら `pivot3_`、`/pivot4/` なら `pivot4_`。
**リポジトリをコピーするだけでデータが分離される**ため、キー名の書き換えは不要です。

## 新しいインスタンスの作り方

1. GitHub の Import repository でこのリポジトリを複製
2. Settings → Pages で公開（main / root）
3. スプレッドシートをコピーし、データ行とバックアップシートを削除
4. 拡張機能 → Apps Script でプロジェクト名と `DRIVE_FOLDER_NAME` を変更
5. デプロイして URL を取得
6. 公開ページの設定画面で GAS URL を入力（未設定だと警告が出ます）
7. サイドバーの色と表示名を変更（`css/tune.css` 271行目、`js/sidebar.js` 29行目、`index.html` 6・74・429行目）

## ファイル構成

```
index.html
css/  base / mobile-fix / refine / sidebar / tune
js/   core / buildings / contracts / ownermail / ownerimport / sidebar / firebase-config
```

CSS や JS を変更したら、`index.html` の `?v=` を必ず上げてください。上げないとブラウザキャッシュで反映されません。

## 注意事項

- 編集前に必ずリポジトリ名（`pivot3` か）を確認すること。pivot2 は稼働中の本番環境
- 1ファイル直すごとにコミットすること（編集が失われた事例あり）
- GAS を編集する際は、画面上部のプロジェクト名が ★PIVOT3 であることを確認すること
