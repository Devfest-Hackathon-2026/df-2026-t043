# となりドア (Tonari Door) — 4つのドアから始まる、離れて暮らす家族の団らんビデオアプリ

**GDGoC Japan Hackathon 2026 (DF Hack26) 提出プロダクト**

![となりドア パイプラインイメージ](public/assets/pipeline.gif)

- **チーム名**：Generator-Critic
- **メンバー**：`yoikoarmor` (小沢司), `suzukimain` (鈴木崇博)
- **参加会場**：Tokyo Regional
- **対象カテゴリ**：1. 医療・福祉（高齢者見守り・遠距離家族ケア・孤立防止）
- **デプロイURL（Google Cloud Run）**：https://gdg-hackathon-752978143113.asia-northeast1.run.app/
- **GitHub リポジトリ**：https://github.com/yoikoarmor/GDG-hackathon

---

## 1. 解決する社会課題とプロダクトの価値

### 社会課題
離れて暮らす親や祖父母の様子が気になるものの、毎日訪ねたり電話したりするのは簡単ではありません。
- **電話のハードル**：「今忙しいかな？」「特別な用事がないのに電話するのは気が引ける」と躊躇してしまう。
- **監視カメラへの抵抗感**：見守りカメラはプライバシー侵害や「監視されている」という心理的抵抗が強い。
- **Web会議ツールの業務感**：Zoom や Google Meet はスケジュール調整やURL共有が必要で「業務的」であり、実家の茶の間のような「ふらっと顔を出して団らんする」温かみが生まれにくい。

### 『となりドア』が提供する3つの価値
1. **4つのドアの明かりで「今くつろいでいる場所・タイミング」がわかる**
   - 生映像を常時監視するのではなく、4つのドア（茶の間・縁側・ダイニング・趣味部屋）に誰かが入室している間だけドアに明かりが灯り、プレートに **`-{アカウント名}-がくつろいでいます。`** （2人以上なら **`-{アカウント名}-ほか計N人が団らん中`**）とリアルタイム表示します。
2. **4つのドアから入る「ビデオ会議の団らん化」（カメラ常時ON）**
   - 廊下に並ぶ4つのドアはそれぞれ独立したルームインスタンスとなっており、ノックして開けるとすぐにビデオ通話空間に繋がります。
   - **あえてビデオ通話（実カメラ／バーチャル茶の間カメラ常時ON）を基本**とすることで、声だけではわからない相手の顔色や表情、元気さを自然に確認でき、家族の「気になる・心配」を払拭します。
3. **「団らん話題カード（100選 ＋ Gemini生成［TBW］）」＆「Gemini 安心見守りレポート」**
   - 会話のきっかけを作る **100件の話題カードデッキ**からランダムに引いて同室の家族全員で共有できます（※Gemini によるリアルタイム話題カード生成は **TBW**）。
   - 退室時には、**Gemini 2.5 Flash** が今日の団らんの時間・参加者・話した話題・気づきメモから「安心見守りレポート（元気度・様子・次回の話題提案）」を自動生成し、「安心見守りノート」に記録します。

---

## 2. システムアーキテクチャ（Google Cloud & Google AI 構成）

- **実行基盤（必須要件）**：**Google Cloud Run**（`https://gdg-hackathon-752978143113.asia-northeast1.run.app/` — Node.js / Express + WebSocket シグナリング + フロントエンド配信を単一コンテナでホスト）
- **中核 AI 技術**：**Google Gemini 2.5 Flash (`@google/genai` SDK / Vertex AI 対応)**
  - 通話後の安心見守りサマリー生成 (`POST /api/summary`)
  - 団らん話題カードの動的生成 (**TBW** / `POST /api/topics/generate`)
- **リアルタイム通信**：WebSocket (`/ws`) による4つのドアインスタンスの入退室同期・ノック通知・話題カード共有・WebRTC シグナリング
- **WebRTC ビデオ通話**：Google STUN (`stun:stun.l.google.com:19302`) によるブラウザ間 P2P 映像・音声通信（自動再生ブロック時のワンタップ復帰対応）

---

## 3. ローカルでのセットアップと実行方法

### 必要環境
- Node.js 20 以上

### 手順
```bash
# 1. 依存パッケージのインストール
npm ci

# 2. 環境変数の設定（省略時も100件の話題カード＆フォールバックで完全動作します）
cp .env.example .env
# .env 内の GEMINI_API_KEY または GEMINI_VERTEX_PROJECT を設定

# 3. サーバー起動
npm start
```
起動後、ブラウザで `http://localhost:8080` を開くとすぐに利用できます。

### 自動スモークテストの実行
```bash
npm test
```

### パイプラインGIFの再生成
Windows の日本語フォントと Python 3.10 以上、Pillow（`python -m pip install Pillow`）を用意し、以下を実行します：
```bash
python scripts/generate_pipeline_gif.py
```

---

## 4. Google Cloud Run デプロイ構成

- **本番デプロイURL**：https://gdg-hackathon-752978143113.asia-northeast1.run.app/
- **デプロイコマンド例**：
```bash
gcloud run deploy gdg-hackathon \
  --source . \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --session-affinity \
  --timeout 3600 \
  --concurrency 80 \
  --min-instances 1 \
  --max-instances 1
```

---

## 5. マルチエージェント開発体制と AI 活用記録

本プロジェクトは GDGoC Japan Hackathon 2026 の開発期間内（2026年11月5日〜11月10日）に、以下の AI エージェント協調体制で設計・実装・監査を行いました：
- **Antigravity**：全体統括、要件適合監査、100件の団らん話題カード（`public/data/topics.json`）作成、ドキュメント・引継ぎ委託書作成
- **Codex CLI (`gpt-6.1-sol`)**：アーキテクチャ詳細設計（`ARCHITECTURE.md`）、Express + WebSocket + `@google/genai` バックエンド実装（`server/`）、パイプラインGIF生成
- **Claude Code CLI (`opus-5.5-mid`)**：4つのドアが並ぶロビーUI、`-{アカウント名}-がくつろいでいます。` 在室プレート、ビデオ通話常時ONの団らんルームUI実装（`public/`）
- **Codex CLI (`gpt-6-astra`)**：自動スモークテスト・フロントエンド回帰テスト（`server/smokeTest.js`, `server/frontendTest.js`）およびバグ監査
