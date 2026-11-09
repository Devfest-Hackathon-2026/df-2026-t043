# 『となりドア (Tonari Door)』— プロジェクト引継ぎ資料 (HANDOVER.md)

**最終更新日時**：2026年11月9日 20:58 JST  
**対象**：チームメンバー（`yoikoarmor(小沢司)`, `suzukimain(鈴木崇博)`）および後続のすべてのAIエージェント

---

## 1. プロジェクト基本情報・重要リンク

| 項目 | 内容 |
|---|---|
| **大会名** | DevFest GDGoC Japan 2026 Hackathon (DF Hack26) — 東京会場 |
| **チーム名** | Generator-Critic |
| **メンバー** | **yoikoarmor(小沢司)、suzukimain(鈴木崇博)** |
| **アプリ名 / カテゴリ** | **「となりドア (Tonari Door)」** / **1. 医療・福祉** |
| **GitHub リポジトリ** | https://github.com/yoikoarmor/GDG-hackathon （Private / 最新 `origin/main` 同期済） |
| **本番デプロイURL (Cloud Run)** | https://gdg-hackathon-752978143113.asia-northeast1.run.app/ |
| **ローカル稼働URL** | `http://localhost:8080` （バックグラウンド起動中） |
| **コードフリーズ・提出締切** | **2026年11月10日 19:00 JST（厳守）** |
| **Regional Day（URL維持期限）** | **2026年11月14日 終了まで**（デプロイURLを稼働維持すること） |

---

## 2. 最新プロダクト仕様（2026-11-09 20:58 更新）

1. **「4つのドア ＝ 4つの独立したビデオ通話ルームインスタンス」**：
   - ロビーにはシンプルに **4つのドア（① `chanoma`: 🍵 実家の茶の間、② `engawa`: 🌼 日当たりのいい縁側、③ `kitchen`: 🍲 夕暮れの台所・ダイニング、④ `hobby`: 🎨 みんなの趣味部屋）** が並ぶ。
   - **事前在室設定・気配抽出の完全廃止**：初期状態で誰かが常時いる設定や、カメラ静止画からの事前気配抽出（`POST /api/doors/:id/presence` / `analyzeDoorPresence`）は廃止。
   - 誰も入っていないドアは「`空室 — ノックして団らんを始める`（0人・消灯）」、誰かがノックして入室しているときだけ明かりが灯り、1人のときは **`-{アカウント名}-がくつろいでいます。`**、2人以上のときは **`-{先頭アカウント名}-ほか計N人が団らん中`** と表示される。
2. **メイン映像エリアは「実際に入ってきた相手」専用（「おばあちゃん（デモ）」シミュレーター完全廃止）**：
   - 団らんルーム内の大きなメイン映像枠（`#remoteStage`）から、旧「`-おばあちゃん-（デモ）` / `家族シミュレーター（デモ）`」を完全削除。
   - 1人入室時は待機カードを表示し、2人目以降の相手が同じドアに入室した瞬間に待機カードが消え、その相手のWebRTCカメラ映像が大きく映る（自動再生ブロック時のワンタップ復帰機能つき）。
3. **団らん話題カード（100選抽選 ＋ Gemini生成［TBW］）＆ Gemini 安心見守りレポート**：
   - 100件の話題カードデッキ（`public/data/topics.json`）からのランダム抽選・同室者共有に対応。**Gemini による団らん話題カード生成はドキュメント・アーキテクチャ図上で `TBW` 表記**。
   - 退室時には **Gemini 2.5 Flash**（`GEMINI_API_KEY` または Cloud Run 上の Vertex AI `GEMINI_VERTEX_PROJECT`）が「安心見守りレポート（元気度・様子・次回の話題提案）」を自動生成・保存する。

---

## 3. 後続AIエージェント向け委託書フォルダ (`docs/agent_commission/`)

後続のエージェントが即座に全体像・仕様・ファイルパスを把握できるよう、以下の委託書フォルダを整備しました：
- [docs/agent_commission/README.md](file:///c:/Users/yoiko/Downloads/GDG-hackathon/docs/agent_commission/README.md) — 委託書フォルダ目次
- [docs/agent_commission/00_AGENT_PROMPT.md](file:///c:/Users/yoiko/Downloads/GDG-hackathon/docs/agent_commission/00_AGENT_PROMPT.md) — **後続AIエージェントへそのまま貼れる引継ぎ指示文（ファイルパス付き）**
- [docs/agent_commission/01_PROJECT_AND_TEAM_INFO.md](file:///c:/Users/yoiko/Downloads/GDG-hackathon/docs/agent_commission/01_PROJECT_AND_TEAM_INFO.md) — チーム・メンバー・URL・期限情報
- [docs/agent_commission/02_SPEC_AND_ARCHITECTURE.md](file:///c:/Users/yoiko/Downloads/GDG-hackathon/docs/agent_commission/02_SPEC_AND_ARCHITECTURE.md) — 最新仕様・アーキテクチャ仕様
- [docs/agent_commission/03_SUBMISSION_CHECKLIST.md](file:///c:/Users/yoiko/Downloads/GDG-hackathon/docs/agent_commission/03_SUBMISSION_CHECKLIST.md) — 提出物・コマンド一覧

---

## 4. ディレクトリ・ファイル構成マップ

- **ルート設定・設計書**
  - [AGENTS.md](file:///c:/Users/yoiko/Downloads/GDG-hackathon/AGENTS.md) / [API_CONTRACT.md](file:///c:/Users/yoiko/Downloads/GDG-hackathon/API_CONTRACT.md) / [ARCHITECTURE.md](file:///c:/Users/yoiko/Downloads/GDG-hackathon/ARCHITECTURE.md) / [README.md](file:///c:/Users/yoiko/Downloads/GDG-hackathon/README.md) / [LICENSE_CREDITS.md](file:///c:/Users/yoiko/Downloads/GDG-hackathon/LICENSE_CREDITS.md)
  - [Dockerfile](file:///c:/Users/yoiko/Downloads/GDG-hackathon/Dockerfile) / [firebase.json](file:///c:/Users/yoiko/Downloads/GDG-hackathon/firebase.json)
- **提出ドキュメント・引継ぎ・委託書 (`docs/`)**
  - [PRODUCT_DOCUMENT.md](file:///c:/Users/yoiko/Downloads/GDG-hackathon/docs/PRODUCT_DOCUMENT.md) / [PRODUCT_DOCUMENT.html](file:///c:/Users/yoiko/Downloads/GDG-hackathon/docs/PRODUCT_DOCUMENT.html) / [HANDOVER.md](file:///c:/Users/yoiko/Downloads/GDG-hackathon/docs/HANDOVER.md)
  - `docs/agent_commission/`（委託書一式）
- **フロントエンド (`public/`)**
  - [index.html](file:///c:/Users/yoiko/Downloads/GDG-hackathon/public/index.html) / [styles.css](file:///c:/Users/yoiko/Downloads/GDG-hackathon/public/styles.css) / [app.js](file:///c:/Users/yoiko/Downloads/GDG-hackathon/public/app.js) / [walk.js](file:///c:/Users/yoiko/Downloads/GDG-hackathon/public/walk.js) / [topics.json](file:///c:/Users/yoiko/Downloads/GDG-hackathon/public/data/topics.json) / [pipeline.gif](file:///c:/Users/yoiko/Downloads/GDG-hackathon/public/assets/pipeline.gif)
- **バックエンド＆自動テスト (`server/`)**
  - [index.js](file:///c:/Users/yoiko/Downloads/GDG-hackathon/server/index.js) / [geminiService.js](file:///c:/Users/yoiko/Downloads/GDG-hackathon/server/geminiService.js) / [walkService.js](file:///c:/Users/yoiko/Downloads/GDG-hackathon/server/walkService.js) / [smokeTest.js](file:///c:/Users/yoiko/Downloads/GDG-hackathon/server/smokeTest.js) / [frontendTest.js](file:///c:/Users/yoiko/Downloads/GDG-hackathon/server/frontendTest.js) / [walkTest.js](file:///c:/Users/yoiko/Downloads/GDG-hackathon/server/walkTest.js) / [walkFrontendTest.js](file:///c:/Users/yoiko/Downloads/GDG-hackathon/server/walkFrontendTest.js)
