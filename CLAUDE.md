# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

A-boost は大学サークルの運営管理システム。サーバー不要の純粋な HTML/CSS/JS で動作し、Firebase Firestore でリアルタイムデータ共有、GitHub Pages で公開。

## ファイル構成

| ファイル | 役割 |
|---|---|
| `index.html` | 幹部用管理画面（全タブのHTML構造） |
| `app.js` | 全ロジック（Firebase接続・各タブの描画・CRUD） |
| `style.css` | 管理画面のスタイル（CSS変数で色管理） |
| `member-form.html` | 会員用メンバー登録フォーム（独立ページ） |
| `opinion-form.html` | 会員用意見・アイデアフォーム（独立ページ） |
| `event_cards.html` | イベントカード印刷用（PDFエクスポート用） |

## 公開URL

- 管理画面: `https://a-boost.github.io/A-boost/index.html`
- メンバー登録フォーム: `https://a-boost.github.io/A-boost/member-form.html`
- 意見フォーム: `https://a-boost.github.io/A-boost/opinion-form.html`

## アーキテクチャ

### データ管理（app.js）

Firebase Firestore の `app/data` ドキュメント1つに全データを格納。

```js
STATE = { members: [], events: [], transactions: [], opinions: [], todos: [], notice: '' }
```

`dataRef.onSnapshot()` でリアルタイム同期。変更は `DB.set(key, data)` で `{ merge: true }` でパッチ更新。

### タブ構成（現在5タブ）

1. **ホーム** (`dashboard`) — ToDo・統計・直近イベント・お知らせ
2. **メンバー** (`members`) — CRUD・検索・CSVエクスポート
3. **スケジュール** (`schedule`) — カレンダー表示・イベントCRUD
4. **会計** (`accounting`) — 収支CRUD・残高計算・CSVエクスポート
5. **意見・アイデア** (`documents`) — 投稿・イベント紐付け・削除

### タブの追加方法

1. `index.html` の `<nav>` に `<button class="nav-btn" data-page="xxx">` を追加
2. `index.html` の `<main>` に `<section id="page-xxx" class="page">` を追加
3. `app.js` に描画関数・CRUD関数を追加
4. 必要ならモーダルを `index.html` に追加し、`openModal()`/`closeModal()` で制御

### モーダルの仕組み

`openModal(id)` / `closeModal(id)` でフォームモーダルを開閉。`closeModal` 内でフォームリセットも行う。イベントモーダルは `populateCoordinatorSelect()` でメンバー一覧を動的に注入。

## 関連フォルダ（管理システム外）

- `~/bingo/` — ビンゴ抽選ページ（`index.html`, `index2.html`）。A-boostとは独立して存在。タブへの組み込みは未実施。
- `~/circle_money/` — 会計関連スクリプト（`setup.gs`）
- `~/minigame_round1/` — ミニゲーム関連カード生成スクリプト

## 現在の作業状況（2026-04-22）

- ビンゴ機能（`~/bingo/`）を管理画面のタブとして追加する作業を検討中
- イベントモーダルの `e-coordinator`（イベント係）フィールドがHTMLに欠落していたバグを修正済み
- 学年選択は「1年」「2年」のみ（`if-grade`, `m-grade`）

## Firebase

- プロジェクト: `a-boost`
- 利用: Firestore のみ（Storage・Auth は未使用）
- `package.json` の `puppeteer` はPDF生成スクリプト用（`build_html.js`, `generate_pdf.js`）であり、管理システム本体とは無関係
