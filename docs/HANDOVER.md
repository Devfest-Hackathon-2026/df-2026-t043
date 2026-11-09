# 『となりドア (Tonari Door)』— プロジェクト引継ぎ資料 (HANDOVER.md)

**最終更新日時**：2026年11月9日 19:29 JST  
**対象**：チームメンバー（`yoikoarmor`, `kaigunn_2020` / GitHub: `suzukimain`）および後続のすべてのAIエージェント

---

## 1. プロジェクト基本情報・重要リンク

| 項目 | 内容 |
|---|---|
| **大会名** | DevFest GDGoC Japan 2026 Hackathon (DF Hack26) — 東京会場 |
| **チーム名** | Generator-Critic (`yoikoarmor`, `kaigunn_2020` / `suzukimain`) |
| **アプリ名 / カテゴリ** | **「となりドア (Tonari Door)」** / **1. 医療・福祉** |
| **GitHub リポジトリ** | https://github.com/yoikoarmor/GDG-hackathon （Private / `suzukimain` に Write 権限付与済） |
| **ローカル稼働URL** | `http://localhost:8080` （バックグラウンド起動済・ブラウザ自動オープン済） |
| **コードフリーズ・提出締切** | **2026年11月10日 19:00 JST（厳守）** |
| **Regional Day（URL維持期限）** | **2026年11月14日 終了まで**（デプロイURLを稼働維持すること） |

---

## 2. 最新プロダクト仕様（4つの独立したドア＝ビデオ通話ルームインスタンス方式）

- **「誰が常時どこにいるか」の事前在室設定を完全廃止**：
  - 初期状態で特定の人物（おばあちゃん等）が常時ドアの中にいる設定や、ロビーでの「ここでくつろぐ」「カメラで事前気配更新（`POST /api/doors/:id/presence`）」を廃止。
- **「4つのドア ＝ 4つの独立したビデオ通話ルームインスタンス」**：
  - ロビーにはシンプルに **4つのドア（① `chanoma`: 🍵 ドア1：茶の間、② `engawa`: 🌼 ドア2：日当たりの縁側、③ `kitchen`: 🍲 ドア3：ダイニング、④ `hobby`: 🧶 ドア4：趣味の部屋）** が並ぶ。
  - 各ドアはそれぞれ1つの独立したルームインスタンスとして動作し、誰も入っていないときは「`空室 — ノックして団らんを始める`（0人・消灯）」。
  - 誰かがドアをノックして入室（WebSocket `enter_door`）しているときだけそのドアに明かりが灯り、1人のときは **`-{アカウント名}-がくつろいでいます。`**、2人以上のときは **`-{先頭アカウント名}-ほか計N人が団らん中`** とリアルタイム表示される。
  - 同じドアに入った人同士で **WebRTC ビデオ通話（カメラ常時ON：実カメラ ⇄ バーチャル茶の間カメラ）** と **団らん話題カード（100選ランダム ＋ Gemini 2.5 Flash 生成）** が共有され、退室時には **Gemini 2.5 Flash による安心見守りレポート** が生成される。

---

## 3. マルチエージェント開発・監査ステータス（すべて完了 ✅）

| 担当エージェント | 役割 | ステータス |
|---|---|---|
| **Antigravity** | 統括・仕様更新・結合検証・ローカルサーバー起動・引継ぎ管理 | **✅ 完了**：`API_CONTRACT.md` 更新、文字化け修正、`npm test` 全項目PASS確認、`http://localhost:8080` 起動＆ブラウザ表示 |
| **Codex CLI (`gpt-6.1-sol` / `high`)** | バックエンド＆ドキュメント改修 | **✅ 完了**：`server/index.js`, `server/geminiService.js`, `ARCHITECTURE.md`, `README.md`, `docs/PRODUCT_DOCUMENT.md`, `docs/PRODUCT_DOCUMENT.html` を4ドア・ルームインスタンス仕様へ更新 |
| **Claude Code CLI (`opus-5.5-mid`)** | フロントエンド・ドアUI改修 | **✅ 完了**：`public/index.html`, `public/styles.css`, `public/app.js` から事前在室設定を削除し、4ドア＝4ルームUIへ刷新（3ブラウザE2E検証済） |
| **Astra-mid (`gpt-6-astra` / `medium`)** | バグ監査・自動テスト改修 | **✅ 完了**：`server/smokeTest.js`, `server/frontendTest.js` を新仕様（初期4ドア空室・入退室・WebRTCシグナル・話題共有・カメラ競合防止）向けに更新し全テストPASS |

---

## 4. ディレクトリ・ファイル構成マップ

- **ルート設定・設計書**
  - [AGENTS.md](file:///c:/Users/yoiko/Downloads/GDG-hackathon/AGENTS.md) / [API_CONTRACT.md](file:///c:/Users/yoiko/Downloads/GDG-hackathon/API_CONTRACT.md) / [ARCHITECTURE.md](file:///c:/Users/yoiko/Downloads/GDG-hackathon/ARCHITECTURE.md) / [README.md](file:///c:/Users/yoiko/Downloads/GDG-hackathon/README.md) / [LICENSE_CREDITS.md](file:///c:/Users/yoiko/Downloads/GDG-hackathon/LICENSE_CREDITS.md)
  - [Dockerfile](file:///c:/Users/yoiko/Downloads/GDG-hackathon/Dockerfile) / [firebase.json](file:///c:/Users/yoiko/Downloads/GDG-hackathon/firebase.json)
- **提出ドキュメント・引継ぎ (`docs/`)**
  - [PRODUCT_DOCUMENT.md](file:///c:/Users/yoiko/Downloads/GDG-hackathon/docs/PRODUCT_DOCUMENT.md) / [PRODUCT_DOCUMENT.html](file:///c:/Users/yoiko/Downloads/GDG-hackathon/docs/PRODUCT_DOCUMENT.html) / [HANDOVER.md](file:///c:/Users/yoiko/Downloads/GDG-hackathon/docs/HANDOVER.md)
- **フロントエンド (`public/`)**
  - [index.html](file:///c:/Users/yoiko/Downloads/GDG-hackathon/public/index.html) / [styles.css](file:///c:/Users/yoiko/Downloads/GDG-hackathon/public/styles.css) / [app.js](file:///c:/Users/yoiko/Downloads/GDG-hackathon/public/app.js) / [topics.json](file:///c:/Users/yoiko/Downloads/GDG-hackathon/public/data/topics.json) / [pipeline.gif](file:///c:/Users/yoiko/Downloads/GDG-hackathon/public/assets/pipeline.gif)
- **バックエンド＆自動テスト (`server/`)**
  - [index.js](file:///c:/Users/yoiko/Downloads/GDG-hackathon/server/index.js) / [geminiService.js](file:///c:/Users/yoiko/Downloads/GDG-hackathon/server/geminiService.js) / [smokeTest.js](file:///c:/Users/yoiko/Downloads/GDG-hackathon/server/smokeTest.js) / [frontendTest.js](file:///c:/Users/yoiko/Downloads/GDG-hackathon/server/frontendTest.js)

---

## 5. 動作確認・コマンド早見表

```powershell
# 自動監査＆ユニット・結合テスト実行（すべてPASS確認済）
npm test

# ローカルサーバー起動（現在ポート8080で起動中）
npm start
```

---

## 6. 提出期限（11月10日 19:00 JST）までの残タスク

- [x] **1. 新方針（4つの独立ドアインスタンス方式）へのバックエンド＆フロントエンド改修完了**
- [x] **2. Astra-mid による新方針コードのバグチェック＆自動テスト更新（`npm test` 全PASS）**
- [x] **3. `README.md` / `docs/PRODUCT_DOCUMENT.md` / `docs/PRODUCT_DOCUMENT.html` の新方針への同期**
- [ ] **4. Cloud Run へのデプロイと本番URLの発行**（`gcloud run deploy tonari-door --source . --region asia-northeast1 --allow-unauthenticated --max-instances 1 --session-affinity`）
- [ ] **5. デモ動画撮影（3分以内）・ピッチ用スライド作成・Google Drive 提出**
