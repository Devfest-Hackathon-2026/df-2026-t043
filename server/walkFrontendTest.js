'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const position = { lat: 35.711, lng: 139.796 };
const startState = {
  sessionId: 'session-1', guideId: 'guide', placeId: 'asakusa',
  pano: null, position, pov: { heading: 0, pitch: 0 }, zoom: 1, revision: 0,
};
const source = fs.readFileSync(path.join(__dirname, '../public/walk.js'), 'utf8');
const settle = () => new Promise((resolve) => setImmediate(resolve));

function createHarness({ clientId = 'guide', apiKey = 'test-browser-key' } = {}) {
  class Element {
    constructor() {
      this.children = [];
      this.events = new Map();
      this.hidden = false;
      this.value = '';
      const classes = new Set();
      this.classList = { contains: (name) => classes.has(name), toggle: (name, on) => on ? classes.add(name) : classes.delete(name) };
    }
    addEventListener(type, listener) { this.events.set(type, listener); }
    append(child) { this.children.push(child); child.parentElement = this; }
    replaceChildren(...children) { this.children = children; this.value = children[0]?.value || ''; }
    remove() { this.parentElement.children = this.parentElement.children.filter((child) => child !== this); }
    contains(node) { return this === node || this.children.some((child) => child.contains(node)); }
    focus() { document.activeElement = this; }
    click() { if (!this.disabled) this.events.get('click')(); }
  }

  const names = ['walkPanel', 'walkCallSettings', 'walkSetup', 'walkPlace', 'walkStart', 'walkStop', 'walkStatus', 'walkView'];
  const elements = Object.fromEntries(names.map((name) => [name, new Element()]));
  const stage = new Element();
  stage.append(elements.walkPanel);
  const document = {
    activeElement: null,
    head: new Element(),
    getElementById: (id) => elements[id],
    createElement: () => new Element(),
  };

  const panoramas = [];
  const lookups = [];
  class StreetViewPanorama {
    constructor(mount, options) {
      this.mount = mount;
      this.options = options;
      this.requests = [];
      this.events = new Map();
      this.visible = true;
      panoramas.push(this);
    }
    addListener(type, listener) {
      this.events.set(type, listener);
      return { remove: () => this.events.delete(type) };
    }
    emit(type) { this.events.get(type)?.(); }
    getPano() { return this.pano; }
    getStatus() { return this.status; }
    getPosition() { return this.location?.latLng; }
    getLocation() { return this.location; }
    getPov() { return this.pov; }
    getZoom() { return this.zoom; }
    setPano(pano) { this.requests.push(pano); }
    setPosition(coordinates) { this.requests.push(coordinates); }
    setPov(pov) { this.pov = pov; this.emit('pov_changed'); }
    setZoom(zoom) { this.zoom = zoom; this.emit('zoom_changed'); }
    setVisible(visible) { this.visible = visible; }
    complete(pano, coordinates = position, status = 'OK') {
      this.status = status;
      this.pano = pano;
      this.location = { pano, latLng: { toJSON: () => coordinates } };
      this.emit('status_changed');
    }
  }
  class StreetViewService {
    async getPanorama(options) {
      lookups.push(options);
      return { data: { location: { pano: 'near-preset' } } };
    }
  }

  let now = 0;
  let timerId = 0;
  const timers = new Map();
  function advance(ms) {
    const end = now + ms;
    while (true) {
      const next = [...timers].sort((a, b) => a[1].at - b[1].at)[0];
      if (!next || next[1].at > end) break;
      const [id, { at, run }] = next;
      timers.delete(id);
      now = at;
      run();
    }
    now = end;
  }
  const window = {};
  vm.runInNewContext(source, {
    window, document, URLSearchParams, performance: { now: () => now },
    setTimeout: (run, ms) => { timers.set(++timerId, { at: now + ms, run }); return timerId; },
    clearTimeout: (id) => timers.delete(id),
  }, { filename: 'public/walk.js' });
  const sent = [];
  const controller = window.createWalkPanel({
    send: (message) => { sent.push({ ...message, time: now }); return true; },
    getClientId: () => clientId,
    loadConfig: async () => ({ apiKey, places: [{ id: 'asakusa', name: '浅草', position }] }),
  });
  const script = () => document.head.children[0];
  const loadMaps = async () => {
    const url = new URL(script().src);
    assert.equal(url.origin, 'https://maps.googleapis.com');
    assert.equal(url.searchParams.get('key'), apiKey);
    window.google = { maps: { importLibrary: async (name) => {
      assert.equal(name, 'streetView');
      return { StreetViewPanorama, StreetViewService, StreetViewPreference: { NEAREST: 'nearest' } };
    } } };
    await window[url.searchParams.get('callback')]();
    await settle();
  };

  controller.enter('chanoma');
  return { ...controller, el: elements, script, loadMaps, panoramas, lookups, sent, advance, window, stage };
}

async function runWalkFrontendTests() {
  const noKey = createHarness({ apiKey: '' });
  noKey.sync('chanoma', null);
  await settle();
  assert.equal(noKey.el.walkStart.disabled, true);
  assert.equal(noKey.script(), undefined);
  assert.match(noKey.el.walkStatus.textContent, /通話は続けられます/);

  const guide = createHarness();
  guide.sync('chanoma', null);
  await settle();
  assert.equal(guide.el.walkStart.disabled, false);
  assert.equal(guide.script(), undefined, 'idle rooms do not load Maps');
  guide.el.walkStart.click();
  assert.deepEqual(guide.sent[0], { type: 'walk_start', doorId: 'chanoma', placeId: 'asakusa', time: 0 });
  guide.sync('chanoma', startState);
  guide.el.walkStop.click();
  assert.equal(guide.sent[1].type, 'walk_stop');
  assert.equal(guide.el.walkView.hidden, true);
  guide.sync('chanoma', null);
  await guide.loadMaps();
  assert.equal(guide.panoramas.length, 0, 'stopped walks stay stopped after the script resolves');

  guide.sync('chanoma', { ...startState, sessionId: 'session-2' });
  await settle();
  assert.equal(guide.lookups[0].radius, 200);
  assert.equal(guide.lookups[0].preference, 'nearest');
  const [panorama] = guide.panoramas;
  assert.equal(panorama.options.motionTracking, false);
  assert.equal(panorama.options.clickToGo, true);
  panorama.complete('near-preset');
  guide.advance(0);
  const updates = () => guide.sent.filter(({ type }) => type === 'walk_update');
  assert.equal(updates()[0].sessionId, 'session-2');
  panorama.setPov({ heading: 10, pitch: 0 });
  guide.advance(100);
  panorama.setPov({ heading: 30, pitch: 3 });
  guide.sync('chanoma', { ...startState, sessionId: 'session-2', pano: 'near-preset', revision: 1 });
  assert.equal(panorama.getPov().heading, 30, 'guide echoes never move the guide view');
  guide.advance(99);
  assert.equal(updates().length, 1);
  guide.advance(1);
  assert.equal(updates().length, 2);
  assert.equal(updates()[1].pov.heading, 30);
  assert.equal(updates()[1].time - updates()[0].time, 200);
  panorama.pano = 'moving-to-another-pano';
  panorama.emit('pano_changed');
  guide.advance(200);
  assert.equal(updates().length, 2, 'pano is not sent before its own location resolves');
  panorama.complete('moving-to-another-pano');
  guide.advance(0);
  assert.equal(updates().length, 3);
  panorama.setPov({ heading: 40, pitch: 3 });
  guide.disconnect();
  guide.advance(200);
  assert.equal(updates().length, 3, 'disconnect discards the queued update');
  assert.equal(panorama.visible, false);
  assert.equal(guide.stage.classList.contains('is-walking'), false);

  const follower = createHarness({ clientId: 'follower' });
  follower.sync('chanoma', startState);
  await settle();
  assert.equal(follower.script(), undefined, 'followers wait for the first panorama from the guide');
  follower.sync('chanoma', { ...startState, pano: 'first', revision: 1 });
  follower.sync('chanoma', { ...startState, pano: 'second', revision: 2 });
  await follower.loadMaps();
  const [followView] = follower.panoramas;
  assert.deepEqual(followView.requests, ['second']);
  assert.equal(followView.options.clickToGo, false);
  assert.equal(followView.options.linksControl, false);
  const third = { ...startState, pano: 'third', revision: 3, pov: { heading: 42, pitch: 9 }, zoom: 2 };
  follower.sync('chanoma', third);
  followView.complete('second');
  assert.deepEqual(followView.requests, ['second', 'third']);
  follower.sync('chanoma', { ...third, revision: 4, pov: { heading: 50, pitch: 5 } });
  followView.complete('third');
  follower.sync('chanoma', third);
  assert.deepEqual(followView.getPov(), { heading: 50, pitch: 5 });
  assert.equal(followView.getZoom(), 2);
  follower.sync('chanoma', { ...third, pano: 'browser-specific-id', revision: 5 });
  followView.complete('', position, 'ZERO_RESULTS');
  assert.deepEqual(followView.requests.at(-1), position);
  followView.complete('follower-local-id');
  assert.match(follower.el.walkStatus.textContent, /近くの景色/);
  followView.emit('pov_changed');
  follower.advance(1000);
  assert.equal(follower.sent.length, 0, 'programmatic follower changes never echo');
  let inputStopped = false;
  const keydown = follower.el.walkView.events.get('keydown');
  keydown({ key: 'ArrowRight', target: {}, stopImmediatePropagation: () => { inputStopped = true; } });
  assert.equal(inputStopped, true);
  keydown({ key: 'Tab', target: {}, stopImmediatePropagation: () => assert.fail('tab navigation should remain available') });
  follower.el.walkStop.click();
  assert.equal(follower.sent[0].type, 'walk_stop');
  follower.sync('chanoma', null);
  assert.equal(follower.el.walkView.hidden, true);

  const failing = createHarness();
  failing.sync('chanoma', startState);
  await settle();
  const failedScript = failing.script();
  failedScript.onerror();
  await settle();
  assert.equal(failing.sent[0].type, 'walk_stop', 'a failed guide load ends the shared walk');
  failing.sync('chanoma', null);
  assert.match(failing.el.walkStatus.textContent, /通話は続けられます/);
  failing.sync('chanoma', { ...startState, sessionId: 'retry' });
  assert.notEqual(failing.script().src, failedScript.src, 'a transient loader error allows retry');
  await failing.loadMaps();
  failing.window.gm_authFailure();
  assert.equal(failing.sent[1].type, 'walk_stop', 'authentication failure after import ends the guide walk');
  failing.sync('chanoma', null);
  assert.equal(failing.el.walkStart.disabled, true);
  assert.match(failing.el.walkStatus.textContent, /認証できませんでした/);
  console.log('✅ PASS: 散歩フロント（遅延読込の終了・案内役の間引き・同行者の追従と代替表示・失敗時の通話継続）');
}

module.exports = { runWalkFrontendTests };
