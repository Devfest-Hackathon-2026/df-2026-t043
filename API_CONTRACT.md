# 『となりドア (Tonari Door)』— フロントエンド・バックエンド共通仕様書 (API_CONTRACT.md)

本ドキュメントは、**Codex (`codex-sol6.1-high`)** が担当する構成詳細・サーバー実装 (`server/`, `ARCHITECTURE.md`) と、**Claude Code (`opus-5.5-mid`)** が担当するドアUI・団らんルームUI (`public/`) のインターフェースを厳密に統一するための契約仕様です。

---

## 1. 最重要プロダクト仕様（ユーザー指定事項）

1. **ドア越しの気配表示フォーマット（厳守）**
   - 各ドアのプレート・気配表示は、在室者がくつろいでいる際、必ず以下のフォーマットで表示すること：
     **`-{アカウント名}-がくつろいでいます。`**
   - 例：
     - `-おばあちゃん-がくつろいでいます。`
     - `-母（実家）-がくつろいでいます。`
     - `-kaigunn_2020-がくつろいでいます。`
     - `-yoikoarmor-がくつろいでいます。`
   - ユーザーが自分のアカウント名を入力・変更して「在室（くつろぎ中）」に設定すると、即座に該当ドアの表示が `-{入力したアカウント名}-がくつろいでいます。` に切り替わること。

2. **あえてビデオ通話を強制する「ビデオ会議の団らん化」**
   - ドアを開けて部屋（団らんルーム）に入るには、**カメラON（ビデオ通話）が必須**。
   - 実カメラが利用できないPCや、1人で動作確認・デモをする場合のために、**「デモ用バーチャルカメラ（Canvasアニメーションによる温かい在室映像シミュレーター）」**へのワンタップ自動/手動切替を備え、必ず「お互いの映像（顔・様子）が見える状態」で団らんルームに入室する体験を実現すること。

3. **話題カード（100件の初期デッキ ＋ Gemini API 生成）**
   - `public/data/topics.json` に収録された **100件の話題カード**からランダムにカードを引いて画面中央・サイドに温かく表示できること。
   - さらに「✨ Gemini で今の話題を作る」ボタンから `/api/topics/generate` を呼び出し、Gemini (`gemini-2.5-flash`) によるオリジナル話題生成も行えること。

---

## 2. REST API エンドポイント仕様 (`server/index.js`)

### `GET /api/health`
- レスポンス:
```json
{
  "ok": true,
  "service": "tonari-door-danran",
  "geminiConfigured": true,
  "model": "gemini-2.5-flash",
  "timestamp": "2026-11-07T12:00:00.000Z"
}
```

### `GET /api/doors`
- 初期状態で最低4つの温かいドアを返す：
  1. `chanoma`（「実家の茶の間」 / 初期在室: `おばあちゃん` → `-おばあちゃん-がくつろいでいます。`）
  2. `engawa`（「日当たりのいい縁側」 / 初期在室: `母（実家）` → `-母（実家）-がくつろいでいます。`）
  3. `kitchen`（「夕暮れの台所・ダイニング」 / 初期在室: `kaigunn_2020` → `-kaigunn_2020-がくつろいでいます。`）
  4. `hobby`（「みんなの趣味部屋」 / 初期在室: `yoikoarmor` → `-yoikoarmor-がくつろいでいます。`）
- レスポンス:
```json
{
  "doors": [
    {
      "id": "chanoma",
      "name": "実家の茶の間",
      "subtitle": "温かいお茶とテレビの音",
      "icon": "🍵",
      "theme": "warm-wood",
      "occupantAccount": "おばあちゃん",
      "mode": "relaxing",
      "statusText": "-おばあちゃん-がくつろいでいます。",
      "timingScore": "good",
      "timingLabel": "◎ 声をかけるのにぴったり",
      "aiDetail": "リビングでゆっくり過ごしています。今なら気兼ねなく話しかけられます。",
      "participantCount": 1,
      "participants": ["おばあちゃん"],
      "updatedAt": "2026-11-07T12:00:00.000Z"
    }
  ]
}
```

### `POST /api/doors/:id/presence`
- リクエスト Body:
```json
{
  "accountName": "yoikoarmor",
  "mode": "relaxing",
  "activityHint": "お茶を飲みながらひと休み中",
  "imageBase64": "data:image/jpeg;base64,..."
}
```
- 動作:
  - `statusText` を **`-${accountName}-がくつろいでいます。`** （`mode === "busy"` の場合でも基本フォーマットまたは補足付きでアカウント名を `-name-` 形式で明示、くつろぎ時は厳密に `-${accountName}-がくつろいでいます。`）に更新。
  - Gemini (`gemini-2.5-flash`) で `imageBase64` または `activityHint` から声かけタイミング (`timingScore`, `timingLabel`, `aiDetail`) を解析（APIキー未設定時はフォールバック解析）。
  - WebSocket 全クライアントへ `{ "type": "doors_update", "doors": [...] }` をブロードキャスト。

### `GET /api/topics/random`
- クエリ: `?category=...`（省略時は全100件からランダム1件）
- レスポンス:
```json
{
  "topic": {
    "id": 42,
    "category": "趣味・テレビ",
    "topic": "最近見ているお気に入りのドラマやバラエティ番組はある？",
    "hint": "同じ番組を見て次回感想を話す約束もできます"
  },
  "totalPool": 100,
  "source": "curated-100"
}
```

### `POST /api/topics/generate`
- リクエスト Body:
```json
{
  "accountName": "yoikoarmor",
  "partnerAccount": "おばあちゃん",
  "doorName": "実家の茶の間",
  "context": "久しぶりの週末の団らん"
}
```
- レスポンス:
  - Gemini (`gemini-2.5-flash`) が生成した話題カード（未設定・エラー時は100件からランダム選択してフォールバック）：
```json
{
  "topic": {
    "id": 101,
    "category": "Gemini おすすめ話題",
    "topic": "...",
    "hint": "..."
  },
  "source": "gemini"
}
```

### `POST /api/summary` ＆ `GET /api/logs`
- 退室時に団らんの時間・引いた話題カード・参加者から Gemini が「安心見守りサマリー」を生成して保存・返却する。

### `GET /api/walk-config`

共有散歩の行き先と、Maps JavaScript API 用のブラウザーキーを返す。キーは `GOOGLE_MAPS_BROWSER_API_KEY` から読み取り、未設定の場合は空文字を返す。公開先の HTTP リファラーと Maps JavaScript API に制限したキーを設定する。

```json
{
  "apiKey": "",
  "places": [
    { "id": "asakusa", "name": "浅草", "position": { "lat": 35.711, "lng": 139.796 } },
    { "id": "yokohama", "name": "横浜", "position": { "lat": 35.443, "lng": 139.649 } },
    { "id": "kyoto", "name": "京都", "position": { "lat": 35.003, "lng": 135.778 } }
  ]
}
```

---

## 3. WebSocket シグナリング・同期仕様 (`/ws`)

同一ポート (`ws://localhost:8080/ws` または `wss://.../ws`) で接続：
- クライアント → サーバー:
  - `{ "type": "join_lobby", "accountName": "yoikoarmor" }`
  - `{ "type": "knock_door", "doorId": "chanoma", "accountName": "yoikoarmor" }`
  - `{ "type": "enter_door", "doorId": "chanoma", "accountName": "yoikoarmor", "videoEnabled": true }`
  - `{ "type": "leave_door", "doorId": "chanoma", "accountName": "yoikoarmor" }`
  - `{ "type": "share_topic", "doorId": "chanoma", "topic": { ... }, "drawnBy": "yoikoarmor" }`
  - `{ "type": "webrtc_signal", "doorId": "chanoma", "targetId": "...", "payload": { ... } }`
- サーバー → クライアント:
  - `{ "type": "doors_update", "doors": [...] }`
  - `{ "type": "knock_notification", "doorId": "chanoma", "fromAccount": "yoikoarmor" }`
  - `{ "type": "room_state", "doorId": "chanoma", "selfId": "...", "participants": [...], "currentTopic": { ... }, "walk": null }`
  - `{ "type": "topic_shared", "doorId": "chanoma", "topic": { ... }, "drawnBy": "yoikoarmor" }`
  - `{ "type": "webrtc_signal", "doorId": "chanoma", "fromId": "...", "accountName": "...", "payload": { ... } }`

### 共有散歩

- `walk_start` は入室中のメンバーが `doorId` と設定済みの `placeId` を送る。開始した接続の `selfId` が案内役の `guideId` になる。部屋ごとに同時に一つの散歩を開始できる。
- `walk_update` は案内役が `doorId`、`sessionId`、`pano`、`position`、`pov`、`zoom` を送る。`pano` は 1〜512 文字。座標・視点・ズームは有限の数値で、緯度は −90〜90、経度は −180〜180、`heading` は 0〜360、`pitch` は −90〜90、`zoom` は 0〜5。受理した更新ごとに `revision` が 1 増える。案内役の同一セッションの更新は 100 ms に 1 件まで配信し、間隔を満たさない更新は破棄する。視点更新は毎分 900 件、通話などその他のメッセージは既存どおり毎分 300 件を上限とする。
- `walk_stop` は同じ部屋のメンバーが `doorId` と `sessionId` を送る。案内役が退室・切断した場合も散歩は終了する。
- 開始・更新・終了時に部屋全員へ `walk_state` を送る。途中で入室したメンバーは `room_state.walk` で最新状態を受け取る。開始時の `pano` は `null` で、終了後の `walk` は `null` になる。
- パノラマ ID の有効性はブラウザーのセッションに依存するため、同行側では `position` からもパノラマを取得できるようにする。[Maps JavaScript API の Street View リファレンス](https://developers.google.com/maps/documentation/javascript/reference/street-view)
- 別室からの操作と案内役以外による視点更新は `403`、使用中の部屋での再開始と古いセッションへの更新・終了は `409` を返す。

```json
{
  "type": "walk_state",
  "doorId": "chanoma",
  "walk": {
    "sessionId": "...",
    "guideId": "...",
    "placeId": "asakusa",
    "pano": null,
    "position": { "lat": 35.711, "lng": 139.796 },
    "pov": { "heading": 0, "pitch": 0 },
    "zoom": 1,
    "revision": 0
  }
}
```
