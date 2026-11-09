# 『となりドア (Tonari Door)』— プロジェクト引継ぎ資料 (HANDOVER.md)

**最終更新日時**：2026年11月10日 00:29 JST
**対象**：チームメンバー（`yoikoarmor(小沢司)`, `suzukimain(鈴木崇博)`）および後続のすべてのAIエージェント

> **最新状態（2026-11-10 GitHub反映済み）**：README・最終PDF・説明資料・表記整合を本体コミット `e1b4912` として `origin/main` へpush済み。本節はその結果追記。第13節参照。本番デプロイ操作は行っていない。

---

## 1. プロジェクト基本情報・重要リンク

| 項目 | 内容 |
|---|---|
| **大会名** | DevFest GDGoC Japan 2026 Hackathon (DF Hack26) — 東京会場 |
| **チーム名** | Generator-Critic |
| **メンバー** | **yoikoarmor(小沢司)、suzukimain(鈴木崇博)** |
| **アプリ名 / カテゴリ** | **「となりドア (Tonari Door)」** / **1. 医療・福祉** |
| **GitHub リポジトリ** | https://github.com/yoikoarmor/GDG-hackathon （本体変更 `e1b4912` はmainへpush済み。最新コミットは本資料の結果追記を含むgit logで確認） |
| **本番デプロイURL (Cloud Run)** | https://gdg-hackathon-752978143113.asia-northeast1.run.app/ |
| **ローカル実行URL** | `http://localhost:8080` （今回、常駐サーバーの起動状態は未確認。自動テストは別の一時ポートで実行） |
| **コードフリーズ・提出締切** | **2026年11月10日 19:00 JST（厳守）** |
| **Regional Day（URL維持期限）** | **2026年11月14日 終了まで**（デプロイURLを稼働維持すること） |

---

## 2. 現在のプロダクト仕様（2026-11-09 表記整合後）

現在の実装に合わせた説明。更新した文書・画面ラベル・図はまだ本番に反映していない。

1. **「4つのドア ＝ 4つの独立したビデオ通話ルームインスタンス」**：
   - ロビーにはシンプルに **4つのドア（① `chanoma`: 🍵 実家の茶の間、② `engawa`: 🌿 日当たりのいい縁側、③ `kitchen`: 🍲 夕暮れの台所・ダイニング、④ `hobby`: 🎨 みんなの趣味部屋）** が並ぶ。
   - **事前在室設定・気配抽出の完全廃止**：初期状態で誰かが常時いる設定や、カメラ静止画からの事前気配抽出（`POST /api/doors/:id/presence` / `analyzeDoorPresence`）は廃止。
   - 誰も入っていないドアは「`空室 — ノックして団らんを始める`（0人・消灯）」、誰かがノックして入室しているときだけ明かりが灯り、1人のときは **`-{アカウント名}-がくつろいでいます。`**、2人以上のときは **`-{先頭アカウント名}-ほか計N人が団らん中`** と表示される。
2. **メイン映像エリアは「実際に入ってきた相手」専用（「おばあちゃん（デモ）」シミュレーター完全廃止）**：
   - 団らんルーム内の大きなメイン映像枠（`#remoteStage`）から、旧「`-おばあちゃん-（デモ）` / `家族シミュレーター（デモ）`」を完全削除。
   - 1人入室時は待機カードを表示し、2人目以降の相手が同じドアに入室した瞬間に待機カードが消え、その相手のWebRTCカメラ映像が大きく映る（自動再生ブロック時の専用復帰UIは現在未実装）。
3. **団らん話題カード（100選抽選 ＋ Gemini生成［TBW］）＆ Gemini 安心見守りレポート**：
   - 100件の話題カードデッキ（`public/data/topics.json`）からのランダム抽選・同室者共有に対応。**Gemini による団らん話題カード生成はドキュメント・アーキテクチャ図上で `TBW` 表記**。
   - 退室時には **Gemini**（`GEMINI_API_KEY`。モデルは `GEMINI_MODEL` で設定）が「安心見守りレポート（元気度・様子・次回の話題提案）」を自動生成・保存する。

---

- モデル既定値は `gemini-2.5-flash`、本番ヘルスで確認した設定は `gemini-3.5-flash-lite`。Vertex AI経路は現在未対応。
- TURN設定取得・期限付き資格情報は実装済み。散歩の有効化フラグはなく、景色表示にはMapsキーが必要。
- 見守りノートはメモリ上に最大100件。家族認証・永続化は未実装。仮想カメラ参加では本人の顔は映らない。

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

---

## 5. 仕様継続確認（2026-11-09 21:17 JST）

### 確認範囲・結論

- ユーザー指定の必読資料を提示順に読み、GIFと生成スクリプト、関連ソース、テストを確認。確定要件の変更は指示されていないため、4ドア・事前気配抽出廃止・デモ人物廃止・Gemini話題生成TBWを今後も維持する。
- 調査開始時の作業ツリーはクリーン。ローカル `main` は `bba4b2857a8942dfc829523d1340ffa1c37f196c`。最初のfetchでは `origin/main` は `ebe2cb6`、調査中の追加更新後は `f699081edd7dcde51dbfbe4d353dd3ccd3886e5d` と確認した。5件の後続コミットにはアプリ復元とTURN接続追加が含まれ、ドキュメントは維持されているため、実装と説明に差が生じている。
- ローカルへの pull、アプリコードの変更、commit、push、デプロイは行っていない。今回のリポジトリ内の変更は本資料のみ。

### 確認済み事項と差分

| 項目 | 確認結果 |
|---|---|
| 4つの独立ドア・在室人数による点灯と文言 | ローカル・最新リモートの共通コードと自動テストで維持。本番 `GET /api/doors` も `chanoma`, `engawa`, `kitchen`, `hobby` の4件を返した。21:15には全て0人・消灯、21:17には茶の間と台所がそれぞれ1人・点灯・`-yoikoarmor-がくつろいでいます。`、残り2室は空室だった。今回のエージェントは本番へ入室していない |
| 相手専用映像枠・旧デモ人物の廃止 | ローカルと最新リモートで待機カード方式を維持。`simulatorTile` という既存DOM IDは残っているが、内容は家族の入室待機であり、デモ人物ではない |
| Gemini話題カード生成のTBW | UIの生成ボタンは無効・未実装表記。サービス関数とAPIは存在するため「コードも全くない」という意味ではない。最新リモートのGIF・生成スクリプトにはTBW表記がなく、実装済みに見える説明へ戻っている。`API_CONTRACT.md` にもTBWの注記がない |
| 廃止済みの事前気配抽出 | ローカルには関数・経路なし。最新リモートで `analyzeDoorPresence` と画像入力処理がサービス層に復活。ただし `server/index.js` は呼び出しておらず、`POST /api/doors/:id/presence` は最新リモートのローカルテストでも404。最新リモート・本番のGIFは廃止済みの静止画気配抽出フローを再掲載している |
| Geminiモデル | 確定資料は2.5 Flash。2026-11-09 21:15 JST の本番 `GET /api/health` は `geminiConfigured:true`, `model:"gemini-3.5-flash-lite"` を返した。これは設定の申告値であり、Gemini呼び出し成功を実証したものではない |
| Vertex AI対応 | ローカルには `GEMINI_VERTEX_PROJECT` / `GEMINI_VERTEX_LOCATION` 対応があるが、最新リモートでは削除されAPIキー経路のみ。提出資料・委託書の説明と不一致。本番バックエンドの全ソースとの同一性は未確認 |
| 自動再生ブロック時の復帰 | ローカルにはワンタップ復帰UIがある。最新リモートでは復帰ボタンと処理が削除されている。本番配信の `app.js` にも復帰ボタンの実装がない |
| 散歩機能 | ローカルは `ENABLE_SHARED_WALK=true` 指定時のみ有効。最新リモートはフラグ制御を削除。本番 `/api/walk-config` は `enabled` フィールドなし・行き先3件・キー設定ありを返し、現行契約書の一時無効仕様と不一致。キーの値は記録・提示していない |
| 本番とGitの一致・TURN | 調査中にTURN接続追加の `f699081` がリモートへ反映された。再照合により、本番のHTML・app.js・CSS・walk.js・topics.json・GIFの6ファイルは同コミットとハッシュ一致。本番 `/api/rtc-config` は200でICE設定2件を返し、同コミットにも対応する経路が存在する。コード上はSTUNと有効期限付きTURN資格情報に対応。資格情報の値は記録・提示していない。バックエンド全体の同一性と実際のTURN経由通信は未検証 |
| チーム表記 | 提出資料・README・委託書は `Generator-Critic` / `yoikoarmor(小沢司)、suzukimain(鈴木崇博)`。`AGENTS.md` と `package.json` のauthorには旧 `kaigunn_2020` が残っている。以後の正しい表記はユーザー指定を優先する |

### 検証結果・残る確認

- ローカル `bba4b28`：`npm test` 合格（表示上17件のPASS。内部でAPI、WebSocket、フロントエンド、散歩の回帰テストも実行）。
- リモート `ebe2cb6` と、その後追加された最新 `f699081`：作業ツリーを変更せず、それぞれ `git archive` の一時展開先で `npm test` 合格。依存定義とlockfileに差がないため、既存の `node_modules` を `NODE_PATH` で参照した。実際のGemini呼び出しはモックで置換され、有料APIは呼び出していない。
- 本番：HTTPSのGETによるヘルス・ドア・散歩・RTC設定と配信ファイルの比較を実施。静的テキストのハッシュはCRLF/LFを正規化、GIFはバイト列を比較。
- 資料更新後に `git diff --check` を実施し、更新行の末尾空白を修正。提出用コピー `handover.md` とリポジトリ内の本資料が同じ内容であることも確認する。
- 自動テストは上記の資料差分、未使用の気配抽出関数、Vertex AI経路、自動再生復帰UIの欠落を検出していない。合格だけで確定仕様の全項目に準拠しているとは判断しない。
- 実端末2台での映像・音声、ブラウザの自動再生制限、モバイル回線、実際のGemini生成、Maps課金設定、大会規定の外部原文は今回未検証。本番への入室・投稿・設定変更は行っていない。
- 次回変更時は、ユーザー指定の確定仕様と本番・リモートの差分を踏まえ、対象を決めて対応すること。廃止機能を復活させる根拠として古い `AGENTS.md` や復元されたGIFを用いない。

---

## 6. 再取得・比較（2026-11-09 21:24 JST）

- ユーザーの再比較依頼により `git fetch origin` を再実行。最新リモートは `f699081edd7dcde51dbfbe4d353dd3ccd3886e5d` のままで、前回確認時点から追加コミット・ファイル差分はない。ローカルは `bba4b28` のまま、5コミット後方。既存の本資料への未コミット変更を保持した。
- 本番をHTTPS GETで再取得（取得完了 `2026-11-09T12:24:59.503Z`）。HTML、app.js、styles.css、walk.js、topics.json、pipeline.gifの6ファイルは、すべて前回取得分とハッシュ一致し、最新リモート `f699081` とも一致した。
- 本番ヘルスは200、`ok:true`、`geminiConfigured:true`、`model:"gemini-3.5-flash-lite"` のまま。散歩設定は行き先3件・キー設定あり・`enabled` フィールドなし、RTC設定はICEサーバー2件で、前回から変化なし。キー・TURN資格情報の値は提示・記録していない。
- 在室状態は前回の茶の間・台所各1人から、今回の全4ドア0人・消灯・空室表示へ変化。これは動的な在室データの差であり、配信コード変更の証拠ではない。本エージェントからの本番入室は行っていない。
- 結論：第5節に記録した旧気配抽出関数・図の復活、図のTBW欠落、Vertex AI経路・自動再生復帰処理の削除、モデル設定・散歩契約・旧メンバー表記の不一致は引き続き残る。
- コードと依存定義に変更がないため `npm test` は再実行せず、前回の同一コミットに対する17項目合格を継承。今回の検証はリモート差分、本番レスポンスと配信ハッシュ、更新資料の `git diff --check` とコピー一致確認。実端末通話とGemini実生成は引き続き未検証。
- 今回のリポジトリ内の編集は `docs/HANDOVER.md` のみ。内容をチャット提示用の `outputs/handover.md` にも反映。

---

## 7. TBW表記の対象別再確認（2026-11-09 21:44 JST）

- ユーザーの「tbwになってない？」に対して再fetch・対象別の文字列照合を実施。`origin/main` は `f699081` のまま。
- **TBW表記あり**：最新リモートの `docs/PRODUCT_DOCUMENT.md`、`docs/PRODUCT_DOCUMENT.html`、`ARCHITECTURE.md` 本文とAPI表、`docs/agent_commission/02_SPEC_AND_ARCHITECTURE.md`。たとえば提出MDの23行目に「Gemini AI生成［TBW］」、アーキテクチャの60行目にもAPIをTBWとする記述がある。
- **画面も未実装扱い**：`public/index.html` の183行目は `disabled` 付きの「Geminiで今の話題を作る（未実装）」ボタン。TBWを完了扱いに変えた画面ではない。
- **ローカルの図もTBW表記あり**：ローカル `bba4b28` のGIF生成スクリプトには「AI話題カード生成 (Gemini): TBW」と「話題生成: TBW」がある。前回確認したローカルGIFにも同表記がある。
- **欠落を指摘した対象**：最新リモート `f699081` のGIF生成スクリプトでは「AI生成: POST /api/topics/generate」「気配・話題・要約」となり、TBW表記がない。同コミットのGIFも前回目視したとおり同じ説明。`API_CONTRACT.md` にもTBW注記がない。21:24時点の本番GIFはこのリモートGIFとハッシュ一致しているが、今回は本番を再取得していない。
- 説明の補足：前の「TBW表記欠落」は対象を限定して伝えるべきだった。**資料全体がTBWになっていないという意味ではなく、文章・画面は未実装扱い、図とAPI契約の一部だけ不統一**という状態。
- アプリや提出資料は変更せず、本資料のみ更新。コード変更がないためテスト再実行なし。更新後に `git diff --check` と提示用コピーの一致を確認。

---

## 8. 表記・記述の不一致一覧（2026-11-09）

### 調査基準

- 最新リモート：`f699081edd7dcde51dbfbe4d353dd3ccd3886e5d`。今回のfetchでも追加コミットなし。以下のパスと行番号はこのコミットを基準とし、ローカル `bba4b28` の行番号とは区別する。
- 原本リポジトリ：`C:\Users\yoiko\Downloads\GDG-hackathon`。作業ツリーを更新せず、同コミットの一時展開先で文書・ソースを照合した。
- 本番再取得：2026-11-09 21:46 JST。静的6ファイルは同コミットとハッシュ一致。ヘルスのモデル値は `gemini-3.5-flash-lite`。実際の生成成功を確認した値ではない。
- 「表記揺れ」「資料の旧記述」「仕様と実装の差」を分ける。後者は文章の置換だけでは解決しない。明示された確定要件を現状コードに合わせて勝手に変更しない。

### 確認済みの不一致：14分類

| ID / 種別 | 対照箇所（リポジトリ相対パス:行） | 食い違い | 整理方針 |
|---|---|---|---|
| 01 メンバー名 / 旧記述 | `AGENTS.md:8`、`package.json:20` ↔ `docs/PRODUCT_DOCUMENT.md:7`、委託書01 | 前者は `kaigunn_2020`、後者・ユーザー指定は `suzukimain(鈴木崇博)` と `yoikoarmor(小沢司)` | ユーザー指定の2名へ統一 |
| 02 話題生成の実装状態 / 資料内不統一 | `docs/PRODUCT_DOCUMENT.md:23`、`ARCHITECTURE.md:60`、`public/index.html:183` ↔ `API_CONTRACT.md:11`・`:50`、`AGENTS.md:27`、`scripts/generate_pipeline_gif.py:163`、`docs/PRODUCT_DOCUMENT.html:270` | 提出本文はTBW、画面は未実装・無効。一方、API契約・旧方針・GIF・HTMLの技術選定段落は、同じ留保なく生成機能を説明 | 対ユーザーの機能状態はTBWへ統一。内部APIとサービス関数が存在することは別記し、「コードが一切ない」とは書かない |
| 03 事前気配抽出 / 廃止説明と残存コード・図 | `ARCHITECTURE.md:31`、委託書02の12行目 ↔ `AGENTS.md:25`・`:59`、`scripts/generate_pipeline_gif.py:123`、`server/geminiService.js:90` | 廃止済みのはずが、旧方針とGIFには現役機能として残り、関数も存在 | 廃止を正とする。未使用関数の残存と利用可能な機能を区別。対応APIは最新コミットの既存テストで404 |
| 04 レポートの解析対象 / 旧説明 | `AGENTS.md:61`・`:91` ↔ `docs/PRODUCT_DOCUMENT.md:173`、`server/geminiService.js:161` | 「通話内容・表情から健康・様子」「視覚・音声」と、時間・参加者・話題・入力メモによる非医療的要約が混在 | 実際に送るデータを明示。顔・音声の解析や医療判断を実施済みと書かない |
| 05 Geminiモデル / 本番設定との不一致 | `API_CONTRACT.md:19`、`public/index.html:66`、`public/app.js:1724`、提出資料全般 ↔ 本番 `/api/health` | 文書・画面は2.5 Flash固定。本番の申告設定は `gemini-3.5-flash-lite`。サービス既定値2.5と環境変数で上書きされた実効値も異なる | 要件モデル・コード既定値・本番実効設定を区別。どちらに揃えるかはモデル変更の判断として扱う |
| 06 Vertex AI / 説明と実装の差 | `README.md:39`、`ARCHITECTURE.md:31`、`docs/PRODUCT_DOCUMENT.md:76`、HTML391行目 ↔ `server/geminiService.js:40` | 資料はAPIキー・Vertex AI両対応。最新コードはAPIキー指定で、ローカル旧版にあったVertex設定経路がない | 確定仕様を維持する場合は実装の復元も必要。文章だけで対応済みとは扱わない |
| 07 自動再生の復帰UI / 説明と実装の差 | `docs/PRODUCT_DOCUMENT.md:171`、HTML360行目、`ARCHITECTURE.md:33` ↔ `public/app.js:1058` | 「ワンタップで復帰可能」とあるが、最新コードは `video.play().catch(() => {})` で、復帰ボタン・処理がない | 説明と実装を合わせる必要あり。ローカル旧版には機能があるため、版の取り違えに注意 |
| 08 散歩の有効化条件 / 契約と実装の差 | `API_CONTRACT.md:59`、`ARCHITECTURE.md:63` ↔ `server/index.js:153`、本番 `/api/walk-config` | 契約はフラグで有効化・既定無効、`enabled` を返す。最新コードはフラグ条件なしで、実応答にも `enabled` がない | 契約の一時停止方針と現在の有効化方針を決めて整合させる |
| 09 TURN導入状況 / 将来計画の旧記述 | `docs/PRODUCT_DOCUMENT.md:179`、HTML380行目 ↔ `server/index.js:142`・`:148`、`public/app.js:23`、本番RTC設定 | 文書では今後の展望だが、最新コミットはTURN設定取得・期限付き資格情報に対応し、本番はICE設定2件 | 「TURN接続コード導入済み・実回線検証は未確認」を分ける。P2Pだけを描く構成図にもTURN経路の追記を検討 |
| 10 ホスティング / 計画と現状の混在 | `AGENTS.md:53`・`:54` ↔ `docs/PRODUCT_DOCUMENT.md:66`・`:70`、HTML224行目 | AGENTSはCloud Run・Firebaseとも採用予定。提出資料はCloud Run採用済み、Firebaseは静的ひとりデモ設定のみ | 本番の採用済み構成と任意のデモ設定を区別。Firestore同期もAGENTS62行目と現行インメモリ構成を混同しない |
| 11 環境変数名 / 表記揺れ | `docs/PRODUCT_DOCUMENT.md:109` ↔ 同79行目、`ARCHITECTURE.md:31` | Mermaidに `VERTEX_PROJECT`、本文には `GEMINI_VERTEX_PROJECT` | 設定名は `GEMINI_VERTEX_PROJECT` へ統一するのが既存要件。最新実装の未対応自体は06として別扱い |
| 12 レポート名 / 表記揺れ | `API_CONTRACT.md:12` ↔ `public/app.js:1643`、`docs/PRODUCT_DOCUMENT.md:173` | 「安心団らんレポート」と「安心見守りレポート」 | レポート名を「安心見守りレポート」、履歴画面を「安心見守りノート」に区別して統一 |
| 13 ドアのアイコン / 表記揺れ | `docs/PRODUCT_DOCUMENT.md:139`・`:155`・`:157`、HTML316行目 ↔ `server/index.js:21`・`:23` | 縁側は資料🌼・コード🌿。趣味部屋はMDの手順だけ🧶、他箇所・コードは🎨 | 縁側は確定資料とUIのどちらを採るか整理。趣味部屋は既定の🎨へ統一可能 |
| 14 引継ぎの版・稼働状態 / 旧メタ情報 | リモート `docs/HANDOVER.md:16`・`:18` ↔ 今回のGit状態 | リモート版は「最新origin/main同期済」「ローカル起動中」と記載。手元は5コミット後方、常駐起動は未確認 | ローカルの本資料では既に訂正済み。ただし未コミットで、リモートには反映されていない |

### 断定的な不一致に数えない明確化候補：2件

| ID | 箇所 | 明確化したい点 |
|---|---|---|
| N1 フォールバックの説明 | `docs/PRODUCT_DOCUMENT.md:76`、HTML244行目 ↔ `server/geminiService.js:130`・`:157` | 「100選デッキへフォールバック」は話題生成に対応。要約失敗時のレポート本体は時間・参加者・メモ等の簡易記録で、次回話題だけがデッキ由来。現記述は対象が曖昧なのでAPI別に分ける |
| N2 顔の確認と仮想カメラ | `docs/PRODUCT_DOCUMENT.md:56`・`:170`、HTML355行目 | バーチャル映像も許可するため、「カメラ常時ONなら顔色を確認できる」とは限らない。「実カメラ時は顔を確認でき、仮想カメラでの参加も可能」と条件を明示する |

### 今回の更新・検証

- 依頼は洗い出しのため、アプリ・提出資料・設定の原本を修正せず、本資料に結果を追記した。
- 文書横断検索、関連コードの該当行確認、本番GETと静的6ファイル照合を実施。コード変更・追加コミットがないためテスト再実行なし。前回の同コミットに対する17項目合格を参照する。
- 大会名称・期限・公式規則自体の外部原文検証は今回の範囲外。今回の一覧は、リポジトリ内と本番・ユーザー指定間で確認した不一致である。

## 9. プロダクト説明ドキュメントとの対照表・閲覧用コピー

MDとHTMLは共通の説明内容を持つが、完全に同文ではない。以下は最新リモート `f699081` の原文と、同じ版のコード・本番との比較。第8節のIDに対応する。

| 項目 | プロダクト説明の箇所 | 比較結果 |
|---|---|---|
| 基本機能 | MD169行目 / HTML350行目 | 4ドア・実入室者による点灯はコードと一致。本番再取得時も4ドアを確認 |
| 話題生成TBW | MD172行目 / HTML365行目 | 画面の未実装・無効ボタンと一致。ただし資料内で参照するGIF・API契約・AGENTSとは不一致（02） |
| HTMLだけの説明漏れ | MD88行目 / HTML270行目 | MDの技術選定段落には「通話中の生成はTBW」がある。同趣旨のHTML段落は留保がなく、現機能のように読める（02） |
| 図の内容 | MD94行目付近のGIF・Mermaid / HTML279行目付近のGIF | MDのMermaidは4ドア・TBW。参照先の最新GIFは静止画気配抽出・留保なしのAI話題生成を描き、本文と矛盾（02・03） |
| モデル | MD76行目 / HTML241行目、391行目 | 2.5 Flash表記に対し本番設定は3.5 Flash Lite（05） |
| Vertex AI | MD76行目・190行目 / HTML391行目 | 対応済みの記述に対し最新コードに該当経路なし（06） |
| 再生復帰 | MD171行目 / HTML360行目 | ワンタップ復帰の説明に対し最新コードにUI・処理なし（07） |
| TURN | MD179行目 / HTML380行目 | 今後の展望という記述に対しTURN設定取得・資格情報生成は導入済み。実回線検証は未確認（09） |
| 設定名 | MD109行目 | 図の `VERTEX_PROJECT` と本文の `GEMINI_VERTEX_PROJECT` が不統一（11） |
| アイコン | MD139行目・155行目・157行目 / HTML316行目 | 縁側🌼がコードの🌿と不一致。趣味部屋はMD手順だけ🧶で、サンプル・HTML・コードは🎨（13） |
| 解析データ | MD173行目 / HTML369行目 | 時間・参加者・話題・気づきメモを要約する説明は現在のサービス入力と一致。表情や録音のAI解析を行うAGENTSの旧説明とは不一致（04） |
| メンバー | MD7行目 / HTML132行目付近 | ユーザー指定の2名と一致。AGENTSとpackage.jsonの旧表記を直す対象（01） |

### ユーザー閲覧用

- `C:\Users\yoiko\Documents\Codex\2026-11-09\new-chat\outputs\product-document\docs\PRODUCT_DOCUMENT.md`
- `C:\Users\yoiko\Documents\Codex\2026-11-09\new-chat\outputs\product-document\docs\PRODUCT_DOCUMENT.html`
- 図も `outputs/product-document/public/assets/pipeline.gif` に同梱し、原文の相対参照を保った。MD・HTML・GIFの内容は最新リモート版のコピーで、修正案を混ぜていない。図には上記の古い説明が残っている。
- 提示コピーは元ファイルとのハッシュ一致、参照する図の存在を検証する。ブラウザでの印刷レイアウト確認は今回実施しない。

## 10. 現在の仕様への表記整合（2026-11-09）

ユーザーの「現在の仕様に合わせて直せる？」を受けて実施。第5〜9節は修正前の監査履歴として保持し、現在の説明を第2節と本節に更新した。

- 既存のHANDOVER追記を保持して `git merge --ff-only origin/main` を実施し、ローカルHEADを `bba4b28` から `f699081` へ更新。以後の変更は未コミット。
- 提出MD・HTML、README、AGENTS、API契約、設計書、委託書を現在の実装に合わせて整合。メンバー名・レポート名・ドアのアイコンを統一した。
- 話題生成は本文・API契約・HTML技術選定段落・GIFすべてTBW。画面ボタンは無効のまま、内部APIの存在とは区別して説明。
- 廃止済みの静止画気配抽出をGIFから除去し、4ドア→ノック入室→WebRTC/100選→要約という図に再生成。未使用の `analyzeDoorPresence` 関数がコードに残ることは設計書に明記し、機能を復活させていない。
- モデルは `GEMINI_MODEL` のコード既定値2.5と、本番ヘルスで確認した3.5 Flash Liteを分けて説明。画面の2.5固定ラベルを汎用のGemini表記に修正し、サーバー設定やモデルは変更していない。
- 現在未対応のVertex AIと再生復帰専用UIを実装済みとする記述を修正。散歩のフラグ条件・返却JSONは現行コードに整合。TURNは導入済み・実回線検証未実施とし、MermaidとGIFにも経路を反映。
- 要約の入力範囲、API別のフォールバック、仮想カメラで本人の顔が映らない点、メモリ保存と家族認証・永続化未対応を明記。環境変数例に空のTURN設定を追加し、実資格情報は書き込んでいない。
- `npm test` は17項目合格。GIF生成スクリプトのサイズ・32フレーム・400ms/フレーム・ループ確認に合格し、生成図を目視。HTMLの図参照・Markdownのコードフェンス・TBWの対象箇所・`git diff --check` を確認した。HTMLの印刷レイアウト、実端末通話、実Gemini生成、実TURN疎通は未検証。
- ユーザー向け説明MD・HTML・GIFと `handover.md` の提示コピーを更新。原本とのハッシュ一致も確認する。commit・push・本番デプロイは実施しておらず、本番の文言・GIFは旧版のまま。
- 残る実装課題は、TBW話題生成の公開、Vertex AI経路、再生復帰UI、未使用気配抽出関数の整理、実回線検証など。今回は表記を現実装に合わせる依頼のため、機能の追加・削除には踏み込んでいない。

## 11. プロダクト説明の文章改訂（2026年11月10日 00:15 JST）

- ユーザー指定により、目的へ「既存のビデオ通話とは違う体験として、家族が気軽に集まり団らんを過ごせる場所へ昇華させる」を追加。
- 対象ユーザーへ「日々、家族の様子を見に行くことに負担を感じている人」を追加。
- 第9節の旧3項目は削除し、必要・不要の取捨選択による設計の見直しと、Cloud Runでの公開・GitHub共同開発・AI利用時の設計不足から得た学びの2項目に置換。誇張した成長表現を避け、ユーザー原案の意味を保って整文した。
- 「現在の実装状態」節は提出用MD・HTMLから削除。README・設計書・委託書の技術情報は今回の対象外として保持。
- 変更対象は提出MD・HTMLと本資料のみ。既存の未コミット変更を保持。アプリコードの変更がないためnpm testは再実行せず、文面のMD/HTML一致、削除範囲、図参照、git diff --checkと閲覧コピーの一致で確認する。
- HTML・MD・図を閲覧用outputsへ再コピーし、handover.mdも更新。今回もcommit・push・本番デプロイは実施していない。

## 12. テンプレート準拠・最終PDF（2026年11月10日 00:22 JST）

- ユーザー提供の「プロダクト説明ドキュメントサンプル.pdf」全7ページを抽出・レンダリングして確認。表紙、必須項目1〜5、任意項目6〜7、採点外項目8〜9、罫線付きの本文・表という構成を採用した。
- 最終成果物：`docs/PRODUCT_DOCUMENT.pdf`。閲覧用は `outputs/となりドア_プロダクト説明ドキュメント.pdf`。A4相当596×842pt、7ページ、通常・太字の日本語フォントを埋め込み。
- テンプレートの例示プロダクト、架空アカウント、未採用技術は転用せず、となりドアの内容に置換。目的と対象ユーザーの追記、第9節の2つの学びは維持。「現在の実装状態」節は再追加していない。
- 全体をテンプレートの分量に合わせて簡潔に整え、アーキテクチャ図をA4で読める静止図 `public/assets/architecture_submission.png` に描き直した。4ドア、在室同期、WebRTC/TURN、100選・AI話題TBW、メモからのGemini要約を記載。アプリ用の既存pipeline.gifは保持。
- MD・HTMLも同じ内容データから更新し、編集可能な原稿として残した。通常のPDFでは図を静止表示する。テンプレートは入力フォームを持たないため、記入フォームとしては扱っていない。
- 検証：最終PDFの全7ページをPNG化して目視。文字切れ・重なり・表のページ跨ぎ・文字化けがないことを確認。ページ数、必要語句、例示用語と削除済み節の不在、MD/HTMLの図参照、コピー一致、git diff --checkを確認。アプリコード未変更のためnpm testは再実行していない。
- PDF・MD・HTML・図・本資料はローカル保存済み。commit・push・本番デプロイは未実施。第5〜9節の監査箇所と行番号は修正前の履歴で、最終提出資料の行番号ではない。

## 13. README改訂とGitHub反映（2026年11月10日 00:27 JST）

- ユーザーからリポジトリへのpushとREADME修正を明示的に依頼された。
- READMEに最終PDF・MD・HTML・設計書・API契約・HANDOVERへのリンクを追加。提出資料と同じ目的と対象ユーザーを追記し、構成図・2端末での確認方法・任意設定を整備した。
- 送信対象は既存の表記整合、最終PDF、説明MD/HTML、図、画面のGeminiラベル、チーム情報、環境変数の空欄例と本資料。バックエンド機能の変更・実資格情報の追加はない。
- fetch時点でリモートの追加コミットなし。通常のcommit・pushでmainへ反映済み。強制push・本番デプロイ操作は行っていない。
- 前回のnpm test 17項目合格と最終PDF全7ページの目視検証を参照。今回追加のREADMEについては相対リンクを検証し、コミット対象のパス・差分・git diff --checkを確認する。

### 反映結果

- 本体コミット：`e1b4912697974b25429d365e8ca8cfe5eaccd0e6`（`docs: finalize Tonari Door submission and align README`）。20ファイルを含み、最終PDFと静止図も追跡対象に追加した。
- `git push origin main` は成功し、リモートmainが `f699081` から `e1b4912` へ進んだことを確認。push後の作業ツリーはクリーンだった。
- `.gitattributes` でPDFをバイナリ指定。GitがPDF内部をテキストの空白違反として扱う問題を解消し、PDFのバイト列は変更していない。
- README相対リンク、指定した目的・対象ユーザーの文言、PDFコピー一致、ステージ済み差分の `git diff --check` は合格。
- この結果追記も別の文書コミットとして同じmainへ送信し、リモートHEADとの一致を最終確認する。アプリの追加改修・デプロイ操作はない。
