'use strict';

// Execute the shipped browser code with controlled DOM/media doubles. No camera,
// external browser, credentials or network are needed for lifecycle regressions.
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

async function runFrontendTests() {
  class Element {
    constructor() {
      this.value = ''; this.hidden = true; this.dataset = {}; this.style = {};
      this.children = []; this.textContent = ''; this.classList = { add() {}, remove() {}, toggle() {} };
    }
    addEventListener() {}
    setAttribute() {}
    append(...items) { this.children.push(...items); }
    prepend(item) { this.children.unshift(item); }
    replaceChildren(...items) { this.children = items; }
    querySelector() { return new Element(); }
    querySelectorAll() { return []; }
    remove() {}
    focus() {}
    play() { return Promise.resolve(); }
  }
  class Stream {
    constructor(tracks) { this.tracks = tracks; }
    getTracks() { return this.tracks; }
    getVideoTracks() { return this.tracks.filter((t) => t.kind === 'video'); }
    getAudioTracks() { return this.tracks.filter((t) => t.kind === 'audio'); }
    addTrack(t) { this.tracks.push(t); }
    removeTrack(t) { this.tracks = this.tracks.filter((x) => x !== t); }
  }
  const track = () => ({ kind: 'video', readyState: 'live', stop() { this.readyState = 'ended'; }, addEventListener() {} });
  const elements = new Map();
  const storage = new Map();
  const context = vm.createContext({
    console, URLSearchParams, AbortController, Node: Element, MediaStream: Stream,
    setTimeout: (fn, ms) => { const timer = setTimeout(fn, ms); timer.unref(); return timer; }, clearTimeout,
    setInterval: () => 1, clearInterval() {}, requestAnimationFrame: (fn) => fn(),
    navigator: { mediaDevices: {} }, location: { protocol: 'http:', search: '', host: 'localhost' },
    window: { addEventListener() {}, scrollTo() {} },
    document: { querySelector: (s) => { if (!elements.has(s)) elements.set(s, new Element()); return elements.get(s); },
      querySelectorAll: () => [], addEventListener() {}, createElement: () => new Element(), createTextNode: (s) => s },
    localStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    RTCPeerConnection: class {
      constructor() { this.signalingState = 'stable'; }
      addEventListener() {}
      addTrack() {}
      addTransceiver() {}
      close() {}
      async createOffer() { return { type: 'offer', sdp: 'test' }; }
      async setLocalDescription(sdp) { this.localDescription = sdp; }
    },
  });
  let source = fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8');
  source = source.replace('  boot();', `  globalThis.test = { state, el, normalizeSummary, normalizeDoor, loadLS,
    startLocalMedia, switchCamera, stopLocalMedia, getMedia, openGeminiPresence, closeModal,
    drawRandomTopic, generateGeminiTopic, resetRoom, onSignal, handleMessage };`);
  vm.runInContext(source, context, { filename: 'public/app.js' });
  const t = context.test;
  for (const score of [0, 1, 5, 10, 84, null]) assert.equal(t.normalizeSummary({ vitalityScore: score }).vitalityScore, score);
  assert.equal(t.normalizeDoor({ occupantAccount: '', participants: ['visitor'], mode: 'away' }).occupantAccount, '');
  storage.set('bad', '{}'); assert.equal(t.loadLS('bad', []).length, 0);
  await assert.rejects(t.getMedia({ video: true }), /unavailable/);
  t.state.selfCam = { c: {}, start() {}, stop() {} };
  await assert.rejects(t.startLocalMedia(), /映像/);
  t.stopLocalMedia();
  const ended = track(); ended.stop();
  t.state.localStream = new Stream([ended]); t.state.cameraMode = 'real';
  t.state.room = { door: { id: 'chanoma' } };
  await t.switchCamera('virtual');
  assert.equal(t.state.room, null);

  t.state.room = { participants: new Set(['me']) };
  await t.onSignal({ fromId: 'server-1', accountName: 'trusted', payload: { from: 'peer', name: 'spoof', kind: 'candidate', candidate: { candidate: 'ice' } } });
  const oldPeer = t.state.peers.get('peer');
  assert.equal(oldPeer.pendingIce.length, 1);
  assert.equal(oldPeer.name, 'trusted');
  await t.onSignal({ fromId: 'server-2', accountName: 'trusted', payload: { from: 'peer', kind: 'candidate', candidate: { candidate: 'new-ice' } } });
  assert.notEqual(t.state.peers.get('peer'), oldPeer);
  t.handleMessage({ type: 'error', requestType: 'enter_door' });
  assert.equal(t.state.room, null);

  const virtual = track();
  let stoppedCam = 0;
  t.state.virtualTrack = virtual;
  t.state.localStream = new Stream([virtual]);
  t.state.selfCam = { stop() { stoppedCam++; } };
  t.stopLocalMedia();
  assert.equal(virtual.readyState, 'ended');
  assert.equal(t.state.virtualTrack, null);
  assert.ok(stoppedCam);

  // Permission resolves after leaving: the acquired track must be stopped.
  let resolveMedia;
  context.navigator.mediaDevices.getUserMedia = () => new Promise((r) => { resolveMedia = r; });
  t.state.localStream = new Stream([track()]);
  t.state.cameraMode = 'virtual';
  const switching = t.switchCamera('real');
  t.stopLocalMedia();
  const late = track(); resolveMedia(new Stream([late]));
  await switching;
  assert.equal(late.readyState, 'ended');
  assert.equal(t.state.localStream, null);

  // Double clicks must not acquire two cameras.
  let requests = 0;
  context.navigator.mediaDevices.getUserMedia = () => { requests++; return new Promise((r) => { resolveMedia = r; }); };
  t.state.localStream = new Stream([track()]);
  const first = t.switchCamera('real');
  await t.switchCamera('real');
  assert.equal(requests, 1);
  resolveMedia(new Stream([track()])); await first;
  t.stopLocalMedia();

  // Sender replacement failure preserves the previously working video.
  const old = track(), rejected = track();
  t.state.localStream = new Stream([old]); t.state.cameraMode = 'virtual';
  context.navigator.mediaDevices.getUserMedia = async () => new Stream([rejected]);
  t.state.peers.set('peer', { pc: { getSenders: () => [{ track: old, replaceTrack: async (tr) => { if (tr === rejected) throw new Error('encoding'); } }] } });
  await t.switchCamera('real');
  assert.equal(t.state.localStream.getVideoTracks()[0], old);
  assert.equal(rejected.readyState, 'ended');
  t.state.peers.clear(); t.stopLocalMedia();

  // Closing a preview during a permission prompt must not leave the camera on.
  context.navigator.mediaDevices.getUserMedia = () => new Promise((r) => { resolveMedia = r; });
  t.state.doors = [];
  t.openGeminiPresence();
  t.closeModal();
  const previewTrack = track(); resolveMedia(new Stream([previewTrack]));
  await new Promise((r) => setImmediate(r));
  assert.equal(previewTrack.readyState, 'ended');

  // A generated topic from an old room must not appear in a new session.
  let resolveFetch;
  context.fetch = () => new Promise((r) => { resolveFetch = r; });
  const room = () => ({ door: { id: 'chanoma', name: 'room' }, participants: new Set(['me']), topicsUsed: [] });
  t.state.room = room();
  const generating = t.generateGeminiTopic();
  t.state.room = room();
  resolveFetch({ ok: true, headers: { get: () => 'application/json' }, json: async () => ({ topic: { id: 1, category: 'a', topic: 'old', hint: '' }, source: 'gemini' }) });
  await generating;
  assert.equal(t.state.room.topicsUsed.length, 0);
  t.resetRoom();
  assert.equal(t.state.room, null);
  console.log('✅ PASS: フロント元気度・空ドア・保存データ・カメラ切替/退室/モーダル競合・古い話題の破棄');
}

module.exports = { runFrontendTests };
