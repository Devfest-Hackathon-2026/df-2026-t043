# 『となりドア (Tonari Door)』— 新方針・共通インターフェース仕様書 (API_CONTRACT.md)

## 1. 新しいプロダクト方針（2026-11-09 方針変更）

- **「誰が常時どこにいる」という事前在室設定を廃止**：
  - 初期状態で特定の人物（おばあちゃん等）が常時ドアの中にいる設定や、ロビーでの「ここでくつろぐ」「カメラで事前気配更新」コントロールをなくし、シンプルで直感的な設計にする。
- **「4つのドア ＝ 4つの独立したビデオ通話ルームインスタンス」**：
  - ロビーには4つのドア（`chanoma`: 茶の間、`engawa`: 縁側、`kitchen`: ダイニング、`hobby`: 趣味部屋）が並ぶ。
  - 誰も入っていないドアは「空室（すぐ入れます / 0人）」。
  - 誰かがドアを開けて入室（`enter_door`）している間だけ、そのドアインスタンスに明かりが灯り、現在その部屋に入っているメンバー（例：`1人入室中：-yoikoarmor-がくつろいでいます。`）がリアルタイム表示される。
  - 同じドアに入った人同士で、即座に **WebRTC ビデオ通話（カメラ常時ON：実カメラ or バーチャル茶の間カメラ）** と **団らん話題カード（100選ランダム ＋ Gemini 2.5 Flash 生成）** が共有される。
  - 退室時には、そのドアインスタンスでの団らん内容を Gemini 2.5 Flash が「安心団らんレポート」として要約・記録する。

---

## 2. REST API エンドポイント仕様 (`server/index.js`)

### `GET /api/health`
- `{ ok: true, service: "tonari-door-danran", geminiConfigured: boolean, model: "gemini-2.5-flash", timestamp: string }`

### `GET /api/doors`
- 4つのドアインスタンスの現在のリアルタイム入室状況を返す（誰も入室していない初期状態では `participants: []`, `participantCount: 0`, `isOpen: false`）：
```json
{
  "doors": [
    {
      "id": "chanoma",
      "number": 1,
      "name": "実家の茶の間",
      "subtitle": "温かいお茶とテレビの音",
      "icon": "🍵",
      "theme": "warm-wood",
      "participants": [],
      "participantCount": 0,
      "statusText": "空室 — ノックして団らんを始める",
      "updatedAt": "2026-11-09T10:00:00.000Z"
    }
  ]
}
```
- **誰かが入室中（`participants.length > 0`）のときの `statusText`**：
  - 1人入室中：`-${participants[0]}-がくつろいでいます。`
  - 複数人入室中：`-${participants[0]}-ほか計${participants.length}人が団らん中`

### `GET /api/topics/random`
- `public/data/topics.json`（全100件）からランダムに1件返す。`?category=...` で絞り込み可能。

### `POST /api/topics/generate`
- Body: `{ accountName, partnerAccount, doorName, context }`
- Gemini (`gemini-2.5-flash`) で団らん話題カードを1件生成（未設定・エラー時は100選からフォールバック）。

### `POST /api/summary` ＆ `GET /api/logs`
- 退室時にそのドアインスタンスでの通話時間・参加者・引いた話題カード・メモから Gemini (`gemini-2.5-flash`) が団らんレポートを生成・保存する。

### `GET /api/walk-config`

共有散歩の行き先と、Maps JavaScript API 用のブラウザーキーを返す。キーは `GOOGLE_MAPS_BROWSER_API_KEY` から読み取り、未設定の場合は空文字を返す。公開先の HTTP リファラーと Maps JavaScript API に制限したキーを設定する。

`ENABLE_SHARED_WALK=true` のときだけ有効。無効時は `{"enabled":false,"apiKey":"","places":[]}` を返し、散歩用 WebSocket メッセージは 403 で拒否する。

```json
{
  "enabled": true,
  "apiKey": "",
  "places": [
    { "id": "asakusa", "name": "浅草", "position": { "lat": 35.711, "lng": 139.796 } },
    { "id": "yokohama", "name": "横浜", "position": { "lat": 35.443, "lng": 139.649 } },
    { "id": "kyoto", "name": "京都", "position": { "lat": 35.003, "lng": 135.778 } }
  ]
}
```

---

## 3. WebSocket シグナリング・ルームインスタンス仕様 (`/ws`)

4つのドア（`chanoma`, `engawa`, `kitchen`, `hobby`）をそれぞれ独立したルームインスタンスとして扱う。

- クライアント → サーバー:
  - `{ "type": "join_lobby", "accountName": "yoikoarmor" }`
  - `{ "type": "knock_door", "doorId": "chanoma", "accountName": "yoikoarmor" }`
  - `{ "type": "enter_door", "doorId": "chanoma", "accountName": "yoikoarmor", "videoEnabled": true }`
  - `{ "type": "leave_door", "doorId": "chanoma", "accountName": "yoikoarmor" }`
  - `{ "type": "share_topic", "doorId": "chanoma", "topic": { ... }, "drawnBy": "yoikoarmor" }`
  - `{ "type": "webrtc_signal", "doorId": "chanoma", "targetId": "...", "payload": { ... } }`
- サーバー → クライアント:
  - `{ "type": "doors_update", "clientId": "...", "doors": [...] }`（入退室のたびに全クライアントへ各ドアの現在入室メンバー・人数を即時配信）
  - `{ "type": "knock_notification", "doorId": "chanoma", "fromAccount": "yoikoarmor", "fromId": "..." }`
  - `{ "type": "room_state", "doorId": "chanoma", "selfId": "...", "participants": [...], "currentTopic": { ... }, "walk": null }`
  - `{ "type": "topic_shared", "doorId": "chanoma", "topic": { ... }, "drawnBy": "yoikoarmor", "fromId": "..." }`
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
