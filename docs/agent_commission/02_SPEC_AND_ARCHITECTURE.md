# 02. 最新プロダクト仕様・アーキテクチャ仕様書

## 1. コアコンセプトと確定仕様

1. **4つのドア＝4つの独立したビデオ通話ルームインスタンス**
   - ロビーには4つのドアが並ぶ：
     - ドア1 (`chanoma`)：`🍵 実家の茶の間`
     - ドア2 (`engawa`)：`🌼 日当たりのいい縁側`
     - ドア3 (`kitchen`)：`🍲 夕暮れの台所・ダイニング`
     - ドア4 (`hobby`)：`🎨 みんなの趣味部屋`
   - **事前在室設定・気配抽出の廃止**：
     - 初期状態で誰かが常時入っている設定や、カメラ静止画からの気配抽出（`POST /api/doors/:id/presence` / `analyzeDoorPresence`）は**廃止**。
     - 誰も入室していないドアは「`空室 — ノックして団らんを始める`（0人・明かり消灯）」。
   - **入室によるドアの点灯**：
     - 誰かがドアをノックして入室（WebSocket `enter_door`）している間だけ、そのドアに明かりが灯る。
     - 1人入室中：**`-{accountName}-がくつろいでいます。`**
     - 2人以上入室中：**`-{先頭accountName}-ほか計${n}人が団らん中`**

2. **相手専用メイン映像枠とカメラ常時ONのWebRTCビデオ通話**
   - 入室時はカメラ常時ON（実カメラ `📷 実カメラ` または Canvas描画の `🍵 バーチャル茶の間カメラ`）。
   - 通話画面の大きなメイン映像枠（`#remoteStage`）から、旧「おばあちゃん（デモ）家族シミュレーター」は**完全廃止**。
   - 自分1人で入室している間は「🏮 家族の入室を待っています」の待機カードを表示し、2人目以降の相手が同じドアに入室した瞬間に待機カードが消え、相手のWebRTCカメラ映像が大きく映る。
   - ブラウザの自動再生ブロック（Autoplay Policy）発生時にはワンタップで音声・映像を再生復帰できるボタンを表示する。

3. **団らん話題カード（100選デッキ ＋ Gemini生成［TBW］）**
   - `public/data/topics.json`（10カテゴリ・全100件）からランダムにカードを引いて（`GET /api/topics/random`）、WebSocket `share_topic` で同室の全員にリアルタイム共有する。
   - **Gemini による団らん話題カード生成機能はドキュメント・アーキテクチャ図上で `TBW`（To Be Written）表記**とする。

4. **退室時の Gemini 2.5 Flash 安心見守りレポート＆見守りノート**
   - 退室時に通話時間・参加者・話した話題・気づきメモを `POST /api/summary` へ送信。
   - `server/geminiService.js` が `@google/genai` SDK（`GEMINI_API_KEY` または Cloud Run 上の Vertex AI `GEMINI_VERTEX_PROJECT`）経由で `gemini-2.5-flash` を呼び出し、非医療的な会話の活気の目安（`vitalityScore`）、様子の要約（`mood`, `highlights`）、次回の話題提案（`nextTopicSuggestion`）を生成して「📓 安心見守りノート」に記録する。

---

## 2. アーキテクチャ図（GIF・Mermaid）

- アニメーションGIF：`public/assets/pipeline.gif`（`python scripts/generate_pipeline_gif.py` で再生成可能）
  - **STEP 1**：4つのドアの明かりを見る（`GET /api/doors` + `doors_update`）
  - **STEP 2**：ノックして部屋に入る（`knock_door` → `enter_door` → `room_state`）
  - **STEP 3**：顔を見て、団らんする（WebRTC P2P + 話題カード100選抽選 / AI話題カード生成: TBW）
  - **STEP 4**：安心をノートに残す（`POST /api/summary` → Gemini 2.5 Flash 要約）
