# プロジェクト: 学習記録アプリ

## ステータス
**デザインモックアップのレビュー待ち**

## プロジェクト概要
エンジニア向けの学習時間を記録、可視化するためのWebアプリケーション。

- **目的:** エンジニアの勉強時間を記録・管理し、モチベーションを維持する。
- **ターゲットユーザー:** 開発エンジニア、インフラエンジニアなどのITエンジニア。
- **技術スタック:** HTML, CSS, JavaScript (ライブラリ使用も可)

## 主要ファイル置き場
- **このプロジェクトファイル:** `Works/Task/TodoList.md`
- **初期実装ファイル:** `Works/Task/`
- **デザインモックアップ:** `Works/Mockups/`

## 直近のタスクと経緯
ユーザーからのデザイン改修依頼に基づき、10人の異なる思想を持つペルソナデザイナーが、10種類のデザインモックアップを作成した。

**作成済みモックアップ一覧:**
1.  **Bootstrap Pro:** `Works/Mockups/01_Bootstrap_Pro/index.html`
2.  **Material Design:** `Works/Mockups/02_Material_Design/index.html`
3.  **Dark Mode:** `Works/Mockups/03_Dark_Mode/index.html`
4.  **Minimalist (Pico.css):** `Works/Mockups/04_Minimalist/index.html`
5.  **Tailwind CSS:** `Works/Mockups/05_Tailwind_CSS/index.html`
6.  **Playful:** `Works/Mockups/06_Playful/index.html`
7.  **Accessible:** `Works/Mockups/07_Accessible/index.html`
8.  **Brutalist:** `Works/Mockups/08_Brutalist/index.html`
9.  **Skeuomorphic:** `Works/Mockups/09_Skeuomorphic/index.html`
10. **Futuristic:** `Works/Mockups/10_Futuristic/index.html`

## 次のアクション
ユーザーが上記10個のモックアップを確認し、今後のデザインの方向性を決定する。

---

## (完了済み) 当初の要件定義リスト
- [x] Webサイトの目的とゴールを定義する
    - 目的: エンジニアの勉強時間を記録出来るアプリケーションを作成する
- [x] ターゲットユーザーを定義する
    - ターゲット: 開発エンジニア、インフラエンジニアなどのITエンジニア
- [x] 主要な機能やコンテンツを洗い出す
    - 主なメニュー:
        - 記録
            - 日付
            - 勉強時間
            - 休憩時間（複数回対応）
        - カレンダー
            - 月ごとのスライド移動
            - 月間合計勉強時間の表示
            - 週末の平均勉強時間表示
            - 平日の平均勉強時間表示
            - 日付選択で記録画面へ遷移
        - 設定
            - バックアップ機能 (JSON形式を想定)
- [x] サイトマップ（ページ構成）を作成する
    - ホーム画面 (カレンダー)
        - → 記録画面
        - → 設定画面
    - 記録画面
    - 設定画面
- [x] ワイヤーフレームを作成する
    - **ホーム画面 (カレンダー)**
        - ヘッダー: 「学習カレンダー」タイトル、設定アイコン
        - メイン:
            - 月表示とナビゲーション (例: < 2025年 8月 >)
            - カレンダーグリッド
            - サマリー表示 (月合計、平日平均、休日平均)
        - フローティングボタン: 「+」で記録画面へ
    - **記録画面**
        - ヘッダー: 「学習の記録」タイトル、戻るボタン
        - フォーム: 日付、勉強時間、休憩時間リスト（追加ボタン付き）
        - アクション: 「保存」ボタン
    - **設定画面**
        - ヘッダー: 「設定」タイトル、戻るボタン
        - オプション: 「バックアップを作成する」ボタン
- [x] 技術スタックを最終決定する (HTML, CSS, JS)