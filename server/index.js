'use strict';

require('dotenv').config();
const express = require('express');
const http = require('node:http');
const path = require('node:path');
const { randomUUID, randomInt } = require('node:crypto');
const { WebSocketServer, WebSocket } = require('ws');
const { generateDanranTopic, generateCareSummary, isGeminiConfigured, MODEL } = require('./geminiService');
const topics = require('../public/data/topics.json');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });
const clients = new Map();
const logs = [];
const rates = new Map();
const definitions = [
  ['chanoma', '実家の茶の間', '温かいお茶とテレビの音', '🍵', 'warm-wood'],
  ['engawa', '日当たりのいい縁側', 'ひだまりでのんびりひと休み', '🌿', 'sunny-green'],
  ['kitchen', '夕暮れの台所・ダイニング', 'ごはんの香りに誘われて', '🍲', 'sunset-orange'],
  ['hobby', 'みんなの趣味部屋', '好きなことを持ち寄ろう', '🎨', 'hobby-purple'],
];
const doors = new Map(definitions.map(([id, name, subtitle, icon, theme], index) => [id, {
  id, number: index + 1, name, subtitle, icon, theme, updatedAt: new Date().toISOString(),
}]));
const currentTopics = new Map();

function fail(message, status = 400) { const error = new Error(message); error.status = status; throw error; }
function record(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function field(value, name, max, required = false, multiline = false) {
  if (value === undefined && !required) return '';
  if (typeof value !== 'string' || value.length > max || (required && !value.trim()) || (multiline ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/ : /[\u0000-\u001f\u007f]/).test(value)) fail(`${name}が不正です。`);
  return value.trim();
}
function getDoor(id) { const door = doors.get(id); if (!door) fail('ドアが見つかりません。', 404); return door; }
function members(doorId) { return [...clients.values()].filter((client) => client.doorId === doorId); }
function doorList() {
  return [...doors.values()].map((door) => {
    // Each entered connection is a participant, even when display names match.
    const participants = members(door.id).map((client) => client.accountName);
    const statusText = participants.length === 0 ? '空室 — ノックして団らんを始める'
      : participants.length === 1 ? `-${participants[0]}-がくつろいでいます。`
        : `-${participants[0]}-ほか計${participants.length}人が団らん中`;
    return { ...door, participants, participantCount: participants.length, isOpen: participants.length > 0, statusText };
  });
}
function send(client, message) {
  if (client.ws.readyState !== WebSocket.OPEN) return;
  if (client.ws.bufferedAmount > 1024 * 1024) { client.ws.close(1013, 'Client too slow'); return; }
  client.ws.send(JSON.stringify(message));
}
function broadcast(message, recipients = clients.values()) { for (const client of recipients) send(client, message); }
function broadcastDoors() {
  const list = doorList();
  for (const client of clients.values()) send(client, { type: 'doors_update', clientId: client.id, doors: list });
}
function roomState(doorId) {
  const peers = members(doorId).map(({ id, accountName }) => ({ id, accountName, videoEnabled: true }));
  for (const client of members(doorId)) send(client, { type: 'room_state', doorId, selfId: client.id, participants: peers, currentTopic: currentTopics.get(doorId) || null });
}
function leave(client) {
  const previous = client.doorId;
  if (!previous) return;
  client.doorId = null;
  getDoor(previous).updatedAt = new Date().toISOString();
  if (!members(previous).length) currentTopics.delete(previous);
  roomState(previous);
  broadcastDoors();
}
function sameOrigin(origin, host) {
  if (!origin) return true; // Native clients and local CLI checks have no Origin header.
  try { const parsed = new URL(origin); return ['https:', 'http:'].includes(parsed.protocol) && parsed.host === host; } catch { return false; }
}
function topicCard(value) {
  if (!record(value) || !['string', 'number'].includes(typeof value.id) || (typeof value.id === 'number' && !Number.isFinite(value.id))) fail('話題カードが不正です。');
  if (String(value.id).length > 100) fail('話題IDが長すぎます。');
  return { id: value.id, category: field(value.category, 'category', 80, true), topic: field(value.topic, 'topic', 500, true), hint: field(value.hint, 'hint', 500) };
}
function rateLimit(req, res, next) {
  const now = Date.now();
  for (const [key, entry] of rates) if (entry.until <= now) rates.delete(key);
  const key = req.socket.remoteAddress; // Do not trust an arbitrary X-Forwarded-For header.
  let entry = rates.get(key);
  if (!entry) { if (rates.size >= 1000) return res.status(429).json({ error: '少し待ってからお試しください。' }); entry = { count: 0, until: now + 60_000 }; rates.set(key, entry); }
  if (++entry.count > 120) { res.set('Retry-After', String(Math.ceil((entry.until - now) / 1000))); return res.status(429).json({ error: '少し待ってからお試しください。' }); }
  next();
}
const asyncRoute = (fn) => (req, res, next) => Promise.resolve().then(() => fn(req, res)).catch(next);

app.disable('x-powered-by');
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (req.method === 'POST' && !sameOrigin(req.get('origin'), req.get('host'))) return res.status(403).json({ error: '許可されていない接続元です。' });
  next();
});
app.use('/api', express.json({ limit: '6mb' }));
app.use('/api', (req, res, next) => {
  if (req.method === 'POST' && !record(req.body)) return res.status(400).json({ error: 'JSONオブジェクトを送信してください。' });
  next();
});
app.get('/api/health', (req, res) => res.json({ ok: true, service: 'tonari-door-danran', geminiConfigured: isGeminiConfigured(), model: MODEL, timestamp: new Date().toISOString() }));
app.get('/api/doors', (req, res) => res.json({ doors: doorList() }));
app.get('/api/topics/random', (req, res, next) => {
  try {
    const category = field(req.query.category, 'category', 80);
    const pool = category ? topics.filter((topic) => topic.category === category) : topics;
    if (!pool.length) fail('指定カテゴリの話題が見つかりません。', 404);
    res.json({ topic: pool[randomInt(pool.length)], totalPool: pool.length, source: 'curated-100' });
  } catch (error) { next(error); }
});
app.post('/api/topics/generate', rateLimit, asyncRoute(async (req, res) => {
  const input = {};
  for (const [key, max] of Object.entries({ accountName: 80, partnerAccount: 80, doorName: 120, context: 2000 })) input[key] = field(req.body[key], key, max, false, key === 'context');
  res.json(await generateDanranTopic({ ...input, fallbackTopics: topics }));
}));
app.post('/api/summary', rateLimit, asyncRoute(async (req, res) => {
  const doorName = field(req.body.doorName, 'doorName', 120);
  const notes = field(req.body.notes, 'notes', 4000, false, true);
  const durationSec = req.body.durationSec === undefined ? 0 : req.body.durationSec;
  if (typeof durationSec !== 'number' || !Number.isFinite(durationSec) || durationSec < 0 || durationSec > 86400) fail('durationSecが不正です。');
  const participants = req.body.participants === undefined ? [] : req.body.participants;
  const topicsUsed = req.body.topicsUsed === undefined ? [] : req.body.topicsUsed;
  if (!Array.isArray(participants) || participants.length > 20 || !Array.isArray(topicsUsed) || topicsUsed.length > 100) fail('参加者または話題の一覧が不正です。');
  const names = participants.map((item) => field(record(item) ? item.accountName : item, 'participant', 80, true));
  const used = topicsUsed.map((item) => record(item) ? topicCard(item) : field(item, 'topicsUsed', 500, true));
  const summary = await generateCareSummary({ doorName, participants: names, durationSec, topicsUsed: used, notes });
  const log = { id: randomUUID(), doorName, participants: names, durationSec, topicsUsed: used, ...summary };
  logs.unshift(log);
  logs.length = Math.min(logs.length, 100);
  res.json({ summary: log, source: summary.source });
}));
app.get('/api/logs', (req, res) => res.json({ logs }));
app.use('/api', (req, res) => res.status(404).json({ error: 'APIが見つかりません。' }));
app.use(express.static(path.join(__dirname, '..', 'public'), { dotfiles: 'deny' }));
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = error.type === 'entity.too.large' ? 413 : error.status >= 400 && error.status < 500 ? error.status : 500;
  res.status(status).json({ error: error.type === 'entity.parse.failed' ? 'JSONの形式が不正です。' : status === 413 ? '送信データが大きすぎます。' : status === 500 ? '処理に失敗しました。もう一度お試しください。' : error.message });
});

server.on('upgrade', (req, socket, head) => {
  if (req.url !== '/ws') { socket.end('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n'); return; }
  if (!sameOrigin(req.headers.origin, req.headers.host)) { socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); return; }
  if (clients.size >= 100) { socket.end('HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n'); return; }
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws));
});
wss.on('connection', (ws) => {
  const client = { ws, id: randomUUID(), accountName: '', doorId: null, alive: true, count: 0, window: Date.now() };
  clients.set(client.id, client);
  send(client, { type: 'doors_update', clientId: client.id, doors: doorList() });
  ws.on('pong', () => { client.alive = true; });
  ws.on('error', () => { /* close handles room cleanup; no sensitive payload logging */ });
  ws.on('close', () => { leave(client); clients.delete(client.id); });
  ws.on('message', (data, isBinary) => {
    let message;
    try {
      if (Date.now() - client.window >= 60_000) { client.count = 0; client.window = Date.now(); }
      if (++client.count > 300) { ws.close(1008, 'Too many messages'); return; }
      if (isBinary) fail('JSONテキストを送信してください。');
      try { message = JSON.parse(data.toString()); } catch { fail('JSONの形式が不正です。'); }
      if (!record(message)) fail('メッセージが不正です。');
      if (message.type === 'join_lobby') {
        const name = field(message.accountName, 'accountName', 80, true);
        leave(client); client.accountName = name;
        send(client, { type: 'doors_update', clientId: client.id, doors: doorList() });
        return;
      }
      const door = getDoor(field(message.doorId, 'doorId', 80, true));
      if (message.type === 'enter_door') {
        const name = field(message.accountName, 'accountName', 80, true);
        if (message.videoEnabled !== true) fail('カメラをONにして入室してください。');
        if (client.doorId !== door.id && members(door.id).length >= 8) fail('部屋が満員です。');
        if (client.doorId !== door.id) leave(client);
        client.accountName = name; client.doorId = door.id;
        door.updatedAt = new Date().toISOString();
        roomState(door.id); broadcastDoors();
      } else if (message.type === 'knock_door') {
        const name = field(message.accountName, 'accountName', 80, true);
        broadcast({ type: 'knock_notification', doorId: door.id, fromAccount: name, fromId: client.id });
      } else if (message.type === 'leave_door') {
        if (client.doorId && client.doorId !== door.id) fail('入室中のドアを指定してください。');
        leave(client);
        send(client, { type: 'room_state', doorId: door.id, selfId: client.id, participants: [], currentTopic: null });
      } else if (message.type === 'share_topic') {
        if (client.doorId !== door.id) fail('入室していません。', 403);
        const topic = topicCard(message.topic);
        currentTopics.set(door.id, topic);
        broadcast({ type: 'topic_shared', doorId: door.id, topic, drawnBy: client.accountName, fromId: client.id }, members(door.id));
      } else if (message.type === 'webrtc_signal') {
        if (client.doorId !== door.id) fail('入室していません。', 403);
        const target = clients.get(field(message.targetId, 'targetId', 80, true));
        if (!target || target.id === client.id || target.doorId !== door.id) fail('同じ部屋の接続先を指定してください。', 403);
        if (!record(message.payload)) fail('シグナリングデータが不正です。');
        send(target, { type: 'webrtc_signal', doorId: door.id, fromId: client.id, accountName: client.accountName, payload: message.payload });
      } else fail('未対応のメッセージです。');
    } catch (error) {
      send(client, { type: 'error', requestType: typeof message?.type === 'string' ? message.type : undefined, code: error.status || 400, message: error.status === 500 ? '処理に失敗しました。' : error.message });
    }
  });
});
const heartbeat = setInterval(() => {
  for (const client of clients.values()) {
    if (!client.alive) { client.ws.terminate(); continue; }
    if (client.ws.readyState === WebSocket.OPEN) { client.alive = false; client.ws.ping(); }
  }
}, 30_000);
heartbeat.unref();
server.on('close', () => { clearInterval(heartbeat); wss.close(); });

if (require.main === module) {
  const PORT = process.env.PORT || 8080;
  server.listen(PORT, '0.0.0.0', () => console.log(`Tonari Door listening on port ${PORT}`));
  const shutdown = () => {
    for (const client of clients.values()) client.ws.close(1001, 'Server restarting');
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 8000).unref();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

module.exports = { app, server };
