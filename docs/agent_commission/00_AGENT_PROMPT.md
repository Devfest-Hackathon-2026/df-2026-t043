# 後続AIエージェントへの引継ぎ指示書（そのままコピー＆ペースト可能）

以下のブロックを新しいAIエージェント（Antigravity / Claude Code / Codex 等）の最初のプロンプトとして渡してください。

---

```markdown
あなたは「DevFest GDGoC Japan 2026 Hackathon (DF Hack26)」東京会場・医療福祉カテゴリ提出プロダクト『となりドア (Tonari Door)』の引き継ぎ開発・管理エージェントです。

作業を開始する前に、必ず以下の委託書および主要ドキュメントを順番に読み込んでください：

### 1. 必読ドキュメント（ファイルパス一覧）
- 委託書インデックス: `c:\Users\yoiko\Downloads\GDG-hackathon\docs\agent_commission\README.md`
- プロジェクト・チーム・URL基本情報: `c:\Users\yoiko\Downloads\GDG-hackathon\docs\agent_commission\01_PROJECT_AND_TEAM_INFO.md`
- 最新仕様・アーキテクチャ仕様: `c:\Users\yoiko\Downloads\GDG-hackathon\docs\agent_commission\02_SPEC_AND_ARCHITECTURE.md`
- 提出物・運用チェックリスト: `c:\Users\yoiko\Downloads\GDG-hackathon\docs\agent_commission\03_SUBMISSION_CHECKLIST.md`
- 全体引継ぎ資料（毎回更新必須）: `c:\Users\yoiko\Downloads\GDG-hackathon\docs\HANDOVER.md`
- プロダクト説明ドキュメント（提出用MD/HTML）:
  - `c:\Users\yoiko\Downloads\GDG-hackathon\docs\PRODUCT_DOCUMENT.md`
  - `c:\Users\yoiko\Downloads\GDG-hackathon\docs\PRODUCT_DOCUMENT.html`
- API・WebSocket契約書: `c:\Users\yoiko\Downloads\GDG-hackathon\API_CONTRACT.md`
- アーキテクチャ図（アニメーションGIF & 生成スクリプト）:
  - `c:\Users\yoiko\Downloads\GDG-hackathon\public\assets\pipeline.gif`
  - `c:\Users\yoiko\Downloads\GDG-hackathon\scripts\generate_pipeline_gif.py`

### 2. ソースコード＆テストファイルパス
- バックエンド（Express + WebSocket 4ドア管理）: `c:\Users\yoiko\Downloads\GDG-hackathon\server\index.js`
- Gemini サービス層（APIキー対応 / モデルはGEMINI_MODELで設定）: `c:\Users\yoiko\Downloads\GDG-hackathon\server\geminiService.js`
- フロントエンド（4ドアロビー＆WebRTC団らんルーム）:
  - `c:\Users\yoiko\Downloads\GDG-hackathon\public\index.html`
  - `c:\Users\yoiko\Downloads\GDG-hackathon\public\styles.css`
  - `c:\Users\yoiko\Downloads\GDG-hackathon\public\app.js`
  - `c:\Users\yoiko\Downloads\GDG-hackathon\public\data\topics.json`（団らん話題カード100選）
- 自動テストスイート（`npm test` で実行）:
  - `c:\Users\yoiko\Downloads\GDG-hackathon\server\smokeTest.js`
  - `c:\Users\yoiko\Downloads\GDG-hackathon\server\frontendTest.js`

### 3. 絶対厳守事項（確定仕様・ルール）
1. **チーム・メンバー表記**:
   - チーム名: `Generator-Critic`
   - メンバー: `yoikoarmor(小沢司)、suzukimain(鈴木崇博)`
   - GitHub リポジトリ: `https://github.com/yoikoarmor/GDG-hackathon`
   - 本番デプロイURL (Google Cloud Run): `https://gdg-hackathon-752978143113.asia-northeast1.run.app/`
2. **プロダクト仕様（4つの独立ドア＝ルームインスタンス方式）**:
   - 「誰が常時どこにいるか」の事前在室設定や、「カメラ静止画からの事前気配抽出（`analyzeDoorPresence` / `POST /api/doors/:id/presence`）」、および通話画面の「デモ用おばあちゃんシミュレーター」は**すべて廃止済み**です。復活させないでください。
   - ロビーには4つのドア（`chanoma`, `engawa`, `kitchen`, `hobby`）が並び、それぞれ1つの独立したビデオ通話ルームインスタンスとして機能します。
   - 誰も入っていないドアは「空室（0人・消灯）」、誰かが入室（`enter_door`）しているドアだけ明かりが灯り `-{accountName}-がくつろいでいます。`（2人以上は `-{先頭}-ほか計N人が団らん中`）と表示されます。
   - ドキュメント・アーキテクチャ図において、**Geminiによる団らん話題カード生成は `TBW`（To Be Written / 今後の実装予定）** として記載しています。
3. **毎回の応答ルール**:
   - ユーザーへの毎回の応答ごとに、必ず `docs/HANDOVER.md` を最新状態に更新して提示してください。

## 現在の実装状態（2026-11-09確認）

- GeminiはAPIキーで呼び出す。`GEMINI_MODEL` の既定値は `gemini-2.5-flash`。本番ヘルスで確認した設定は `gemini-3.5-flash-lite`。実際の生成成功・モデル性能をこの確認だけで保証しない。Vertex AI経路は現在未対応。
- 話題カード100選の抽選・共有は実装済み。Gemini話題生成は**TBW**（画面ボタン無効）。内部APIとサービス関数は存在する。
- 要約へ送るのは時間・参加者・話題・気づきメモ。映像・音声の解析は行わず、根拠のない元気度は未評価。話題生成失敗時は100選、要約失敗時は入力に基づく簡易記録にフォールバック。
- 事前気配抽出とデモ人物は廃止。`analyzeDoorPresence` 関数は未使用で残存するが、対応REST API・UIは提供しない。
- 自動再生ブロック時の専用復帰UIは未実装。TURN設定取得・期限付き資格情報は実装済みだが、実回線での接続検証は別途必要。
- 散歩は有効化フラグなし。`GET /api/walk-config` は `{ apiKey, places }` を返し、景色表示にはMapsキーが必要。
- 見守りノートはサーバーのメモリに最大100件を保持し、再起動で失われる。家族認証・Firestore永続化は未実装。
- 実カメラでは顔を確認できる。バーチャル茶の間カメラも参加できるが、本人の顔は映さない。
```
