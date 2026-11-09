# となりドア (Tonari Door) — 離れて暮らす家族の「声をかけるタイミングがわかる」団らんビデオアプリ

**GDGoC Japan Hackathon 2026 (DF Hack26) 提出プロダクト**

![となりドア パイプラインイメージ](public/assets/pipeline.gif)

図の再生成：Windows の日本語フォントと Python 3.10 以上、Pillow（`python -m pip install Pillow`）を用意し、`python scripts/generate_pipeline_gif.py` を実行します。

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
- **Street View co-walk（MVP）**：通話ルーム内でガイドがプリセットの散歩を開始し、位置・パノラマ・向き・俯角・ズームを共有します。参加者は追従表示のみで、どの参加者も散歩を終了できます。ガイド切断時も停止し、通話映像は維持したまま通話ルームへ戻ります。自由検索とガイド引継ぎはMVPに含みません。

---

## 3. ローカルでのセットアップと実行方法

### 必要環境
- Node.js 20 以上

### 手順
```bash
# 1. 依存パッケージのインストール
npm ci

# 2. 環境変数の設定（省略時も100件の話題カード＆デモフォールバックで完全動作します）
cp .env.example .env
# .env 内の GEMINI_API_KEY に Google AI Studio の API キーを設定
# Street View co-walk を使う場合は GOOGLE_MAPS_BROWSER_API_KEY も設定

# 3. サーバー起動
npm start
```
起動後、ブラウザで `http://localhost:8080` を開くとすぐに利用できます。

### Street View co-walk の準備

1. Google Cloud Console で課金を有効にし、対象プロジェクトの **Maps JavaScript API** を有効化します。
2. Maps JavaScript API 専用のブラウザキーを作り、API制限を **Maps JavaScript API** のみにします。HTTP リファラー制限には `http://localhost:8080/*` と、実際に発行された Cloud Run ホストの `https://<実ホスト>/*` を登録します。
3. キーを `.env` の `GOOGLE_MAPS_BROWSER_API_KEY` に設定します。このキーはブラウザから見えるため、制限を必ず設定してください。`GEMINI_API_KEY` はサーバー専用で、ここには使いません。

キーが未設定、API読み込みに失敗、または Street View の画像が利用できない場合は、散歩機能を利用できない旨を表示し、既存のビデオ通話は続けます。実際の Maps API 認証と画像表示には利用者自身の有効な Maps キーが必要です。このリポジトリの変更だけでは実キーでの動作確認を示しません。

Street View のパノラマ表示は Google Maps Platform の **Dynamic Street View SKU** の課金対象です。無料利用上限と料金は変わるため、利用前に[Maps JavaScript API の使用量と課金](https://developers.google.com/maps/documentation/javascript/usage-and-billing)および[Google Maps Platform の料金一覧](https://developers.google.com/maps/billing-and-pricing/pricing)で最新条件を確認してください。ここでは金額や上限値を固定していません。

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
  --timeout 3600 \
  --concurrency 80 \
  --min-instances 1 \
  --max-instances 1 \
  --set-env-vars="GEMINI_MODEL=gemini-2.5-flash"
```
現実装はインメモリ状態のため、デモは最大1インスタンス・単一リビジョンで運用します。再起動時はドア状態・サーバー記録が失われます。セッションアフィニティだけでは端末間の状態共有を保証しません。

※ `GEMINI_API_KEY` は Google Cloud Secret Manager または Cloud Run 環境変数として安全に注入します。

Street View 用 `GOOGLE_MAPS_BROWSER_API_KEY` はブラウザへ配信される公開キーです。Cloud Run の環境変数で設定する場合も、Maps JavaScript API のみ・localhost と実 Cloud Run ホストの HTTP リファラーのみを許可する制限を設定してください。キー未設定でも通話機能を利用できます。

### Street View co-walk の実機確認

Cloud Run または localhost の実ブラウザ2台で、キーを設定したうえで以下を確認してください。Maps API とパノラマのライブ認証・画像表示はまだ確認済みとは扱いません。

- [ ] 片方が通話ルームからプリセットを選び散歩を開始できる
- [ ] ガイドの移動・パノラマ変更・heading / pitch / zoom がもう片方へ同期する
- [ ] フォロワーは移動操作できず、追従表示になる
- [ ] どちらの参加者からでも散歩を終了でき、通話映像を保ったまま通話ルームへ戻る
- [ ] ガイド端末が切断すると散歩が停止する
- [ ] キー未設定・無効キー・API読込失敗時もエラーでアプリや通話が停止しない
- [ ] Cloud Run は現行のインメモリ同期設計に合わせて単一インスタンスで運用する

MVPでは自由な場所検索とガイドの引継ぎを提供しません。

---

## 5. マルチエージェント開発体制と AI 活用記録

本プロジェクトは GDGoC Japan Hackathon 2026 の開発期間内（2026年11月5日〜11月10日）に、以下の AI エージェント協調体制で設計・実装・監査を行いました：
- **Antigravity**：全体統括、要件適合監査、100件の団らん話題カード（`public/data/topics.json`）作成、統合テスト・バグ検証
- **Codex CLI (`codex-sol6.1-high`)**：アーキテクチャ詳細設計（`ARCHITECTURE.md`）、Express + WebSocket + `@google/genai` バックエンド実装（`server/`）
- **Claude Code CLI (`opus-5.5-mid`)**：複数のドアが並ぶ入口UI、`-{アカウント名}-がくつろいでいます。` 気配プレート、ビデオ通話強制の団らんルームUI実装（`public/`）


## 動作範囲と検証

- 共同利用には Cloud Run 発行の HTTPS URL を使います。`firebase.json` は静的なひとりデモ専用です。同一ホストの `/ws` を使う現実装を Firebase Hosting に載せても、家族間同期・通話の構成にはなりません。
- アカウント名は認証ではありません。現状は全接続者でドアと記録を共有するデモです。家族ごとの認証・認可、Firestore等の永続化、TURN中継は未実装です。
- 初期在室者とCanvas映像はデモです。バーチャル映像から実際の顔色や安否は判断できません。手動の在室設定は切断後も保持され、オンライン表示とは異なります。
- 見守り要約に送るのは時間・実参加者名・話題・任意メモです。通話映像や音声の自動解析は行いません。AI失敗時またはメモがない場合、元気度は未評価です。
- `npm test` は実APIキーを使わず、HTTP/WSの入力検証・部屋移動・切断・満員、SDKの成功/不正出力/レート制限/タイムアウト、フロントのカメラ後始末・遅延応答を検証します。実ブラウザのWebRTC接続、カメラ権限、別ネットワークのNAT越えは別途実機確認が必要です。
