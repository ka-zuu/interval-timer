# カスタムタイマーウェブアプリ 仕様書 (SPEC.md)

## 1. 概要
HIIT (High Intensity Interval Training) やポモドーロテクニックなどのインターバル・トレーニングに特化した、シンプルで機能的なウェブベースのタイマーアプリケーション。

## 2. 技術スタック
*   **フロントエンド**: HTML5, CSS3, Vanilla JavaScript (ES6+)
*   **永続化**: Web Storage API (`localStorage`)
*   **ライブラリ**: なし (外部依存なし)

## 3. 機能要件

### 3.1 タイマー機能
*   **時間管理**: `requestAnimationFrame` と `performance.now()` を使用したドリフト（時間のズレ）のない正確なカウントダウン。
*   **状態管理**:
    *   **Stopped**: 初期状態またはリセット後。
    *   **Running**: タイマー進行中。
    *   **Paused**: 一時停止中。
*   **実行フロー**:
    1.  プリセットの設定に基づき、ステップ（Work/Rest）のスケジュールを構築。
    2.  各ステップを順次実行。
    3.  指定回数 (`repetitions`) のセット繰り返し。
    4.  全セット終了後、設定されていればロングブレイク (`break_duration`) を実行。
    5.  完了時に停止。
*   **操作**:
    *   **Start/Resume**: タイマーの開始または再開。
    *   **Pause**: タイマーの一時停止。
    *   **Reset**: タイマーを初期状態に戻し、進行状況をリセット。
*   **音声通知**:
    *   ステップ（Work/Restなど）が切り替わるタイミングで通知音を再生。
    *   タイマー完了時に完了音を再生。

### 3.2 設定管理機能 (プリセット)
*   **保存**: 複数のタイマー設定を `localStorage` に保存。
*   **一覧表示**: 保存されたプリセットをリスト表示。各プリセットの合計時間を計算して表示。
*   **作成/編集**:
    *   プリセット名
    *   セット構成（Work/Rest等のタイプと時間）の追加・削除。
    *   繰り返し回数 (`repetitions`)
    *   完了後のロングブレイク時間 (`break_duration`)
*   **削除**: プリセットの削除。
*   **初期データ**: 初回起動時にデフォルトのプリセット（HIIT, Pomodoro）を自動生成。

## 4. データ構造 (localStorage)

*   **Key**: `TIMER_PRESETS`
*   **Value**: JSON Array of Preset Objects

### プリセットオブジェクト スキーマ
```json
{
  "id": "string (unique identifier)",
  "name": "string (display name)",
  "sets": [
    {
      "type": "string ('work' | 'rest')",
      "duration": "number (seconds)"
    }
  ],
  "repetitions": "number (integer >= 1)",
  "break_duration": "number (seconds, 0 for none)"
}
```

## 5. UI/UX 仕様

### 5.1 画面構成
SPA (Single Page Application) 風の画面遷移を採用。

1.  **設定画面 (Settings View)** - 初期画面
    *   ヘッダー: アプリタイトル、プリセット追加ボタン (+)。
    *   プリセットリスト: カード形式でプリセットを表示（名前、構成概要、編集/削除ボタン）。
    *   フッター: バージョン情報を表示。クリックで更新チェックを実行。
    *   編集モーダル: プリセットの詳細設定フォーム。

2.  **タイマー画面 (Timer View)**
    *   ヘッダー: 「戻る」ボタン、プリセット名。
    *   メインディスプレイ:
        *   **円形プログレスバー (SVG)**: 現在のステップまたはセットの残り時間に応じて減少。
        *   **ステップ名**: 現在の状態（Work, Rest, Long Break）。
        *   **残り時間**: MM:SS 形式。
        *   **進捗状況**: 現在のセット数/総セット数。
    *   コントロール:
        *   **Reset**: リセットボタン。
        *   **Start/Pause**: 再生/一時停止トグルボタン。

### 5.2 デザイン
*   **テーマ**: ダークモードベースのモダンなデザイン。
*   **カラーコーディング**:
    *   Work: Primary Color (e.g., Blue/Cyan)
    *   Rest: Secondary Color (e.g., Orange/Yellow)
    *   Long Break: Accent Color (e.g., Green)
*   **レスポンシブ**: モバイルファーストだがデスクトップでも崩れないレイアウト。

## 6. 内部設計 (クラス構成)

### 6.1 `StorageManager`
*   `localStorage` とのやり取りをカプセル化。
*   メソッド: `loadPresets`, `savePresets`, `addPreset`, `updatePreset`, `deletePreset`, `seedDefaults`。

### 6.2 `IntervalTimer`
*   純粋なタイマーロジックを担当（UI非依存）。
*   スケジュール（実行キュー）の構築と実行管理。
*   `tick` メソッドで時間を更新し、コールバック (`onTick`, `onComplete`, `onStepChange`) を通じて状態を通知。

### 6.3 `AudioController`
*   `Web Audio API` を利用した音声再生をカプセル化。
*   ユーザー操作があるまで `AudioContext` の初期化を遅延。
*   メソッド: `init`, `playStepChange`, `playComplete`。

### 6.4 `UIController`
*   DOM操作とイベントリスナーの管理。
*   `IntervalTimer` のインスタンスを持ち、UIとロジックを橋渡しする。
*   画面遷移 (`switchView`) の制御。
*   SVGプログレスバーの描画更新。
