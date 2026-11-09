# 『となりドア (Tonari Door)』— プロジェクト引継ぎ資料 (HANDOVER.md)

**最終更新日時**：2026年11月9日 19:46 JST  
**対象**：チームメンバー（`yoikoarmor`, `kaigunn_2020` / GitHub: `suzukimain`）および後続のすべてのAIエージェント

---

## 1. プロジェクト基本情報・重要リンク

| 項目 | 内容 |
|---|---|
| **大会名** | DevFest GDGoC Japan 2026 Hackathon (DF Hack26) — 東京会場 |
| **チーム名** | Generator-Critic (`yoikoarmor`, `kaigunn_2020` / `suzukimain`) |
| **アプリ名 / カテゴリ** | **「となりドア (Tonari Door)」** / **1. 医療・福祉** |
| **GitHub リポジトリ** | https://github.com/yoikoarmor/GDG-hackathon （Private / `suzukimain` に Write 権限付与済・最新 `origin/main` Push済） |
| **ローカル稼働URL** | `http://localhost:8080` （バックグラウンド起動中） |
| **コードフリーズ・提出締切** | **2026年11月10日 19:00 JST（厳守）** |
| **Regional Day（URL維持期限）** | **2026年11月14日 終了まで**（デプロイURLを稼働維持すること） |

---

## 2. 最新プロダクト仕様（2026-11-09 19:46 統合＆Push済）

1. **「4つのドア ＝ 4つの独立したビデオ通話ルームインスタンス」**：
   - ロビーにはシンプルに **4つのドア（① `chanoma`: 🍵 ドア1：茶の間、② `engawa`: 🌼 ドア2：日当たりの縁側、③ `kitchen`: 🍲 ドア3：ダイニング、④ `hobby`: 🧶 ドア4：趣味の部屋）** が並ぶ。
   - 初期状態ではすべて「空室（0人・消灯）」であり、特定の人物が常時中にいる設定はない。
   - 誰かがドアをノックして入室しているときだけ明かりが灯り、1人のときは **`-{アカウント名}-がくつろいでいます。`**、2人以上のときは **`-{先頭アカウント名}-ほか計N人が団らん中`** と表示される。
2. **メイン映像エリアは「実際に入ってきた相手」専用（「おばあちゃん（デモ）」シミュレーター完全廃止）**：
   - 団らんルーム内の大きなメイン映像枠（`#remoteStage`）から、1人入室時に出ていた「`-おばあちゃん-（デモ）` / `家族シミュレーター（デモ）`」を完全削除。
   - 自分1人だけが入室している間は「🏮 家族の入室を待っています — 同じドアに家族が入ると、ここに相手の映像が映ります。」という温かい待機カードを表示し、**別のブラウザ・タブ・スマホから相手が同じドアに入室した瞬間に待機カードが消え、その相手のWebRTCビデオ映像が大きく表示される**。
3. **「🚶 一緒にお散歩（Google Maps Street View 同期散歩機能）」を統合（`suzukimain` 実装分）**：
   - 団らんルーム内で家族とつながっている間、Google Maps JavaScript API Street View（浅草・横浜・京都）の視点を WebSocket（`walk_start` / `walk_update` / `walk_stop` / `walk_state`）で同期しながら一緒にお散歩できる機能を統合済（`.env` に `GOOGLE_MAPS_BROWSER_API_KEY` を設定すると有効化）。

---

## 3. マルチエージェント開発・監査ステータス（すべて完了 ✅）

| 担当エージェント | 役割 | ステータス |
|---|---|---|
| **Antigravity** | 統括・仕様更新・マージ解決・GitHub Push・引継ぎ管理 | **✅ 完了**：`suzukimain` さんの Street View 散歩機能（`dd80c10`）と4ドア改修・おばあちゃん削除コミットをコンフリクト解消の上マージし、`npm test` 全PASS確認＆ `origin/main` へ Push 完了 |
| **Sol-fast (`gpt-6.1-sol` / `low`)** | 団らんルーム「おばあちゃん（デモ）」削除＆相手映像枠への改修 (`task-342`) | **✅ 完了**：[public/index.html](file:///c:/Users/yoiko/Downloads/GDG-hackathon/public/index.html), [public/app.js](file:///c:/Users/yoiko/Downloads/GDG-hackathon/public/app.js), [public/styles.css](file:///c:/Users/yoiko/Downloads/GDG-hackathon/public/styles.css) から家族シミュレーター（おばあちゃん）と自動応答を完全削除し、相手ピア映像枠へ改修完了 |
| **Astra-fast (`gpt-6-astra` / `low`)** | 改修後の高速バグチェック＆テスト検証 (`task-354`) | **✅ 完了**：`closeAllPeers()` 時に待機カードが復帰しないエッジケースを修正。[server/frontendTest.js](file:///c:/Users/yoiko/Downloads/GDG-hackathon/server/frontendTest.js) にピア入退室時の待機枠表示切替テストを追加し、`npm test` 全件PASS確認 |

---

## 4. ディレクトリ・ファイル構成マップ

- **ルート設定・設計書**
  - [AGENTS.md](file:///c:/Users/yoiko/Downloads/GDG-hackathon/AGENTS.md) / [API_CONTRACT.md](file:///c:/Users/yoiko/Downloads/GDG-hackathon/API_CONTRACT.md) / [ARCHITECTURE.md](file:///c:/Users/yoiko/Downloads/GDG-hackathon/ARCHITECTURE.md) / [README.md](file:///c:/Users/yoiko/Downloads/GDG-hackathon/README.md) / [LICENSE_CREDITS.md](file:///c:/Users/yoiko/Downloads/GDG-hackathon/LICENSE_CREDITS.md)
  - [Dockerfile](file:///c:/Users/yoiko/Downloads/GDG-hackathon/Dockerfile) / [firebase.json](file:///c:/Users/yoiko/Downloads/GDG-hackathon/firebase.json)
- **提出ドキュメント・引継ぎ (`docs/`)**
  - [PRODUCT_DOCUMENT.md](file:///c:/Users/yoiko/Downloads/GDG-hackathon/docs/PRODUCT_DOCUMENT.md) / [PRODUCT_DOCUMENT.html](file:///c:/Users/yoiko/Downloads/GDG-hackathon/docs/PRODUCT_DOCUMENT.html) / [HANDOVER.md](file:///c:/Users/yoiko/Downloads/GDG-hackathon/docs/HANDOVER.md)
- **フロントエンド (`public/`)**
  - [index.html](file:///c:/Users/yoiko/Downloads/GDG-hackathon/public/index.html) / [styles.css](file:///c:/Users/yoiko/Downloads/GDG-hackathon/public/styles.css) / [app.js](file:///c:/Users/yoiko/Downloads/GDG-hackathon/public/app.js) / [walk.js](file:///c:/Users/yoiko/Downloads/GDG-hackathon/public/walk.js) / [topics.json](file:///c:/Users/yoiko/Downloads/GDG-hackathon/public/data/topics.json) / [pipeline.gif](file:///c:/Users/yoiko/Downloads/GDG-hackathon/public/assets/pipeline.gif)
- **バックエンド＆自動テスト (`server/`)**
  - [index.js](file:///c:/Users/yoiko/Downloads/GDG-hackathon/server/index.js) / [geminiService.js](file:///c:/Users/yoiko/Downloads/GDG-hackathon/server/geminiService.js) / [walkService.js](file:///c:/Users/yoiko/Downloads/GDG-hackathon/server/walkService.js) / [smokeTest.js](file:///c:/Users/yoiko/Downloads/GDG-hackathon/server/smokeTest.js) / [frontendTest.js](file:///c:/Users/yoiko/Downloads/GDG-hackathon/server/frontendTest.js) / [walkTest.js](file:///c:/Users/yoiko/Downloads/GDG-hackathon/server/walkTest.js) / [walkFrontendTest.js](file:///c:/Users/yoiko/Downloads/GDG-hackathon/server/walkFrontendTest.js)
