# 『となりドア (Tonari Door)』— プロジェクト引継ぎ資料 (HANDOVER.md)

**最終更新日時**：2026年11月9日 17:25 JST  
**対象**：チームメンバー（`yoikoarmor`, `kaigunn_2020` / GitHub: `suzukimain`）および後続のすべてのAIエージェント

---

## 1. プロジェクト基本情報・重要リンク

| 項目 | 内容 |
|---|---|
| **大会名** | DevFest GDGoC Japan 2026 Hackathon (DF Hack26) — 東京会場 |
| **チーム名** | Generator-Critic (`yoikoarmor`, `kaigunn_2020` / `suzukimain`) |
| **アプリ名 / カテゴリ** | **「となりドア (Tonari Door)」** / **1. 医療・福祉** |
| **GitHub リポジトリ** | https://github.com/yoikoarmor/GDG-hackathon （Private / `suzukimain` に Write 権限付与済） |
| **コードフリーズ・提出締切** | **2026年11月10日 19:00 JST（厳守）** |
| **Regional Day（URL維持期限）** | **2026年11月14日 終了まで**（デプロイURLを稼働維持すること） |
| **ローカル動作確認URL** | 通常ロビー：`http://localhost:8080`<br>1台PC即入室デモ：`http://localhost:8080/?door=chanoma&cam=virtual` |

---

## 2. 絶対に維持すべきコア仕様（不変ルール）

後続の開発・修正を行う際は、以下の4つのコア仕様を絶対に壊さないこと（`npm test` で自動検証されます）：

1. **ドア越しの気配表示フォーマット**
   - くつろぎ中（`mode: "relaxing"`）のドアプレート表示は、必ず **`-{アカウント名}-がくつろいでいます。`** とすること（例：`-おばあちゃん-がくつろいでいます。`、`-yoikoarmor-がくつろいでいます。`）。
2. **ビデオ通話強制ポリシー（「ビデオ会議の団らん化」）**
   - 団らんルーム入室中は、相手の顔色や様子を見て安心するため **カメラ常時ON（「📷 実カメラ」または「🍵 バーチャル茶の間カメラ」）が必須**。カメラを完全にOFFにするボタンは作らないこと。
3. **団らん話題カード（100選デッキ ＋ Gemini 生成）**
   - `public/data/topics.json`（全100件・10カテゴリ）からのランダム抽選（`GET /api/topics/random`）と、Gemini 2.5 Flash によるリアルタイム話題生成（`POST /api/topics/generate`）の両方が動作し、WebSocket（`share_topic`）で同室メンバーに同期されること。
4. **プライバシー保護とフォールバック設計**
   - 気配判定用のカメラ静止画はサーバー上で保存・ブロードキャストせず、Gemini 解析後に即時破棄すること。
   - `GEMINI_API_KEY` 未設定時やカメラ非搭載PCでも、エラーで停止せずバーチャルカメラ・家族シミュレーター・100選カードで全機能が一気通貫で動くこと。

---

## 3. ディレクトリ・ファイル構成と担当一覧

```text
GDG-hackathon/
├── AGENTS.md                        # ハッカソン規則・エージェント行動指針
├── API_CONTRACT.md                  # フロント/バックエンド間のREST & WebSocket契約仕様
├── ARCHITECTURE.md                  # Cloud Run / Gemini / WebRTC アーキテクチャ詳細設計書
├── README.md                        # セットアップ・Cloud Runデプロイ手順・概要
├── LICENSE_CREDITS.md               # 提出物④「著作物利用シート」用の出典・ライセンス一覧
├── memo.txt                         # 企画ブレスト原文・アイデア統合メモ
├── Dockerfile                       # Cloud Run 用コンテナ定義（node:20-slim, 非root実行）
├── firebase.json                    # Firebase Hosting 静的デモ配信設定
├── docs/
│   ├── PRODUCT_DOCUMENT.md          # 提出物②「プロダクト説明ドキュメント」公式テンプレ準拠 (MD版)
│   ├── PRODUCT_DOCUMENT.html        # 提出物②「プロダクト説明ドキュメント」印刷・PDF保存用 (HTML版)
│   └── HANDOVER.md                  # 本引継ぎ資料（随時更新）
├── public/
│   ├── index.html                   # ロビー（4つのドア）＆団らんルームUI構造
│   ├── styles.css                   # 木目・暖簾・障子・照明アニメーション等のスタイル
│   ├── app.js                       # カメラ制御・HomeCam(Canvas)・WebRTC・WS・話題カード・見守りノート
│   ├── data/topics.json             # 団らん話題カード100選データ（10カテゴリ×10件）
│   └── assets/pipeline.gif          # コンセプト＆技術パイプライン解説アニメーションGIF (32フレーム)
├── scripts/
│   └── generate_pipeline_gif.py     # pipeline.gif 再生成用 Python (Pillow) スクリプト
└── server/
    ├── index.js                     # Express + ws シグナリング・REST APIサーバー (PORT=8080)
    ├── geminiService.js             # @google/genai (gemini-2.5-flash) 気配解析・話題生成・見守り要約
    ├── smokeTest.js                 # バックエンド・API契約・WebSocket統合自動テスト
    └── frontendTest.js              # フロントエンドDOM・非同期競合・カメラ切替自動テスト
```

---

## 4. これまでの開発履歴とマルチエージェント分担ログ

| コミット | 担当エージェント / 役割 | 実施内容 |
|---|---|---|
| `78e8f56` | **Antigravity** (統括)<br>**Codex** (`gpt-6.1-sol` / `high`)<br>**Claude Code** (`opus-5.5-mid`) | ・100件の話題カード（`public/data/topics.json`）と `API_CONTRACT.md` 作成<br>・Codex による `ARCHITECTURE.md`, `server/index.js`, `server/geminiService.js` 実装<br>・Claude Code による4つのドアUI・バーチャル茶の間カメラ・家族シミュレーター実装 |
| `48c9d6a` | **Antigravity** (統括監査) | ・同一PCの2タブ間で同じアカウント名のままでもノック・話題共有が届くよう `fromId` 判定を追加<br>・フォールバック時の状況キーワード判定を改善 |
| `aaa3747` | **Antigravity** | ・Firebase Hosting 用の `firebase.json` 追加 |
| `4a2439b` | **Codex** (`gpt-6.1-sol` / `high`) | ・仕組みとコンセプトを可視化するアニメーションGIF（`public/assets/pipeline.gif`）と生成スクリプト（`scripts/generate_pipeline_gif.py`）を作成し、`README.md` / `ARCHITECTURE.md` に埋め込み |
| `d386988` | **Antigravity** | ・大会公式サンプルPDFに完全準拠した `docs/PRODUCT_DOCUMENT.md` および `docs/PRODUCT_DOCUMENT.html` を作成<br>・GitHub リポジトリへ `suzukimain`（`kaigunn_2020`）さんを Write 権限で招待・承認完了 |
| `8646951` | **Astra-mid** (`gpt-6-astra` / `medium`) | ・全体バグ監査を実施し、ドア移動時の古いAI応答上書き防止、複数行メモの改行許可、「ひと休み」誤判定修正、退室・モーダル閉鎖時の遅延カメラトラック停止漏れ修正、`Dockerfile` 非root化を実施<br>・`server/frontendTest.js` を追加し、`npm test` を全18項目の自動検証に拡充 |

---

## 5. 開発・テスト・デプロイのクイックコマンド集

### 5.1 ローカル開発・動作確認
```bash
# 依存パッケージのインストール
npm install

# 自動監査・テストスイート実行（変更後は必ず実行して全PASSを確認すること）
npm test

# サーバー起動（http://localhost:8080）
npm start
```

### 5.2 Google Cloud Run 本番デプロイ手順

#### 方法A：ブラウザ（Google Cloud Console）から3分でデプロイする場合
1. [Google Cloud Console (Cloud Run)](https://console.cloud.google.com/run) を開く
2. **「サービスを作成」** ➔ **「ソースリポジトリから継続的にデプロイする」**
3. GitHub の `yoikoarmor/GDG-hackathon`（ブランチ `main`、ビルドタイプ `Dockerfile`）を選択
4. **「未認証の呼び出しを許可」** を選択
5. **重要設定**：「コンテナ、ボリューム、ネットワーキング、セキュリティ」内で **最大インスタンス数（Max instances）を `1`**、**セッションアフィニティを有効** に設定（インメモリの部屋・ドア状態を全ユーザーで共有するため）
6. 環境変数（または Secret Manager）に `GEMINI_API_KEY` を設定して **「作成」**

#### 方法B：gcloud CLI からコマンドでデプロイする場合
```bash
gcloud config set project YOUR_GCP_PROJECT_ID
gcloud run deploy tonari-door-danran \
  --source . \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --port 8080 \
  --timeout 3600 \
  --concurrency 80 \
  --min-instances 1 \
  --max-instances 1 \
  --session-affinity \
  --set-env-vars="GEMINI_MODEL=gemini-2.5-flash,GEMINI_API_KEY=YOUR_API_KEY"
```

---

## 6. 提出期限（11月10日 19:00 JST）までの残タスク・チェックリスト

- [x] **1. ベースアプリ・UI・バックエンド・100選話題カードの実装**（完了）
- [x] **2. コンセプト＆パイプラインGIFの作成・埋め込み**（`public/assets/pipeline.gif` 完了）
- [x] **3. Astra-mid による全体バグ修正＆自動テスト整備**（`npm test` 全PASS・完了）
- [x] **4. チームメンバー（`suzukimain`）への GitHub 編集・Push権限付与**（完了）
- [x] **5. プロダクト説明ドキュメントの作成**（`docs/PRODUCT_DOCUMENT.md` / `.html` 完了）
- [x] **6. 著作物利用シート原稿の作成**（`LICENSE_CREDITS.md` 完了）
- [ ] **7. Cloud Run へのデプロイと本番URLの発行**
  - 発行された `https://...run.app` のURLを `docs/PRODUCT_DOCUMENT.md` と `docs/PRODUCT_DOCUMENT.html` の「5. プロジェクトをデプロイしたURL」に記入し、ブラウザから `Ctrl + P` で提出用PDFを出力する
- [ ] **8. 実際の動作を記録したデモ動画の撮影（1〜3分）**
  - ロビーで気配確認（`-おばあちゃん-がくつろいでいます。`）➔ 自分の気配を灯す ➔ ノックして入室（ビデオ通話強制）➔ 話題カード抽選＆Gemini生成 ➔ 退室して安心見守りレポート表示 の流れを録画する
- [ ] **9. ピッチ用スライドの作成（東京会場用）**
- [ ] **10. Google Drive 提出フォルダ（「リンクを知っている全員が閲覧可」）への格納とフォーム提出**
