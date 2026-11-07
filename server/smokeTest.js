/**
 * となりドア (Tonari Door) — 統括エージェント用 自動監査・スモークテスト
 * - 100件の話題カードデータの検証
 * - サーバーAPIエンドポイントと `-{アカウント名}-がくつろいでいます。` フォーマットの検証
 * - フロントエンドファイル存在・必須要素の検証
 */
const fs = require('fs');
const path = require('path');
const http = require('http');

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
    assert(
      typeof firstDoor.statusText === 'string' && /^-.+-がくつろいでいます。$/.test(firstDoor.statusText),
      `初期ドアの気配表示が「-{アカウント名}-がくつろいでいます。」形式であること (実際: "${firstDoor.statusText}")`
    );

    const presenceRes = await fetchJson(baseUrl, `/api/doors/${firstDoor.id}/presence`, {
      method: 'POST',
      body: { accountName: 'yoikoarmor', mode: 'relaxing', activityHint: 'お茶を飲んでひと休み中' },
    });
    assert(presenceRes.status === 200, 'POST /api/doors/:id/presence が正常応答すること');
    const updatedDoor = presenceRes.data.door || (presenceRes.data.doors && presenceRes.data.doors.find((d) => d.id === firstDoor.id));
    assert(
      updatedDoor && updatedDoor.statusText === '-yoikoarmor-がくつろいでいます。',
      `気配更新後の表示が「-yoikoarmor-がくつろいでいます。」になること (実際: "${updatedDoor && updatedDoor.statusText}")`
    );
    const doorsAfterMove = presenceRes.data.doors || (await fetchJson(baseUrl, '/api/doors')).data.doors;
    const yoikoDoors = doorsAfterMove.filter((d) => d.occupantAccount === 'yoikoarmor');
    assert(
      yoikoDoors.length === 1 && yoikoDoors[0].id === firstDoor.id,
      `別のドアに移動した際、以前のドアに重複して残らず1つのドアのみに気配が表示されること (該当ドア数: ${yoikoDoors.length})`
    );

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

    console.log('🎉 すべてのスモークテスト・要件監査に合格しました！');
  } finally {
    listener.close();
  }
}

if (require.main === module) {
  runAudit().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { runAudit };
