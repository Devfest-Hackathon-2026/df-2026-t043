/**
 * となりドア (Tonari Door) — 統括エージェント用 自動監査・スモークテスト
 * - 100件の話題カードデータの検証
 * - サーバーAPIエンドポイントと `-{アカウント名}-がくつろいでいます。` フォーマットの検証
 * - フロントエンドファイル存在・必須要素の検証
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { WebSocket } = require('ws');
const check = require('node:assert/strict');
// Never read a developer's real key or make a paid API call in npm test.
process.env.GEMINI_API_KEY = 'your_gemini_api_key_here';
const sdk = require('@google/genai');
let generate = async () => { throw new Error('Mock unavailable'); };
require.cache[require.resolve('@google/genai')].exports = {
  ...sdk, GoogleGenAI: class { constructor() { this.models = { generateContent: (...args) => generate(...args) }; } },
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(`❌ ASSERTION FAILED: ${message}`);
  }
  console.log(`✅ PASS: ${message}`);
}

async function fetchJson(baseUrl, urlPath, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, baseUrl);
    const req = http.request(
      url,
      {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(raw) });
          } catch (e) {
            resolve({ status: res.statusCode, raw });
          }
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(5000, () => req.destroy(new Error('HTTP test timeout')));
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runAudit() {
  console.log('=== となりドア (Tonari Door) 自動監査・スモークテスト開始 ===');

  // 1. 100件の話題カード検証
  const topicsPath = path.join(__dirname, '..', 'public', 'data', 'topics.json');
  assert(fs.existsSync(topicsPath), 'public/data/topics.json が存在すること');
  const topics = JSON.parse(fs.readFileSync(topicsPath, 'utf8'));
  assert(Array.isArray(topics) && topics.length === 100, `話題カードが100件収録されていること (実際: ${topics.length}件)`);
  check.equal(new Set(topics.map((t) => t.id)).size, 100);
  for (const t of topics) for (const field of ['category', 'topic', 'hint']) check.equal(typeof t[field], 'string');

  // 2. フロントエンドファイルの存在確認
  for (const rel of ['public/index.html', 'public/styles.css', 'public/app.js']) {
    const full = path.join(__dirname, '..', rel);
    assert(fs.existsSync(full), `${rel} が存在すること`);
  }

  // 3. バックエンドサーバーの起動とAPIテスト
  const serverModule = require('./index.js');
  const server = serverModule.server || serverModule.app || serverModule;
  const listener = await new Promise((resolve) => {
    if (typeof server.listen === 'function' && !server.listening) {
      const s = server.listen(0, () => resolve(s));
    } else {
      resolve(server);
    }
  });

  const addr = listener.address();
  const baseUrl = `http://127.0.0.1:${addr.port}`;

  try {
    const health = await fetchJson(baseUrl, '/api/health');
    assert(health.status === 200 && health.data.ok === true, 'GET /api/health が正常応答すること');

    const doorsRes = await fetchJson(baseUrl, '/api/doors');
    assert(doorsRes.status === 200 && Array.isArray(doorsRes.data.doors) && doorsRes.data.doors.length >= 3, 'GET /api/doors が複数ドアを返すこと');

    const firstDoor = doorsRes.data.doors[0];
    check.deepEqual(doorsRes.data.doors.map((d) => d.id), ['chanoma', 'engawa', 'kitchen', 'hobby']);
    for (const door of doorsRes.data.doors) {
      check.deepEqual(door.participants, []);
      check.equal(door.participantCount, 0);
      check.equal(door.isOpen, false);
      check.match(door.statusText, /空室/);
    }
    assert(true, '初期4ドアがすべて空室であること');
    check.equal((await fetchJson(baseUrl, '/api/doors/chanoma/presence', { method: 'POST', body: { accountName: 'test' } })).status, 404);

    const randTopic = await fetchJson(baseUrl, '/api/topics/random');
    assert(randTopic.status === 200 && randTopic.data.topic && randTopic.data.topic.topic, 'GET /api/topics/random がランダム話題カードを返すこと');

    const genTopic = await fetchJson(baseUrl, '/api/topics/generate', {
      method: 'POST',
      body: { accountName: 'yoikoarmor', partnerAccount: 'おばあちゃん', doorName: '実家の茶の間' },
    });
    assert(genTopic.status === 200 && genTopic.data.topic && genTopic.data.topic.topic, 'POST /api/topics/generate が話題カードを返すこと');

    const summaryRes = await fetchJson(baseUrl, '/api/summary', {
      method: 'POST',
      body: {
        doorId: firstDoor.id,
        doorName: firstDoor.name,
        participants: ['yoikoarmor', 'おばあちゃん'],
        durationSec: 420,
        topicsUsed: [randTopic.data.topic.topic],
      },
    });
    assert(summaryRes.status === 200 && summaryRes.data.summary, 'POST /api/summary が安心見守りレポートを生成すること');

    await regressionTests(baseUrl, topics);
    await require('./frontendTest').runFrontendTests();

    console.log('🎉 すべてのスモークテスト・要件監査に合格しました！');
  } finally {
    await new Promise((resolve) => listener.close(resolve));
  }
}

if (require.main === module) {
  runAudit().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

function socketClient(baseUrl) {
  const ws = new WebSocket(baseUrl.replace('http:', 'ws:') + '/ws');
  const inbox = [];
  const waiters = [];
  ws.on('message', (raw) => {
    const msg = JSON.parse(raw);
    const i = waiters.findIndex((w) => w.predicate(msg));
    if (i < 0) inbox.push(msg);
    else { const w = waiters.splice(i, 1)[0]; clearTimeout(w.timer); w.resolve(msg); }
  });
  const next = (predicate) => {
    const i = inbox.findIndex(predicate);
    if (i >= 0) return Promise.resolve(inbox.splice(i, 1)[0]);
    return new Promise((resolve, reject) => {
      const w = { predicate, resolve, timer: setTimeout(() => reject(new Error('WS test timeout')), 3000) };
      waiters.push(w);
    });
  };
  return { ws, next, send: (m) => ws.send(JSON.stringify(m)), clear: () => { inbox.length = 0; }, close: () => {
    for (const w of waiters) clearTimeout(w.timer);
    return new Promise((resolve) => { if (ws.readyState === WebSocket.CLOSED) resolve(); else { ws.once('close', resolve); ws.terminate(); } });
  } };
}

async function regressionTests(baseUrl, topics) {
  const post = (url, body, headers) => fetchJson(baseUrl, url, { method: 'POST', body, headers });
  check.equal((await post('/api/summary', [])).status, 400);
  check.equal((await post('/api/topics/generate', {}, { Origin: 'https://evil.example' })).status, 403);
  check.equal((await fetchJson(baseUrl, '/api/topics/random?category=missing')).status, 404);
  for (const durationSec of [-1, '2', 86401]) check.equal((await post('/api/summary', { durationSec })).status, 400);
  const multiline = await post('/api/summary', { notes: '一行目\n二行目\tメモ', durationSec: 0 });
  check.equal(multiline.status, 200);
  check.equal(multiline.data.summary.vitalityScore, null);
  check.match(multiline.data.summary.mood, /未評価/);
  check.equal((await post('/api/topics/generate', { context: 'first\nsecond' })).status, 200);
  assert(true, 'HTTP入力検証・改行メモ・未評価フォールバック');

  const service = require('./geminiService');
  process.env.GEMINI_API_KEY = 'mock-only';
  try {
    generate = async () => ({ text: JSON.stringify({ category: 'AI', topic: '話題', hint: 'ヒント' }) });
    check.equal((await service.generateDanranTopic()).source, 'gemini');
    generate = async () => ({ text: JSON.stringify({ title: '記録', vitalityScore: 5, mood: 'メモからの記録', highlights: ['時間', '話題'], nextTopicSuggestion: '次の話題' }) });
    check.equal((await service.generateCareSummary()).vitalityScore, null);
    check.equal((await service.generateCareSummary({ notes: '会話メモ' })).vitalityScore, 5);
    for (const result of ['not JSON', 'null', '{"category":"AI","topic":"bad\\ntext","hint":"h"}']) {
      generate = async () => ({ text: result });
      check.equal((await service.generateDanranTopic()).source, 'curated-100');
    }
    generate = async () => { throw new Error('429'); };
    check.equal((await service.generateDanranTopic()).source, 'curated-100');
    const releases = [];
    generate = () => new Promise((resolve) => releases.push(resolve));
    const four = Array.from({ length: 4 }, () => service.generateDanranTopic());
    check.equal((await service.generateDanranTopic()).source, 'curated-100');
    for (const release of releases) release({ text: '{"category":"a","topic":"b","hint":"c"}' });
    await Promise.all(four);
    // Exercise the actual timeout path without waiting twelve seconds.
    const vm = require('node:vm');
    const timeoutContext = { module: { exports: {} }, require, process, AbortController,
      setTimeout: (fn) => setTimeout(fn, 10), clearTimeout };
    generate = () => new Promise(() => {});
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'geminiService.js'), 'utf8'), timeoutContext);
    check.equal((await timeoutContext.module.exports.generateDanranTopic()).source, 'curated-100');
    assert(true, '移動中の古いAI応答破棄・初期在室者の重複防止・SDK成功/不正JSON/429');
  } finally { process.env.GEMINI_API_KEY = 'your_gemini_api_key_here'; }

  const sockets = [];
  try {
    const a = socketClient(baseUrl), b = socketClient(baseUrl), outsider = socketClient(baseUrl);
    sockets.push(a, b, outsider);
    const [aw, bw] = await Promise.all([a.next((m) => !!m.clientId), b.next((m) => !!m.clientId), outsider.next((m) => !!m.clientId)]);
    a.send({ type: 'enter_door', doorId: 'chanoma', accountName: 'same', videoEnabled: false });
    check.equal((await a.next((m) => m.type === 'error')).requestType, 'enter_door');
    a.send({ type: 'enter_door', doorId: 'chanoma', accountName: 'same', videoEnabled: true });
    await a.next((m) => m.type === 'room_state');
    let door = (await fetchJson(baseUrl, '/api/doors')).data.doors[0];
    check.equal(door.statusText, '-same-がくつろいでいます。');
    check.equal(door.isOpen, true);
    check.equal(door.participantCount, 1);
    b.send({ type: 'enter_door', doorId: 'chanoma', accountName: 'same', videoEnabled: true });
    await Promise.all([a, b].map((c) => c.next((m) => m.type === 'room_state' && m.participants.length === 2)));
    door = (await fetchJson(baseUrl, '/api/doors')).data.doors[0];
    check.deepEqual(door.participants, ['same', 'same']);
    check.equal(door.statusText, '-same-ほか計2人が団らん中');
    check.equal(door.participantCount, 2);
    a.clear(); b.clear();
    a.send({ type: 'enter_door', doorId: 'chanoma', accountName: 'renamed', videoEnabled: true });
    check.equal((await a.next((m) => m.type === 'room_state')).participants.length, 2);
    a.send({ type: 'share_topic', doorId: 'chanoma', topic: topics[0], drawnBy: 'spoof' });
    check.equal((await b.next((m) => m.type === 'topic_shared')).drawnBy, 'renamed');
    outsider.send({ type: 'share_topic', doorId: 'chanoma', topic: topics[0] });
    check.equal((await outsider.next((m) => m.type === 'error')).code, 403);
    a.send({ type: 'webrtc_signal', doorId: 'chanoma', targetId: bw.clientId, payload: { kind: 'hello' } });
    check.equal((await b.next((m) => m.type === 'webrtc_signal')).fromId, aw.clientId);
    b.send({ type: 'enter_door', doorId: 'engawa', accountName: 'same', videoEnabled: true });
    check.equal((await b.next((m) => m.type === 'room_state' && m.doorId === 'engawa')).currentTopic, null);
    b.send({ type: 'share_topic', doorId: 'engawa', topic: topics[1] });
    await b.next((m) => m.type === 'topic_shared');
    a.send({ type: 'enter_door', doorId: 'chanoma', accountName: 'renamed', videoEnabled: true });
    check.equal((await a.next((m) => m.type === 'room_state' && m.participants.length === 1)).currentTopic.id, topics[0].id);
    a.send({ type: 'webrtc_signal', doorId: 'chanoma', targetId: bw.clientId, payload: {} });
    check.equal((await a.next((m) => m.type === 'error')).code, 403);
    b.send({ type: 'leave_door', doorId: 'chanoma' });
    check.equal((await b.next((m) => m.type === 'error')).requestType, 'leave_door');
    a.ws.send('not-json');
    check.equal((await a.next((m) => m.type === 'error')).code, 400);
    a.clear();
    b.send({ type: 'enter_door', doorId: 'chanoma', accountName: 'same', videoEnabled: true });
    await a.next((m) => m.type === 'room_state' && m.participants.length === 2);
    await b.close();
    check.equal((await a.next((m) => m.type === 'room_state' && m.participants.length === 1)).participants[0].id, aw.clientId);
    a.send({ type: 'leave_door', doorId: 'chanoma' });
    await a.next((m) => m.type === 'room_state' && m.participants.length === 0);
    door = (await fetchJson(baseUrl, '/api/doors')).data.doors[0];
    check.equal(door.isOpen, false);
    check.equal(door.participantCount, 0);
    check.deepEqual(door.participants, []);
    a.send({ type: 'enter_door', doorId: 'chanoma', accountName: 'same', videoEnabled: true });
    check.equal((await a.next((m) => m.type === 'room_state' && m.participants.length === 1)).currentTopic, null);
    for (let i = 0; i < 7; i++) {
      const c = socketClient(baseUrl); sockets.push(c);
      await c.next((m) => !!m.clientId);
      c.send({ type: 'enter_door', doorId: 'chanoma', accountName: `member-${i}`, videoEnabled: true });
      await c.next((m) => m.type === 'room_state');
    }
    outsider.send({ type: 'enter_door', doorId: 'chanoma', accountName: 'ninth', videoEnabled: true });
    check.match((await outsider.next((m) => m.type === 'error')).message, /満員/);
    assert(true, 'WS同時/重複入室・改名・別室シグナル拒否・退室・切断清掃・話題消去');
  } finally { await Promise.all(sockets.map((c) => c.close())); }
}

module.exports = { runAudit };
