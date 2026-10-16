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

### ただし「容量」だけは共有です

**中身は分かれていますが、置ける量は分かれていません。**

iPhone / Safari は、1つのドメインに残せる量に上限があります（おおむね 5MB）。
`irelife.github.io` の下にある PIVOT2・PIVOT3・入居チェックは、**この上限を一緒に使います**。

いっぱいになると、保存のときにこう出ます。

```
Quota exceeded.（量が上限を超えました）
```

PIVOT2 を使いすぎた端末で、PIVOT3 が保存できなくなることがあります。
`js/store.js` の ㊻ に、何がどれだけ使っているかを見る仕組みと、
いっぱいのときに控えを片付ける処理が入っています。

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

## 検査（tests/）

```
node tests/run-all.cjs
```

17件あります。1件でも落ちると終了コード 1 になります（GitHub Actions はこれを見ます）。

検査は本物の Chromium と、にせのクラウドで動きます。playwright が要ります。

```
cd tests && npm i        # tests/ の下に入れる場合
npm i -g playwright      # 端末全体に入れる場合（run-all.cjs が自分で見つけます）
```

直したら、**必ず通してからコミットしてください。**

## 別管理オーナー（ソフィア等）の共用Drive

明細を共用Driveへ溜める機能は、専用の GAS を使います。
**この URL はリポジトリに書きません**（pivot2・pivot3 は公開リポジトリのため）。

使う端末ごとに、オーナーメール画面の「別管理」の上にある入力欄へ
GAS の URL を貼って保存してください。`localStorage` に残ります。

未設定でも、物件・契約・オーナーの動きには影響しません。
共用Driveへの蓄積だけが止まります。

## 注意事項

- 編集前に必ずリポジトリ名（`pivot3` か）を確認すること。pivot2 は稼働中の本番環境
- 1ファイル直すごとにコミットすること（編集が失われた事例あり）
- GAS を編集する際は、画面上部のプロジェクト名が ★PIVOT3 であることを確認すること
- GAS の URL・トークン・鍵の類は、**コードにもファイルにも書かないこと**（公開リポジトリです）
- GAS のデプロイは「デプロイを管理 → 鉛筆 → 新バージョン」。「新しいデプロイ」は押さないこと（URL が変わってアプリが止まります）
