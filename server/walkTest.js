'use strict';

const assert = require('node:assert/strict');
const { once } = require('node:events');
const { setTimeout: delay } = require('node:timers/promises');

async function checkWalkConfig(baseUrl) {
  const previous = process.env.GOOGLE_MAPS_BROWSER_API_KEY;
  try {
    for (const apiKey of ['', 'test-browser-maps-key']) {
      process.env.GOOGLE_MAPS_BROWSER_API_KEY = apiKey;
      const response = await fetch(`${baseUrl}/api/walk-config`, { signal: AbortSignal.timeout(3000) });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      const config = await response.json();
      assert.equal(config.apiKey, apiKey);
      assert.deepEqual(config.places.map(({ id }) => id), ['asakusa', 'yokohama', 'kyoto']);
      for (const { name, position } of config.places) {
        assert.ok(name && Number.isFinite(position.lat) && Number.isFinite(position.lng));
      }
    }
  } finally {
    if (previous === undefined) delete process.env.GOOGLE_MAPS_BROWSER_API_KEY;
    else process.env.GOOGLE_MAPS_BROWSER_API_KEY = previous;
  }
}

async function runWalkTests(baseUrl, socketClient) {
  await checkWalkConfig(baseUrl);
  const doorId = 'hobby';
  const clients = [];
  async function connect() {
    const client = socketClient(baseUrl);
    clients.push(client);
    client.id = (await client.next((message) => !!message.clientId)).clientId;
    return client;
  }
  function enter(client, room = doorId) {
    client.send({ type: 'enter_door', doorId: room, accountName: client.id, videoEnabled: true });
  }
  const roomState = (client, size, room = doorId) => client.next((message) => message.type === 'room_state'
    && message.doorId === room && message.participants.length === size);
  const walkState = (client, match) => client.next((message) => message.type === 'walk_state'
    && message.doorId === doorId && match(message.walk));
  async function rejected(client, message, code) {
    client.send({ doorId, ...message });
    const error = await client.next((reply) => reply.type === 'error' && reply.requestType === message.type);
    assert.equal(error.code, code);
  }

  try {
    const [guide, follower, outsider] = await Promise.all([connect(), connect(), connect()]);
    enter(guide);
    enter(follower);
    enter(outsider, 'kitchen');
    const initial = await Promise.all([roomState(guide, 2), roomState(follower, 2), roomState(outsider, 1, 'kitchen')]);
    initial.forEach((state) => assert.equal(state.walk, null));
    const outsiderWalks = [];
    outsider.ws.on('message', (raw) => {
      const message = JSON.parse(raw);
      if (message.type === 'walk_state') outsiderWalks.push(message);
    });

    const start = { type: 'walk_start', doorId, placeId: 'asakusa' };
    await rejected(outsider, start, 403);
    await rejected(guide, { ...start, placeId: 'missing' }, 404);
    await rejected(guide, { ...start, placeId: 'x'.repeat(81) }, 400);
    guide.send(start);
    const [started, sharedStart] = await Promise.all([guide, follower].map((client) => walkState(client, Boolean)));
    assert.deepEqual(sharedStart.walk, started.walk);
    assert.equal(started.walk.guideId, guide.id);
    assert.equal(started.walk.placeId, 'asakusa');
    assert.equal(started.walk.pano, null);
    assert.equal(started.walk.revision, 0);
    const { sessionId } = started.walk;
    const update = {
      type: 'walk_update', doorId, sessionId, pano: 'test-pano-1',
      position: { lat: 35.7111, lng: 139.7961 }, pov: { heading: 120, pitch: -5 }, zoom: 1.5,
    };
    const stop = { type: 'walk_stop', doorId, sessionId };
    await rejected(follower, start, 409);
    await rejected(follower, update, 403);
    await rejected(outsider, update, 403);
    await rejected(outsider, stop, 403);
    await rejected(guide, { ...update, position: { lat: 91, lng: 0 } }, 400);
    await delay(110);
    await rejected(guide, { ...update, pano: 'x'.repeat(513) }, 400);
    await delay(110);

    guide.send(update);
    const [first, shared] = await Promise.all([guide, follower].map((client) => walkState(client, (walk) => walk?.revision === 1)));
    assert.deepEqual(shared.walk, first.walk);
    assert.deepEqual(shared.walk, {
      ...started.walk, pano: update.pano, position: update.position, pov: update.pov, zoom: update.zoom, revision: 1,
    });

    const burst = [];
    follower.ws.on('message', (raw) => {
      const message = JSON.parse(raw);
      if (message.type === 'walk_state' && message.walk?.revision > 1) burst.push(message.walk);
    });
    const burstStarted = performance.now();
    for (let i = 0; i < 320; i++) guide.send({ ...update, pano: `burst-${i}` });
    guide.send({ type: 'webrtc_signal', doorId, targetId: follower.id, payload: { check: 'after burst' } });
    await follower.next((message) => message.type === 'webrtc_signal' && message.payload.check === 'after burst');
    const burstLimit = 1 + Math.floor((performance.now() - burstStarted) / 100);
    assert.ok(burst.length <= burstLimit, 'guide updates are throttled without dropping the call');
    await delay(110);
    guide.send({ ...update, pano: 'after-burst' });
    const latest = await walkState(guide, (walk) => walk?.pano === 'after-burst');

    guide.clear();
    await follower.close();
    assert.deepEqual((await roomState(guide, 1)).walk, latest.walk);
    const reconnected = await connect();
    enter(reconnected);
    assert.deepEqual((await roomState(reconnected, 2)).walk, latest.walk);
    assert.notEqual(reconnected.id, follower.id);
    await rejected(reconnected, update, 403);
    enter(outsider, 'kitchen');
    await roomState(outsider, 1, 'kitchen');
    assert.deepEqual(outsiderWalks, []);
    reconnected.send(stop);
    await Promise.all([guide, reconnected].map((client) => walkState(client, (walk) => walk === null)));

    reconnected.send({ ...start, placeId: 'yokohama' });
    const second = (await walkState(guide, (walk) => walk?.placeId === 'yokohama')).walk;
    assert.notEqual(second.sessionId, sessionId);
    await rejected(reconnected, update, 409);
    await rejected(guide, stop, 409);
    reconnected.send({ type: 'leave_door', doorId });
    await walkState(guide, (walk) => walk === null);
    assert.equal((await roomState(guide, 1)).walk, null);
    assert.equal((await roomState(reconnected, 0)).walk, null);

    enter(reconnected);
    await roomState(reconnected, 2);
    guide.send({ ...start, placeId: 'kyoto' });
    await walkState(reconnected, (walk) => walk?.placeId === 'kyoto');
    await guide.close();
    await walkState(reconnected, (walk) => walk === null);
    assert.equal((await roomState(reconnected, 1)).walk, null);

    const spammer = await connect();
    const closed = once(spammer.ws, 'close', { signal: AbortSignal.timeout(3000) });
    for (let i = 0; i < 301; i++) spammer.send(update);
    assert.equal((await closed)[0], 1008);
    console.log('✅ PASS: 散歩の設定・部屋単位の同期・案内役の制限・再入室・切断時の終了・WS送信制限');
  } finally {
    await Promise.all(clients.map((client) => client.close()));
  }
}

module.exports = { runWalkTests };
