# となりドア (Tonari Door) — 離れて暮らす家族の「声をかけるタイミングがわかる」団らんビデオアプリ

**GDGoC Japan Hackathon 2026 (DF Hack26) 提出プロダクト**
- **チーム名**：Generator-Critic (`kaigunn_2020`, `yoikoarmor`)
- **参加会場**：Tokyo Regional
- **対象カテゴリ**：1. 医療・福祉（高齢者見守り・遠距離家族ケア・孤立防止）

---

## 1. 解決する社会課題とプロダクトの価値

### 社会課題
離れて暮らす親や祖父母の様子が気になるものの、毎日訪ねたり電話したりするのは簡単ではありません。
- **電話のハードル**：「今忙しいかな？」「特別な用事がないのに電話するのは気が引ける」と躊躇してしまう。
- **監視カメラへの抵抗感**：見守りカメラはプライバシー侵害や「監視されている」という心理的抵抗が強い。
- **Web会議ツールの業務感**：Zoom や Google Meet はスケジュール調整やURL共有が必要で「業務的」であり、かつての Skype や実家の茶の間のような「ふらっと顔を出して団らんする」温かみが生まれにくい。

### 『となりドア』が提供する3つの価値
1. **ドア越しの気配で「声をかけるタイミング」がわかる**
   - 生映像を常時監視するのではなく、**Google Gemini (`gemini-2.5-flash`)** が在室状況やカメラフレームをプライバシーに配慮して抽象化し、ドアの明かりとプレートに **`-{アカウント名}-がくつろいでいます。`** （例：`-おばあちゃん-がくつろいでいます。`）と「声かけタイミング度（◎）」を表示します。
2. **複数のドアから入る「ビデオ会議の団らん化」（あえてビデオ通話を強制）**
   - 「実家の茶の間」「日当たりのいい縁側」「夕暮れの台所」「みんなの趣味部屋」といった複数のドアが並び、ノックして開けるとすぐにビデオ通話空間に繋がります。
   - **あえてビデオ通話（カメラON／バーチャル在室カメラ）を強制**することで、声だけではわからない相手の顔色や表情、元気さを自然に確認でき、家族の「気になる・心配」を払拭します。
3. **100選＋Gemini 生成の「団らん話題カード」＆「安心見守りレポート」**
   - 会話のきっかけを作る **100件の話題カードデッキ**からランダムに引けるほか、**Gemini API** がその場の状況に合わせた新しい話題カードをリアルタイム生成します。
   - 退室時には、Gemini が今日の団らんの様子から「安心見守りレポート（元気度・様子・次回の話題提案）」を自動記録します。

---

## 2. システムアーキテクチャ（Google Cloud & Google AI 構成）

- **実行基盤（必須要件）**：**Google Cloud Run**（Node.js / Express + WebSocket シグナリング + フロントエンド配信を単一コンテナでホスト）
- **中核 AI 技術**：**Google Gemini API (`@google/genai` SDK / `gemini-2.5-flash`)**
  - ドア越しの気配・声かけタイミング判定 (`POST /api/doors/:id/presence`)
  - 団らん話題カードの動的生成 (`POST /api/topics/generate`)
  - 通話後の安心見守りサマリー生成 (`POST /api/summary`)
- **リアルタイム通信**：WebSocket (`/ws`) によるドアの気配同期・ノック通知・話題カード共有・WebRTC シグナリング

---

## 3. ローカルでのセットアップと実行方法

### 必要環境
- Node.js 20 以上

### 手順
```bash
# 1. 依存パッケージのインストール
npm install

# 2. 環境変数の設定（省略時も100件の話題カード＆デモフォールバックで完全動作します）
cp .env.example .env
# .env 内の GEMINI_API_KEY に Google AI Studio の API キーを設定

# 3. サーバー起動
npm start
```
起動後、ブラウザで `http://localhost:8080` を開くとすぐに利用できます。

### 自動スモークテストの実行
```bash
npm test
```

---

## 4. Google Cloud Run へのデプロイ手順

```bash
# Google Cloud プロジェクトの設定
gcloud config set project YOUR_GCP_PROJECT_ID

# Cloud Run へソースから直接ビルド＆デプロイ（WebSocket 対応のためセッションアフィニティ推奨）
gcloud run deploy tonari-door-danran \
  --source . \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --session-affinity \
  --set-env-vars="GEMINI_MODEL=gemini-2.5-flash"
```
※ `GEMINI_API_KEY` は Google Cloud Secret Manager または Cloud Run 環境変数として安全に注入します。

---

## 5. マルチエージェント開発体制と AI 活用記録

本プロジェクトは GDGoC Japan Hackathon 2026 の開発期間内（2026年11月5日〜11月10日）に、以下の AI エージェント協調体制で設計・実装・監査を行いました：
- **Antigravity**：全体統括、要件適合監査、100件の団らん話題カード（`public/data/topics.json`）作成、統合テスト・バグ検証
- **Codex CLI (`codex-sol6.1-high`)**：アーキテクチャ詳細設計（`ARCHITECTURE.md`）、Express + WebSocket + `@google/genai` バックエンド実装（`server/`）
- **Claude Code CLI (`opus-5.5-mid`)**：複数のドアが並ぶ入口UI、`-{アカウント名}-がくつろいでいます。` 気配プレート、ビデオ通話強制の団らんルームUI実装（`public/`）
