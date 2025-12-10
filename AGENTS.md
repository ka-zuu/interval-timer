# AGENTS.md

AIエージェントはこのプロジェクトで作業する際、以下のガイドラインに従ってください。

## 1. プロジェクト概要

*   **名前**: Interval Timer
*   **目的**: 筋トレ、HIIT、ポモドーロテクニックなどで使用できるインターバルタイマーのWebアプリケーション。
*   **技術スタック**:
    *   **フロントエンド**: HTML5, CSS3 (Vanilla), JavaScript (Vanilla, ES6+)
    *   **テスト**: Vitest (Unit Test), Playwright (E2E Test)
    *   **PWA**: `manifest.json`, `service-worker.js` を使用。

## 2. 開発ガイドライン

### コミュニケーション
*   ユーザーとのやり取りは **日本語** で行ってください。
*   コミットメッセージ、プルリクエストのタイトル・説明は **日本語** で記述してください。

### コード規約
*   **JS/CSS/HTML**: フレームワークを使用せず、Vanilla JS/CSSで実装してください。
*   **外部依存**: 開発ツール（テストなど）以外のプロダクションコードには、原則として外部ライブラリを使用しないでください。
*   **ドキュメント**: コードの変更に合わせて、`README.md` や `SPEC.md` を更新してください。

### テスト
コードを変更した際は、必ずテストを実行し、リグレッションがないことを確認してください。

*   **単体テスト (Unit Tests)**
    *   ツール: Vitest
    *   実行コマンド: `npm test` または `npx vitest run`
    *   設定ファイル: `vitest.config.js`
    *   テストファイル: `tests/` ディレクトリ配下（例: `tests/timer.test.js`）

*   **E2Eテスト (End-to-End Tests)**
    *   ツール: Playwright
    *   実行コマンド: `npx playwright test`

### ビルドと実行
*   ビルド手順はありません（静的ファイル）。
*   開発中は `index.html` をブラウザで開くか、簡易的なHTTPサーバー（例: `python3 -m http.server` や VS CodeのLive Serverなど）を使用してください。

## 3. ファイル構成

*   `index.html`: アプリケーションのエントリーポイント
*   `script.js`: メインのJavaScriptロジック
*   `style.css`: スタイルシート
*   `SPEC.md`: 詳細な仕様書
*   `tests/`: テストコードディレクトリ

## 4. その他

*   **PWA**: Service Worker (`service-worker.js`) とマニフェスト (`manifest.json`) を含んでいます。これらのファイルを変更する場合は、PWAとしての動作（オフライン機能など）に影響がないか注意してください。
