/* =====================================================================
   となりドア — フロントエンド (ドアUI・団らんルーム・話題カード・見守りノート)
   - サーバー (server/index.js) が無くても、静的ファイルだけで「ひとりデモ」が動くよう
     すべての API 呼び出しにローカルフォールバックを用意しています。
   - WebRTC シグナリングは API_CONTRACT.md の `webrtc_signal` を使用。
     payload 内に { kind, from, to, name } を持たせ、必須の targetId で
     同じドアの参加者へ個別に中継します。
   ===================================================================== */
(() => {
  'use strict';

  // ------------------------------------------------------------------
  // 定数・初期データ
  // ------------------------------------------------------------------
  const DEFAULT_ACCOUNT = 'yoikoarmor';
  const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];
  const VIDEO_CONSTRAINTS = { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' };
  const LS = {
    account: 'tonari.account',
    myDoor: 'tonari.myDoor',
    logs: 'tonari.logs',
    localDoors: 'tonari.localDoors',
  };

  const DEFAULT_DOORS = [
    {
      id: 'chanoma', name: '実家の茶の間', subtitle: '温かいお茶とテレビの音', icon: '🍵', theme: 'warm-wood',
      occupantAccount: 'おばあちゃん', mode: 'relaxing', timingScore: 'good', timingLabel: '◎ 声をかけるのにぴったり',
      aiDetail: 'リビングでゆっくり過ごしています。今なら気兼ねなく話しかけられます。', participants: ['おばあちゃん'],
    },
    {
      id: 'engawa', name: '日当たりのいい縁側', subtitle: 'ひなたぼっこと庭の草花', icon: '🌼', theme: 'matcha',
      occupantAccount: '母（実家）', mode: 'relaxing', timingScore: 'good', timingLabel: '◎ 声をかけるのにぴったり',
      aiDetail: '縁側でひと休みしているようです。お庭の話から始めてみましょう。', participants: ['母（実家）'],
    },
    {
      id: 'kitchen', name: '夕暮れの台所・ダイニング', subtitle: 'お味噌汁の湯気と夕ごはん', icon: '🍲', theme: 'sunset',
      occupantAccount: 'kaigunn_2020', mode: 'relaxing', timingScore: 'maybe', timingLabel: '○ 少しなら話せそう',
      aiDetail: '夕ごはんの支度が一段落したところのようです。短めの声かけがおすすめです。', participants: ['kaigunn_2020'],
    },
    {
      id: 'hobby', name: 'みんなの趣味部屋', subtitle: '編み物・将棋・アルバム', icon: '🧶', theme: 'sakura',
      occupantAccount: 'yoikoarmor', mode: 'relaxing', timingScore: 'good', timingLabel: '◎ 声をかけるのにぴったり',
      aiDetail: '趣味の時間を楽しんでいます。気軽にのぞいてみましょう。', participants: ['yoikoarmor'],
    },
  ];

  const THEME_BY_ID = { chanoma: 'indigo', engawa: 'matcha', kitchen: 'sunset', hobby: 'sakura' };
  const TIMING_LABELS = { good: '◎ 声をかけるのにぴったり', maybe: '○ 少しなら話せそう', busy: '△ 今はそっとしておこう' };

  // file:// で開いた時などに topics.json が読めない場合の最小デッキ
  const EMERGENCY_TOPICS = [
    { id: 1, category: '食事・料理', topic: '今日の晩ごはん（またはお昼ごはん）、何を食べた？', hint: 'メニューだけでなく味付けや誰と食べたかも聞いてみましょう' },
    { id: 11, category: '季節・天気', topic: 'そっちの今日の天気はどう？朝晩は冷え込んでない？', hint: '服装や暖房・冷房の使い方も自然に確認できます' },
    { id: 23, category: '昔話・思い出', topic: '今までに行った家族旅行で、一番印象に残っている場所はどこ？', hint: '当時の写真があれば画面越しに見せ合うのも素敵です' },
    { id: 16, category: '季節・天気', topic: 'お庭やベランダの植物、今どんな様子？よかったらカメラで見せて！', hint: 'ビデオ通話ならではの『見せて』が自然に生まれます' },
  ];

  const SIM_REPLIES = {
    '食事': ['今日はね、お味噌汁にお豆腐とわかめを入れたのよ。', 'あら、お腹がすいてきちゃったわ。'],
    '季節': ['こっちはね、朝晩が冷えるようになったわよ。', 'お庭の木がすっかり色づいたの。'],
    '昔話': ['あの頃はねぇ、本当に楽しかったわ。', 'ふふ、懐かしいわねぇ。よく覚えてるわよ。'],
    '暮らし': ['おかげさまで元気にしてるわよ。', '最近は朝のお散歩を続けてるの。'],
    '趣味': ['最近はね、朝ドラが楽しみなのよ。', '編み物がもうすぐ完成しそうなの。'],
    '家族': ['みんな元気にしてる？顔が見られて嬉しいわ。', 'この前ね、写真を整理してたのよ。'],
    'お出かけ': ['来月ね、ご近所さんと温泉に行くのよ。', '今度帰ってきたら、あそこに行きましょうか。'],
    'ご近所': ['お隣さんがね、柿をたくさんくれたのよ。', '商店街に新しいお店ができたの。'],
    '知恵袋': ['それはね、焦らないのが一番よ。', 'おばあちゃんの知恵、教えてあげようか。'],
    '遊び': ['よーし、負けないわよ！', 'ふふふ、じゃあ私からいくわね。'],
    'default': ['あら、いい話ねぇ。そうねぇ…', 'まあ！そんなこと聞いてくれるの？嬉しいわ。', 'それはね、ちょっと長くなるわよ〜。'],
  };

  // ------------------------------------------------------------------
  // 状態
  // ------------------------------------------------------------------
  const state = {
    account: loadLS(LS.account, DEFAULT_ACCOUNT) || DEFAULT_ACCOUNT,
    myDoorId: loadLS(LS.myDoor, null),
    doors: [],
    doorEls: new Map(),
    topics: [],
    topicFilter: 'all',
    recentTopicIds: [],
    logs: [],
    serverOnline: false,
    ws: null,
    wsReady: false,
    wsRetry: 0,
    clientId: null,
    peerId: `p-${Math.random().toString(36).slice(2, 10)}`,
    room: null,           // { door, startedAt, timer, topicsUsed, participants:Set, currentTopic }
    localStream: null,
    audioTrack: null,
    realVideoTrack: null,
    virtualTrack: null,
    cameraMode: 'real',
    micOn: true,
    selfCam: null,        // HomeCam (バーチャル茶の間カメラ)
    simCam: null,         // HomeCam (家族シミュレーター)
    peers: new Map(),     // peerId -> { pc, name, serverId, tile, video, offered, pendingIce }
    audioCtx: null,
    entering: false,
    mediaStarting: false,
    switchingCamera: false,
    cameraSwitch: 0,
    presenceRevision: 0,
    pendingPresence: loadLS('tonari.pendingPresence', null),
  };

  // ------------------------------------------------------------------
  // DOM
  // ------------------------------------------------------------------
  const $ = (sel) => document.querySelector(sel);
  const el = {
    accountInput: $('#accountInput'),
    accountPreviewText: $('#accountPreviewText'),
    accountPreview: $('#accountPreview'),
    myDoorSelect: $('#myDoorSelect'),
    modeSelect: $('#modeSelect'),
    setPresenceBtn: $('#setPresenceBtn'),
    geminiPresenceBtn: $('#geminiPresenceBtn'),
    connStatus: $('#connStatus'),
    lobbyControls: $('#lobbyControls'),
    lobby: $('#lobby'),
    doorRow: $('#doorRow'),
    careList: $('#careList'),
    room: $('#room'),
    roomIcon: $('#roomIcon'),
    roomName: $('#roomName'),
    roomSub: $('#roomSub'),
    roomTimer: $('#roomTimer'),
    participantsBar: $('#participantsBar'),
    remoteStage: $('#remoteStage'),
    simulatorTile: $('#simulatorTile'),
    simulatorCanvas: $('#simulatorCanvas'),
    simulatorName: $('#simulatorName'),
    selfTile: $('#selfTile'),
    selfVideo: $('#selfVideo'),
    selfName: $('#selfName'),
    selfCamNote: $('#selfCamNote'),
    camRealBtn: $('#camRealBtn'),
    camVirtualBtn: $('#camVirtualBtn'),
    micBtn: $('#micBtn'),
    topicCard: $('#topicCard'),
    topicCategory: $('#topicCategory'),
    topicSource: $('#topicSource'),
    topicText: $('#topicText'),
    topicHint: $('#topicHint'),
    drawTopicBtn: $('#drawTopicBtn'),
    geminiTopicBtn: $('#geminiTopicBtn'),
    categoryChips: $('#categoryChips'),
    topicHistory: $('#topicHistory'),
    historyCount: $('#historyCount'),
    memoInput: $('#memoInput'),
    memoChips: $('#memoChips'),
    leaveBtn: $('#leaveBtn'),
    doorTransition: $('#doorTransition'),
    dtCaption: $('#dtCaption'),
    modal: $('#modal'),
    modalTitle: $('#modalTitle'),
    modalBody: $('#modalBody'),
    modalClose: $('#modalClose'),
    toasts: $('#toasts'),
  };

  // ------------------------------------------------------------------
  // ユーティリティ
  // ------------------------------------------------------------------
  function loadLS(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      const parsed = v === null ? fallback : JSON.parse(v);
      if (fallback !== null && (typeof parsed !== typeof fallback || parsed === null || Array.isArray(parsed) !== Array.isArray(fallback))) return fallback;
      return parsed;
    } catch { return fallback; }
  }
  function saveLS(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* 容量超過などは無視 */ }
  }

  /** 小さな DOM ビルダー（textContent を使うので XSS 安全） */
  function h(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') node.className = v;
      else if (k === 'dataset') Object.assign(node.dataset, v);
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else if (k === 'text') node.textContent = v;
      else node.setAttribute(k, v === true ? '' : v);
    }
    for (const c of children.flat()) {
      if (c === null || c === undefined || c === false) continue;
      node.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return node;
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const clampName = (s) => String(s || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 24);
  const relaxingText = (name) => `-${name}-がくつろいでいます。`;

  function statusTextFor(name, mode) {
    if (!name) return 'いまは誰もいません。';
    if (mode === 'busy') return `-${name}-は今、手が離せません。`;
    if (mode === 'away') return `-${name}-はお出かけ中です。`;
    return relaxingText(name);
  }

  function participantName(p) {
    if (!p) return '';
    if (typeof p === 'string') return p;
    return p.accountName || p.name || p.displayName || '';
  }

  function normTiming(score) {
    if (typeof score === 'number') return score >= 70 ? 'good' : score >= 40 ? 'maybe' : 'busy';
    const s = String(score || '').toLowerCase();
    if (['good', 'great', 'high', 'best'].includes(s)) return 'good';
    if (['maybe', 'ok', 'fair', 'medium', 'soso'].includes(s)) return 'maybe';
    return 'busy';
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function formatDate(iso) {
    const d = iso ? new Date(iso) : new Date();
    if (Number.isNaN(d.getTime())) return '';
    return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  async function api(path, { method = 'GET', body, timeout = 8000 } = {}) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(path, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('json')) throw new Error('Not JSON');
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  function setBusy(btn, busy, label) {
    if (!btn) return;
    btn.disabled = busy;
    btn.classList.toggle('is-loading', busy);
    if (label) btn.dataset.loading = label;
  }

  // ------------------------------------------------------------------
  // 効果音（WebAudio・外部素材なし）
  // ------------------------------------------------------------------
  function audioCtx() {
    if (!state.audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      state.audioCtx = new AC();
    }
    if (state.audioCtx.state === 'suspended') state.audioCtx.resume().catch(() => {});
    return state.audioCtx;
  }
  function playKnock(times = 2) {
    const ctx = audioCtx();
    if (!ctx) return;
    for (let i = 0; i < times; i++) {
      const t = ctx.currentTime + i * 0.22;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(190, t);
      osc.frequency.exponentialRampToValueAtTime(70, t + 0.12);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.5, t + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.2);
    }
  }
  function playChime() {
    const ctx = audioCtx();
    if (!ctx) return;
    [880, 1318.5].forEach((f, i) => {
      const t = ctx.currentTime + i * 0.12;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.75);
    });
  }

  // ------------------------------------------------------------------
  // トースト・モーダル
  // ------------------------------------------------------------------
  function toast(message, { kind = '', action, duration = 4200 } = {}) {
    const node = h('div', { class: `toast ${kind ? `is-${kind}` : ''}`, role: 'status' }, h('span', { text: message }));
    if (action) {
      node.append(h('button', {
        class: 'btn btn-lamp', type: 'button',
        onclick: () => { dismiss(); action.onClick(); },
      }, action.label));
    }
    el.toasts.append(node);
    let done = false;
    function dismiss() {
      if (done) return;
      done = true;
      node.classList.add('is-leaving');
      setTimeout(() => node.remove(), 320);
    }
    setTimeout(dismiss, duration);
    while (el.toasts.children.length > 4) el.toasts.firstElementChild.remove();
    return dismiss;
  }

  let modalOnClose = null;
  let modalRevision = 0;
  function openModal(title, bodyNodes, { onClose } = {}) {
    if (!el.modal.hidden) closeModal();
    ++modalRevision;
    el.modalTitle.textContent = title;
    el.modalBody.replaceChildren(...[].concat(bodyNodes));
    el.modal.hidden = false;
    modalOnClose = onClose || null;
    setTimeout(() => el.modalClose.focus(), 50);
  }
  function closeModal() {
    if (el.modal.hidden) return;
    el.modal.hidden = true;
    ++modalRevision;
    el.modalBody.replaceChildren();
    const cb = modalOnClose;
    modalOnClose = null;
    if (cb) cb();
  }
  el.modalClose.addEventListener('click', closeModal);
  el.modal.addEventListener('click', (e) => { if (e.target === el.modal) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  // ------------------------------------------------------------------
  // HomeCam — Canvas で描く温かい茶の間のライブ映像
  //   kind: 'self'   … 自分用バーチャル茶の間カメラ（実カメラが無い時）
  //         'family' … 家族シミュレーター（1人でデモする時の相手役）
  // ------------------------------------------------------------------
  class HomeCam {
    constructor(canvas, { name = '', elder = false, kind = 'self', cardigan = '#c8553d' } = {}) {
      this.c = canvas;
      this.ctx = canvas.getContext('2d');
      this.name = name;
      this.elder = elder;
      this.kind = kind;
      this.cardigan = cardigan;
      this.reactions = [];
      this.bubble = null;
      this.nextBlink = performance.now() + 2000;
      this.blinkUntil = 0;
      this.waveUntil = 0;
      this.sipUntil = 0;
      this.laughUntil = 0;
      this.nodUntil = 0;
      this.timer = null;
      this.idleTimer = null;
    }
    start() {
      if (this.timer) return;
      this.timer = setInterval(() => this.draw(), 1000 / 24);
      this.draw();
      if (this.kind === 'family') {
        this.idleTimer = setInterval(() => this.idle(), 9000);
      }
    }
    stop() {
      clearInterval(this.timer);
      clearInterval(this.idleTimer);
      this.timer = null;
      this.idleTimer = null;
    }
    idle() {
      const r = Math.random();
      if (r < 0.35) this.sip();
      else if (r < 0.6) this.nod();
      else if (r < 0.75) this.laugh();
    }
    react(emoji) {
      this.reactions.push({ emoji, born: performance.now(), x: 0.2 + Math.random() * 0.6 });
    }
    say(text, ms = 4800) { this.bubble = { text, until: performance.now() + ms }; }
    wave() { this.waveUntil = performance.now() + 2200; }
    sip() { this.sipUntil = performance.now() + 2600; }
    laugh() { this.laughUntil = performance.now() + 1800; }
    nod() { this.nodUntil = performance.now() + 1400; }

    roundRect(x, y, w, hgt, r) {
      const ctx = this.ctx;
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + hgt, r);
      ctx.arcTo(x + w, y + hgt, x, y + hgt, r);
      ctx.arcTo(x, y + hgt, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    draw() {
      const { ctx } = this;
      const W = this.c.width, H = this.c.height;
      const now = performance.now();
      const t = now / 1000;
      const hour = new Date().getHours();
      const evening = hour >= 17 || hour < 6;

      // 壁
      const wall = ctx.createLinearGradient(0, 0, 0, H);
      wall.addColorStop(0, evening ? '#eed6a8' : '#f7ead0');
      wall.addColorStop(1, evening ? '#d9b27a' : '#e6cc9c');
      ctx.fillStyle = wall;
      ctx.fillRect(0, 0, W, H);

      // 障子窓
      const wx = 50, wy = 50, ww = 290, wh = 320;
      ctx.fillStyle = evening ? '#ffd79a' : '#fffbea';
      ctx.fillRect(wx, wy, ww, wh);
      ctx.strokeStyle = '#6b4423';
      ctx.lineWidth = 4;
      for (let x = wx; x <= wx + ww; x += ww / 4) { ctx.beginPath(); ctx.moveTo(x, wy); ctx.lineTo(x, wy + wh); ctx.stroke(); }
      for (let y = wy; y <= wy + wh; y += wh / 6) { ctx.beginPath(); ctx.moveTo(wx, y); ctx.lineTo(wx + ww, y); ctx.stroke(); }
      ctx.lineWidth = 12;
      ctx.strokeRect(wx, wy, ww, wh);

      // 掛け軸
      ctx.fillStyle = '#7a5530';
      ctx.fillRect(620, 40, 86, 12);
      ctx.fillStyle = '#f4ecd8';
      ctx.fillRect(628, 52, 70, 200);
      ctx.fillStyle = '#4a3a2a';
      ctx.font = 'bold 44px "Zen Maru Gothic", serif';
      ctx.textAlign = 'center';
      ctx.fillText('和', 663, 130);
      ctx.fillText('楽', 663, 195);
      ctx.fillStyle = '#7a5530';
      ctx.fillRect(624, 250, 78, 10);

      // 吊りランプと光
      const lx = 820, ly = 120;
      const glowR = 260 + Math.sin(t * 1.3) * 8;
      const glow = ctx.createRadialGradient(lx, ly + 20, 10, lx, ly + 20, glowR);
      glow.addColorStop(0, 'rgba(255, 214, 140, 0.75)');
      glow.addColorStop(1, 'rgba(255, 214, 140, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = '#3e2712';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx, ly - 30); ctx.stroke();
      ctx.fillStyle = '#fff1cc';
      ctx.beginPath(); ctx.ellipse(lx, ly, 52, 38, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#c99a4d';
      ctx.lineWidth = 2;
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.ellipse(lx, ly + i * 12, 52 - Math.abs(i) * 8, 4, 0, 0, Math.PI * 2); ctx.stroke(); }

      // 畳
      ctx.fillStyle = '#cfc88b';
      ctx.fillRect(0, 470, W, H - 470);
      ctx.strokeStyle = 'rgba(90, 80, 30, 0.25)';
      ctx.lineWidth = 2;
      for (let y = 480; y < H; y += 10) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.fillStyle = '#4b6b3a';
      ctx.fillRect(0, 468, W, 8);

      // 人物
      const breath = Math.sin(t * 1.6) * 3;
      const sway = Math.sin(t * 0.5) * 6;
      const cx = 480 + sway;
      const headY = 290 + breath;
      const nodding = now < this.nodUntil ? Math.sin((this.nodUntil - now) / 120) * 0.08 : 0;
      const laughing = now < this.laughUntil;
      const sipping = now < this.sipUntil;
      const waving = now < this.waveUntil;
      const laughShake = laughing ? Math.sin(now / 60) * 2 : 0;

      // 体
      ctx.fillStyle = this.cardigan;
      ctx.beginPath();
      ctx.ellipse(cx, 500 + breath * 0.5, 170, 150, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#f5ead8';
      ctx.beginPath();
      ctx.moveTo(cx - 40, 370 + breath); ctx.lineTo(cx, 450 + breath); ctx.lineTo(cx + 40, 370 + breath);
      ctx.closePath(); ctx.fill();

      // 腕（手を振る / お茶を飲む）
      if (waving) {
        const a = Math.sin(now / 110) * 0.45;
        ctx.save();
        ctx.translate(cx + 120, 420);
        ctx.rotate(-0.5 + a);
        ctx.fillStyle = this.cardigan;
        this.roundRect(-18, -150, 36, 150, 18); ctx.fill();
        ctx.fillStyle = '#f3d2b3';
        ctx.beginPath(); ctx.arc(0, -158, 24, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      // 頭
      ctx.save();
      ctx.translate(cx + laughShake, headY);
      ctx.rotate(Math.sin(t * 0.7) * 0.04 + nodding);
      // 髪（後ろ）
      ctx.fillStyle = this.elder ? '#c9c4bb' : '#3d2b1f';
      ctx.beginPath(); ctx.arc(0, -6, 82, Math.PI, 0); ctx.fill();
      if (this.elder) { ctx.beginPath(); ctx.arc(0, -92, 30, 0, Math.PI * 2); ctx.fill(); }
      // 顔
      ctx.fillStyle = '#f3d2b3';
      ctx.beginPath(); ctx.ellipse(0, 6, 72, 80, 0, 0, Math.PI * 2); ctx.fill();
      // 前髪
      ctx.fillStyle = this.elder ? '#d8d3ca' : '#3d2b1f';
      ctx.beginPath(); ctx.ellipse(0, -50, 74, 34, 0, Math.PI, 0); ctx.fill();
      // 目（まばたき）
      if (now > this.nextBlink) { this.blinkUntil = now + 140; this.nextBlink = now + 2500 + Math.random() * 3000; }
      ctx.strokeStyle = '#3b2a1a';
      ctx.fillStyle = '#3b2a1a';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      [-26, 26].forEach((ex) => {
        if (now < this.blinkUntil || laughing) {
          ctx.beginPath(); ctx.arc(ex, 2, 9, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
        } else {
          ctx.beginPath(); ctx.ellipse(ex, 0, 6, 8, 0, 0, Math.PI * 2); ctx.fill();
        }
      });
      if (this.elder) {
        ctx.strokeStyle = '#7a5c3a';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(-26, 0, 18, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(26, 0, 18, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.stroke();
      }
      // ほっぺ
      ctx.fillStyle = 'rgba(232, 120, 110, 0.35)';
      ctx.beginPath(); ctx.ellipse(-44, 28, 14, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(44, 28, 14, 9, 0, 0, Math.PI * 2); ctx.fill();
      // 口
      ctx.strokeStyle = '#8a3b2b';
      ctx.lineWidth = 4;
      if (laughing) {
        ctx.fillStyle = '#9c3b2b';
        ctx.beginPath(); ctx.ellipse(0, 40, 18, 14, 0, 0, Math.PI); ctx.fill();
      } else if (!sipping) {
        ctx.beginPath(); ctx.arc(0, 30, 16, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
      }
      ctx.restore();

      // ちゃぶ台
      ctx.fillStyle = '#6b4423';
      ctx.beginPath(); ctx.ellipse(480, 548, 330, 50, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#8b5a2b';
      ctx.beginPath(); ctx.ellipse(480, 538, 330, 46, 0, 0, Math.PI * 2); ctx.fill();

      // 湯のみ（飲む時は口元へ）
      const cupX = sipping ? cx + 30 : 600;
      const cupY = sipping ? headY + 50 : 520;
      ctx.fillStyle = '#5d7a40';
      this.roundRect(cupX - 22, cupY - 34, 44, 40, 10); ctx.fill();
      ctx.fillStyle = '#7f9d5c';
      ctx.fillRect(cupX - 22, cupY - 22, 44, 6);
      if (sipping) {
        ctx.fillStyle = '#f3d2b3';
        ctx.beginPath(); ctx.arc(cupX + 26, cupY - 10, 18, 0, Math.PI * 2); ctx.fill();
      } else {
        // 湯気
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.lineWidth = 3;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          const sx = cupX - 10 + i * 10;
          for (let k = 0; k < 30; k++) {
            const yy = cupY - 40 - k * 2;
            const xx = sx + Math.sin(t * 2 + k / 5 + i) * 4;
            if (k === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
          }
          ctx.stroke();
        }
      }
      // みかん
      ctx.fillStyle = '#f29a2e';
      ctx.beginPath(); ctx.arc(360, 522, 20, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(392, 528, 18, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4b6b3a';
      ctx.fillRect(358, 500, 5, 6);

      // リアクション
      ctx.textAlign = 'center';
      ctx.font = '72px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
      this.reactions = this.reactions.filter((r) => now - r.born < 2400);
      for (const r of this.reactions) {
        const p = (now - r.born) / 2400;
        ctx.globalAlpha = p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85;
        ctx.fillText(r.emoji, r.x * W, H - 80 - p * 320);
      }
      ctx.globalAlpha = 1;

      // 吹き出し
      if (this.bubble && now < this.bubble.until) this.drawBubble(this.bubble.text, cx);

      // ラベル
      ctx.textAlign = 'left';
      ctx.font = 'bold 22px "Zen Maru Gothic", sans-serif';
      const label = this.kind === 'family' ? '● LIVE  家族シミュレーター（デモ）' : '● LIVE  🍵 バーチャル茶の間カメラ';
      const lw = ctx.measureText(label).width + 28;
      ctx.fillStyle = 'rgba(47, 74, 109, 0.85)';
      this.roundRect(18, 18, lw, 38, 19); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillText(label, 32, 45);

      const d = new Date();
      const clock = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(59, 42, 26, 0.75)';
      ctx.font = 'bold 26px "Zen Maru Gothic", sans-serif';
      ctx.fillText(clock, W - 24, H - 22);
      if (this.kind === 'self' && this.name) {
        ctx.textAlign = 'left';
        ctx.fillText(`-${this.name}-`, 24, H - 22);
      }
    }

    drawBubble(text, cx) {
      const { ctx } = this;
      ctx.font = 'bold 30px "Zen Maru Gothic", sans-serif';
      const maxW = 360;
      const lines = [];
      let line = '';
      for (const ch of text) {
        if (ctx.measureText(line + ch).width > maxW) { lines.push(line); line = ch; } else line += ch;
      }
      if (line) lines.push(line);
      const bw = Math.min(maxW, Math.max(...lines.map((l) => ctx.measureText(l).width))) + 40;
      const bh = lines.length * 40 + 26;
      const bx = Math.min(this.c.width - bw - 20, cx + 90);
      const by = 70;
      ctx.fillStyle = 'rgba(255, 252, 244, 0.96)';
      ctx.strokeStyle = '#5a3a1e';
      ctx.lineWidth = 3;
      this.roundRect(bx, by, bw, bh, 22); ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bx + 30, by + bh - 2); ctx.lineTo(bx + 10, by + bh + 30); ctx.lineTo(bx + 60, by + bh - 2);
      ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(bx + 30, by + bh); ctx.lineTo(bx + 10, by + bh + 30); ctx.lineTo(bx + 60, by + bh); ctx.stroke();
      ctx.fillStyle = '#3b2a1a';
      ctx.textAlign = 'left';
      lines.forEach((l, i) => ctx.fillText(l, bx + 20, by + 44 + i * 40));
    }
  }

  // ------------------------------------------------------------------
  // ドア（ロビー）
  // ------------------------------------------------------------------
  function normalizeDoor(raw, base = {}) {
    const d = { ...base, ...raw };
    const participants = Array.isArray(d.participants) ? d.participants.map(participantName).filter(Boolean) : [];
    const occupant = typeof d.occupantAccount === 'string' ? d.occupantAccount : participants[0] || '';
    const mode = d.mode || (occupant ? 'relaxing' : 'empty');
    let statusText = d.statusText;
    // 仕様厳守：くつろぎ中は必ず「-{アカウント名}-がくつろいでいます。」
    if (occupant && mode === 'relaxing') statusText = relaxingText(occupant);
    if (!statusText) statusText = statusTextFor(occupant, mode);
    const timing = normTiming(d.timingScore);
    return {
      ...d,
      occupantAccount: occupant,
      mode,
      statusText,
      timingScore: timing,
      timingLabel: d.timingLabel || TIMING_LABELS[timing],
      participants,
      participantCount: Number.isFinite(d.participantCount) ? d.participantCount : participants.length,
    };
  }

  function applyLocalOverrides(doors) {
    // サーバーに届かなかった在室設定（オフライン時）をローカルで反映
    if (state.serverOnline) return doors;
    const overrides = loadLS(LS.localDoors, {});
    return doors.map((d) => (overrides[d.id] ? normalizeDoor(overrides[d.id], d) : d));
  }

  function setDoors(list) {
    const baseById = new Map(DEFAULT_DOORS.map((d) => [d.id, d]));
    state.doors = applyLocalOverrides(list.map((d) => normalizeDoor(d, baseById.get(d.id))));
    renderDoors();
    renderDoorSelect();
    // ルーム内にいる場合はドア情報を更新
    if (state.room) {
      const updated = state.doors.find((d) => d.id === state.room.door.id);
      if (updated) state.room.door = updated;
    }
  }

  async function loadDoors() {
    try {
      const res = await api('/api/doors', { timeout: 5000 });
      const doors = Array.isArray(res) ? res : res.doors;
      if (!Array.isArray(doors) || !doors.length) throw new Error('no doors');
      state.serverOnline = true;
      setDoors(doors);
    } catch {
      state.serverOnline = false;
      setDoors(DEFAULT_DOORS);
      updateConn();
    }
  }

  function renderDoorSelect() {
    const current = el.myDoorSelect.value || state.myDoorId || 'hobby';
    el.myDoorSelect.replaceChildren(...state.doors.map((d) => h('option', { value: d.id }, `${d.icon || '🚪'} ${d.name}`)));
    if (state.doors.some((d) => d.id === current)) el.myDoorSelect.value = current;
  }

  function renderDoors() {
    const seen = new Set();
    state.doors.forEach((door, idx) => {
      seen.add(door.id);
      let unit = state.doorEls.get(door.id);
      if (!unit) {
        unit = createDoorEl(door);
        state.doorEls.set(door.id, unit);
      }
      if (el.doorRow.children[idx] !== unit) el.doorRow.insertBefore(unit, el.doorRow.children[idx] || null);
      updateDoorEl(unit, door);
    });
    for (const [id, unit] of state.doorEls) {
      if (!seen.has(id)) { unit.remove(); state.doorEls.delete(id); }
    }
  }

  function createDoorEl(door) {
    const unit = h('article', { class: 'door-unit', dataset: { id: door.id } });
    unit.innerHTML = `
      <div class="door-noren" aria-hidden="true"><span></span><span></span><span></span><b class="door-noren-label"></b></div>
      <div class="door-frame">
        <div class="door-leaf">
          <div class="door-glass" aria-hidden="true"><span></span><span></span><span></span></div>
          <div class="door-plate"><p class="door-status"></p></div>
          <div class="door-knob" aria-hidden="true"></div>
        </div>
      </div>
      <div class="door-floor-glow" aria-hidden="true"></div>
      <div class="door-info">
        <h3 class="door-name"></h3>
        <p class="door-subtitle"></p>
        <span class="timing"></span>
        <p class="ai-detail"></p>
        <p class="door-people"></p>
        <button type="button" class="btn btn-lamp knock-btn">✊ コンコン ノックして入る</button>
      </div>`;
    unit.querySelector('.knock-btn').addEventListener('click', () => knockDoor(unit.dataset.id));
    unit.querySelector('.door-frame').addEventListener('click', () => knockDoor(unit.dataset.id));
    return unit;
  }

  function updateDoorEl(unit, door) {
    const statusEl = unit.querySelector('.door-status');
    const changed = statusEl.textContent && statusEl.textContent !== door.statusText;
    statusEl.textContent = door.statusText;
    if (changed) {
      statusEl.classList.remove('is-updated');
      void statusEl.offsetWidth;
      statusEl.classList.add('is-updated');
    }
    unit.dataset.theme = THEME_BY_ID[door.id] || (door.theme === 'warm-wood' ? 'indigo' : door.theme) || 'indigo';
    unit.querySelector('.door-noren-label').textContent = String(door.name || '').split(/[・（(]/)[0].slice(0, 8);
    unit.querySelector('.door-name').textContent = `${door.icon || '🚪'} ${door.name}`;
    unit.querySelector('.door-subtitle').textContent = door.subtitle || '';

    const timing = unit.querySelector('.timing');
    timing.className = `timing t-${door.timingScore}`;
    timing.textContent = door.occupantAccount ? door.timingLabel : '… だれもいません';

    const detail = unit.querySelector('.ai-detail');
    detail.replaceChildren(
      h('span', { class: 'ai-src' }, door.source === 'gemini' ? '✨Gemini' : '🏮気配'),
      door.aiDetail || (door.occupantAccount ? '' : 'ノックして中で待っていると、家族が来てくれるかもしれません。'),
    );

    const people = door.participants.filter((p) => p !== door.occupantAccount);
    unit.querySelector('.door-people').textContent = people.length
      ? `中に ${door.participants.length} 人：${door.participants.map((p) => `-${p}-`).join(' ')}`
      : '';

    const lit = !!door.occupantAccount && door.mode === 'relaxing';
    const dim = !!door.occupantAccount && !lit;
    unit.classList.toggle('is-lit', lit);
    unit.classList.toggle('is-dim', dim);
    unit.classList.toggle('is-empty', !door.occupantAccount);

    const isMine = door.occupantAccount && door.occupantAccount === state.account;
    let badge = unit.querySelector('.door-mine-badge');
    if (isMine && !badge) {
      badge = h('span', { class: 'door-mine-badge' }, 'あなたの気配');
      unit.querySelector('.door-frame').append(badge);
    } else if (!isMine && badge) badge.remove();

    unit.querySelector('.knock-btn').setAttribute('aria-label', `${door.name}のドアをノックして入る。${door.statusText}`);
  }

  // ------------------------------------------------------------------
  // 自分の気配（プレゼンス）
  // ------------------------------------------------------------------
  function updateAccountPreview() {
    const mode = el.modeSelect.value;
    el.accountPreviewText.textContent = statusTextFor(state.account, mode);
  }

  function localAnalyze(hint = '', mode = 'relaxing') {
    if (mode !== 'relaxing') {
      return { timingScore: 'busy', aiDetail: mode === 'away' ? 'お出かけ中のようです。戻ってきたらまた声をかけましょう。' : '手が離せないようです。少し時間をおいてみましょう。' };
    }
    if (/寝|眠|うとうと|お昼寝|風呂|入浴/.test(hint)) return { timingScore: 'busy', aiDetail: '今はそっとしておいて、あとで声をかけましょう。' };
    if (/料理|掃除|洗濯|電話|支度|忙/.test(hint)) return { timingScore: 'maybe', aiDetail: '家事の合間のようです。短めの声かけならちょうどよさそうです。' };
    return { timingScore: 'good', aiDetail: 'ゆったり過ごしているようです。今なら気軽に声をかけられます。' };
  }

  async function setPresence({ doorId, mode = 'relaxing', activityHint = '', imageBase64 } = {}) {
    const door = state.doors.find((d) => d.id === doorId);
    if (!door) return null;
    const name = state.account;
    const revision = ++state.presenceRevision;
    state.pendingPresence = { doorId, mode, accountName: name, activityHint };
    saveLS('tonari.pendingPresence', state.pendingPresence);

    // 1) 楽観的に即反映（仕様：入力したアカウント名で即座に切替）
    const local = localAnalyze(activityHint, mode);
    // 他のドアから自分の気配を外す
    state.doors = state.doors.map((d) => {
      if (d.id !== doorId && d.occupantAccount === name) {
        const rest = d.participants.filter((p) => p !== name);
        return normalizeDoor({ ...d, occupantAccount: rest[0] || '', participants: rest, participantCount: undefined, mode: rest[0] ? 'relaxing' : 'empty', statusText: '' });
      }
      return d;
    });
    const optimistic = normalizeDoor({
      ...door,
      occupantAccount: name,
      mode,
      statusText: statusTextFor(name, mode),
      timingScore: local.timingScore,
      timingLabel: TIMING_LABELS[local.timingScore],
      aiDetail: activityHint ? `${activityHint}` : local.aiDetail,
      participants: [...(mode === 'away' ? [] : [name]), ...door.participants.filter((p) => p !== name && p !== door.occupantAccount)],
      participantCount: undefined,
      source: 'local',
    });
    state.doors = state.doors.map((d) => (d.id === doorId ? optimistic : d));
    state.myDoorId = doorId;
    saveLS(LS.myDoor, doorId);
    renderDoors();

    // 2) サーバー (Gemini) へ
    try {
      const res = await api(`/api/doors/${encodeURIComponent(doorId)}/presence`, {
        method: 'POST',
        body: { accountName: name, mode, activityHint, imageBase64 },
        timeout: 20000,
      });
      if (revision !== state.presenceRevision) return null;
      state.pendingPresence = null;
      saveLS('tonari.pendingPresence', null);
      saveLS(LS.localDoors, {});
      state.serverOnline = true;
      if (Array.isArray(res.doors)) {
        setDoors(res.doors);
      } else {
        const updatedRaw = res.door || (res.id ? res : null);
        const analysis = res.analysis || res;
        const merged = normalizeDoor({
          ...optimistic,
          ...(updatedRaw || {}),
          ...(analysis.timingScore ? { timingScore: analysis.timingScore, timingLabel: analysis.timingLabel, aiDetail: analysis.aiDetail, source: analysis.source } : {}),
        });
        state.doors = state.doors.map((d) => (d.id === doorId ? merged : d));
        renderDoors();
      }
      return state.doors.find((d) => d.id === doorId);
    } catch {
      // オフライン：ローカルに保存しておく
      if (revision !== state.presenceRevision) return null;
      const overrides = Object.fromEntries(state.doors.map((d) => [d.id, d]));
      saveLS(LS.localDoors, overrides);
      return optimistic;
    }
  }

  async function onSetPresence() {
    const doorId = el.myDoorSelect.value;
    const mode = el.modeSelect.value;
    setBusy(el.setPresenceBtn, true, '🏮 灯しています…');
    const door = await setPresence({ doorId, mode });
    setBusy(el.setPresenceBtn, false);
    if (door) {
      toast(`🏮 「${door.name}」のドアに明かりを灯しました：${door.statusText}`);
      const unit = state.doorEls.get(doorId);
      unit?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  // 「📸 カメラ/状況からGeminiで声かけタイミングを更新」
  function openGeminiPresence() {
    let closed = false;
    let stream = null;
    let fallbackCam = null;
    const preview = h('div', { class: 'cam-preview' });
    const video = h('video', { autoplay: true, playsinline: true, muted: true });
    video.muted = true;
    preview.append(video);

    const doorSel = h('select', { id: 'gpDoor' }, ...state.doors.map((d) => h('option', { value: d.id }, `${d.icon || '🚪'} ${d.name}`)));
    doorSel.value = el.myDoorSelect.value;
    const modeSel = h('select', { id: 'gpMode' },
      h('option', { value: 'relaxing' }, '🛋️ くつろぎ中'),
      h('option', { value: 'busy' }, '🍳 ちょっと手が離せない'),
      h('option', { value: 'away' }, '🚶 お出かけ中'));
    modeSel.value = el.modeSelect.value;
    const hint = h('input', { type: 'text', id: 'gpHint', maxlength: '120', placeholder: '例：お茶を飲みながらひと休み中' });
    const chips = h('div', { class: 'memo-chips' },
      ...['お茶を飲みながらひと休み中', 'テレビを見て笑っている', '夕ごはんの支度中', '少しうとうとしている', '編み物をしている'].map((t) =>
        h('button', { type: 'button', class: 'chip', onclick: () => { hint.value = t; } }, t)));
    const useCam = h('input', { type: 'checkbox', id: 'gpUseCam', checked: true });
    const result = h('div', { class: 'result-box', hidden: true });
    const runBtn = h('button', { type: 'button', class: 'btn btn-indigo' }, '✨ Geminiで声かけタイミングを判定');
    const doneBtn = h('button', { type: 'button', class: 'btn btn-soft', onclick: closeModal }, '閉じる');

    (async () => {
      try {
        stream = await getMedia({ video: VIDEO_CONSTRAINTS, audio: false });
        if (closed) { stream.getTracks().forEach((tr) => tr.stop()); return; }
        video.srcObject = stream;
      } catch {
        if (closed) return;
        // カメラが無い場合はバーチャル茶の間の映像で代用
        const canvas = h('canvas', { width: '960', height: '600' });
        fallbackCam = new HomeCam(canvas, { name: state.account, kind: 'self' });
        fallbackCam.start();
        video.remove();
        preview.append(canvas);
        preview.append(h('span', { class: 'tile-note' }, 'カメラが使えないためバーチャル映像で代用'));
      }
    })();

    runBtn.addEventListener('click', async () => {
      let imageBase64;
      if (useCam.checked) imageBase64 = captureFrame(stream ? video : preview.querySelector('canvas'));
      setBusy(runBtn, true, '🍵 Geminiが気配を読み取っています…');
      const door = await setPresence({ doorId: doorSel.value, mode: modeSel.value, activityHint: hint.value.trim(), imageBase64 });
      setBusy(runBtn, false);
      el.myDoorSelect.value = doorSel.value;
      el.modeSelect.value = modeSel.value;
      updateAccountPreview();
      if (!door) return;
      result.hidden = false;
      result.replaceChildren(
        h('p', { class: 'result-status' }, door.statusText),
        h('p', {}, h('span', { class: `timing t-${door.timingScore}` }, door.timingLabel)),
        h('p', {}, door.aiDetail || ''),
        h('p', {}, h('span', { class: `source-tag ${door.source === 'gemini' ? '' : 'is-fallback'}` },
          door.source === 'gemini' ? '✨ Gemini 2.5 Flash で解析' : '🏮 かんたん判定（Gemini未接続）')),
      );
    });

    openModal('📸 Geminiで声かけタイミングを更新', [
      preview,
      h('p', { class: 'privacy-note' }, '🔒 映像そのものは家族に送られません。Gemini が「くつろいでいる」「手が離せない」といった気配のひとことに置きかえて、ドアにだけ表示します。'),
      h('label', { for: 'gpDoor' }, 'どのドアの気配を更新しますか？'), doorSel,
      h('label', { for: 'gpMode' }, 'いまの様子'), modeSel,
      h('label', { for: 'gpHint' }, '状況のひとこと（任意）'), hint, chips,
      h('label', { for: 'gpUseCam' }, useCam, ' カメラの1枚を Gemini の解析に使う'),
      h('div', { class: 'row' }, runBtn, doneBtn),
      result,
    ], {
      onClose: () => {
        closed = true;
        stream?.getTracks().forEach((tr) => tr.stop());
        fallbackCam?.stop();
      },
    });
  }

  function captureFrame(source, maxW = 640) {
    try {
      const sw = source.videoWidth || source.width;
      const sh = source.videoHeight || source.height;
      if (!sw || !sh) return undefined;
      const scale = Math.min(1, maxW / sw);
      const c = document.createElement('canvas');
      c.width = Math.round(sw * scale);
      c.height = Math.round(sh * scale);
      c.getContext('2d').drawImage(source, 0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', 0.72);
    } catch { return undefined; }
  }

  // ------------------------------------------------------------------
  // WebSocket（ドア同期・ノック・話題共有・WebRTCシグナリング）
  // ------------------------------------------------------------------
  function updateConn() {
    const online = state.wsReady;
    el.connStatus.classList.toggle('is-online', online);
    el.connStatus.classList.toggle('is-offline', !online);
    el.connStatus.querySelector('.conn-text').textContent = online
      ? '家族とつながっています'
      : state.serverOnline ? '再接続しています…' : 'ひとりデモモード';
  }

  function connectWS() {
    if (location.protocol === 'file:') { updateConn(); return; }
    let ws;
    try {
      ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
    } catch { scheduleReconnect(); return; }
    state.ws = ws;
    ws.addEventListener('open', () => {
      state.wsReady = true;
      state.wsRetry = 0;
      state.serverOnline = true;
      updateConn();
      send({ type: 'join_lobby', accountName: state.account });
      if (state.pendingPresence?.accountName === state.account) setPresence(state.pendingPresence);
      if (state.room) {
        // 再接続時：サーバー側の接続IDが変わるので古いピアは張り直す
        closeAllPeers();
        updateSimulatorVisibility();
        send({ type: 'enter_door', doorId: state.room.door.id, accountName: state.account, videoEnabled: true });
      }
    });
    ws.addEventListener('message', (e) => {
      let msg;
      try { msg = JSON.parse(e.data); } catch { return; }
      handleMessage(msg);
    });
    ws.addEventListener('close', () => {
      state.wsReady = false;
      closeAllPeers();
      if (state.room) { state.room.participants = new Set([state.account]); renderParticipants(); }
      updateSimulatorVisibility();
      updateConn();
      scheduleReconnect();
    });
    ws.addEventListener('error', () => { /* close で処理 */ });
  }

  function scheduleReconnect() {
    state.wsRetry = Math.min(state.wsRetry + 1, 6);
    setTimeout(connectWS, Math.min(1000 * 2 ** state.wsRetry, 15000));
  }

  function send(obj) {
    if (state.ws && state.wsReady && state.ws.readyState === WebSocket.OPEN) {
      state.ws.send(JSON.stringify(obj));
      return true;
    }
    return false;
  }

  function handleMessage(msg) {
    switch (msg.type) {
      case 'welcome':
      case 'connected':
      case 'hello':
        state.clientId = msg.clientId || msg.id || state.clientId;
        break;
      case 'doors_update':
        if (msg.clientId) state.clientId = msg.clientId;
        if (Array.isArray(msg.doors)) setDoors(msg.doors);
        break;
      case 'error':
        console.warn('[ws] server error', msg);
        if (msg.message) toast(`⚠️ ${msg.message}`);
        if (msg.requestType === 'enter_door' && state.room) resetRoom();
        break;
      case 'knock_notification':
        onKnockNotification(msg);
        break;
      case 'room_state':
        if (state.room && msg.doorId === state.room.door.id) onRoomState(msg);
        break;
      case 'topic_shared':
        if (state.room && msg.doorId === state.room.door.id && (msg.fromId ? msg.fromId !== state.clientId : msg.drawnBy !== state.account) && msg.topic) {
          showTopic(msg.topic, { source: 'shared', by: msg.drawnBy });
        }
        break;
      case 'webrtc_signal':
        if (state.room && (!msg.doorId || msg.doorId === state.room.door.id)) onSignal(msg);
        break;
      default:
        break;
    }
  }

  function onKnockNotification(msg) {
    if (!msg.fromAccount || (msg.fromId ? msg.fromId === state.clientId : msg.fromAccount === state.account)) return;
    const door = state.doors.find((d) => d.id === msg.doorId);
    playKnock(2);
    const unit = state.doorEls.get(msg.doorId);
    if (unit) knockAnim(unit);
    if (state.room) {
      if (state.room.door.id === msg.doorId) toast(`🚪 コンコン… -${msg.fromAccount}-が入ってきます`, { kind: 'knock' });
      return;
    }
    toast(`🚪 コンコン… -${msg.fromAccount}-が「${door ? door.name : 'ドア'}」をノックしました`, {
      kind: 'knock',
      duration: 9000,
      action: { label: '🚪 どうぞ（入る）', onClick: () => enterRoom(msg.doorId) },
    });
  }

  function onRoomState(msg) {
    const names = (msg.participants || []).map(participantName).filter(Boolean);
    if (msg.selfId) state.clientId = msg.selfId;
    const serverIds = new Set();
    // 同じ部屋の他の参加者へ個別に挨拶（WebRTC 接続のきっかけ）
    (msg.participants || []).forEach((p) => {
      const sid = typeof p === 'object' && p ? (p.id || p.clientId) : null;
      if (!sid || sid === state.clientId) return;
      serverIds.add(sid);
      const known = [...state.peers.values()].some((peer) => peer.serverId === sid);
      if (!known) sendSignal({ kind: 'hello' }, sid);
    });
    // 部屋から居なくなったピアを片付け
    if (msg.participants) {
      for (const [pid, peer] of [...state.peers.entries()]) {
        if (peer.serverId && !serverIds.has(peer.serverId)) removePeer(pid);
      }
    }
    state.room.participants = new Set([state.account, ...names, ...[...state.peers.values()].map((p) => p.name)]);
    renderParticipants();
    if (msg.currentTopic && !state.room.currentTopic) showTopic(msg.currentTopic, { source: 'shared', by: '家族', silent: true });
  }

  // ------------------------------------------------------------------
  // WebRTC
  // ------------------------------------------------------------------
  /**
   * サーバーは targetId（サーバー採番のクライアントID）宛てにだけ中継するため、
   * 宛先未指定のシグナル（reaction / bye）は既知の全ピアへ個別に送る。
   */
  function sendSignal(payload, targetId) {
    if (!state.room) return;
    const targets = targetId ? [targetId] : [...state.peers.values()].map((p) => p.serverId).filter(Boolean);
    for (const t of targets) {
      send({
        type: 'webrtc_signal',
        doorId: state.room.door.id,
        targetId: t,
        payload: { ...payload, from: state.peerId, name: state.account },
      });
    }
  }

  async function onSignal(msg) {
    const p = msg.payload || {};
    if (!p.from || p.from === state.peerId) return;
    if (p.to && p.to !== state.peerId) return;
    const peerId = p.from;
    const serverId = msg.fromId;
    const existing = state.peers.get(peerId);
    if (existing && existing.serverId !== serverId) removePeer(peerId);

    try {
      switch (p.kind) {
        case 'hello':
        case 'hello_ack': {
          const peer = ensurePeer(peerId, msg.accountName, serverId);
          if (p.kind === 'hello') sendSignal({ kind: 'hello_ack', to: peerId }, serverId);
          if (state.peerId < peerId && !peer.offered) await makeOffer(peer);
          break;
        }
        case 'offer': {
          const peer = ensurePeer(peerId, msg.accountName, serverId);
          await peer.pc.setRemoteDescription(p.sdp);
          await flushIce(peer);
          const answer = await peer.pc.createAnswer();
          await peer.pc.setLocalDescription(answer);
          if (state.peers.get(peerId) !== peer) return;
          sendSignal({ kind: 'answer', to: peerId, sdp: peer.pc.localDescription }, peer.serverId);
          break;
        }
        case 'answer': {
          const peer = state.peers.get(peerId);
          if (peer && peer.pc.signalingState === 'have-local-offer') {
            await peer.pc.setRemoteDescription(p.sdp);
            await flushIce(peer);
          }
          break;
        }
        case 'candidate': {
          if (!p.candidate) break;
          const peer = ensurePeer(peerId, msg.accountName, serverId);
          if (peer.pc.remoteDescription) await peer.pc.addIceCandidate(p.candidate).catch(() => {});
          else if (peer.pendingIce.length < 100) peer.pendingIce.push(p.candidate);
          break;
        }
        case 'reaction': {
          const peer = state.peers.get(peerId);
          floatEmoji(peer ? peer.tile : el.simulatorTile, p.emoji);
          break;
        }
        case 'bye':
          removePeer(peerId);
          break;
        default:
          break;
      }
    } catch (err) {
      console.warn('[webrtc] signal error', err);
    }
  }

  async function flushIce(peer) {
    const list = peer.pendingIce.splice(0);
    for (const c of list) await peer.pc.addIceCandidate(c).catch(() => {});
  }

  function ensurePeer(peerId, name, serverId) {
    let peer = state.peers.get(peerId);
    if (peer) {
      if (serverId) peer.serverId = serverId;
      if (name && name !== peer.name) { peer.name = name; peer.nameTag.textContent = `-${name}-`; }
      return peer;
    }
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    const video = h('video', { autoplay: true, playsinline: true });
    const nameTag = h('figcaption', { class: 'name-tag' }, `-${name || '家族'}-`);
    const tile = h('figure', { class: 'video-tile tile-remote tile-connecting', dataset: { peer: peerId } },
      video, nameTag, h('div', { class: 'reaction-layer' }));
    el.remoteStage.append(tile);

    peer = { pc, name: name || '家族', serverId, tile, video, nameTag, offered: false, pendingIce: [] };
    state.peers.set(peerId, peer);

    if (state.localStream) {
      state.localStream.getTracks().forEach((tr) => pc.addTrack(tr, state.localStream));
      if (!state.localStream.getAudioTracks().length) pc.addTransceiver('audio', { direction: 'recvonly' });
    }
    pc.addEventListener('icecandidate', (e) => {
      if (e.candidate) sendSignal({ kind: 'candidate', to: peerId, candidate: e.candidate }, peer.serverId);
    });
    pc.addEventListener('track', (e) => {
      const stream = e.streams[0] || new MediaStream([e.track]);
      if (video.srcObject !== stream) video.srcObject = stream;
      tile.classList.remove('tile-connecting');
      video.play().catch(() => {});
    });
    pc.addEventListener('connectionstatechange', () => {
      if (pc.connectionState === 'connected') {
        tile.classList.remove('tile-connecting');
        toast(`📹 -${peer.name}-と顔を合わせました`);
      }
      if (['failed', 'closed'].includes(pc.connectionState)) removePeer(peerId);
    });

    if (state.room) {
      state.room.participants.add(peer.name);
      renderParticipants();
    }
    updateSimulatorVisibility();
    return peer;
  }

  async function makeOffer(peer) {
    peer.offered = true;
    try {
      const offer = await peer.pc.createOffer();
      await peer.pc.setLocalDescription(offer);
      const peerId = [...state.peers.entries()].find(([, v]) => v === peer)?.[0];
      if (!peerId) return;
      sendSignal({ kind: 'offer', to: peerId, sdp: peer.pc.localDescription }, peer.serverId);
    } catch (err) { peer.offered = false; throw err; }
  }

  function removePeer(peerId) {
    const peer = state.peers.get(peerId);
    if (!peer) return;
    state.peers.delete(peerId);
    try { peer.pc.close(); } catch { /* noop */ }
    peer.tile.remove();
    if (state.room) {
      state.room.participants.delete(peer.name);
      renderParticipants();
      toast(`👋 -${peer.name}-が部屋を出ました`);
    }
    updateSimulatorVisibility();
  }

  function closeAllPeers() {
    for (const id of [...state.peers.keys()]) {
      const peer = state.peers.get(id);
      state.peers.delete(id);
      try { peer.pc.close(); } catch { /* noop */ }
      peer.tile.remove();
    }
  }

  function updateSimulatorVisibility() {
    const hasPeers = state.peers.size > 0;
    el.simulatorTile.hidden = hasPeers;
    if (state.simCam) {
      if (hasPeers) state.simCam.stop(); else if (state.room) state.simCam.start();
    }
  }

  // ------------------------------------------------------------------
  // ローカル映像（ビデオ通話強制ポリシー）
  // ------------------------------------------------------------------
  function getVirtualTrack() {
    if (!state.selfCam) {
      const canvas = document.createElement('canvas');
      canvas.width = 960;
      canvas.height = 600;
      state.selfCam = new HomeCam(canvas, { name: state.account, kind: 'self', elder: false, cardigan: '#3e5f8a' });
    }
    state.selfCam.name = state.account;
    state.selfCam.start();
    if (!state.virtualTrack || state.virtualTrack.readyState === 'ended') {
      const stream = state.selfCam.c.captureStream ? state.selfCam.c.captureStream(24) : null;
      state.virtualTrack = stream ? stream.getVideoTracks()[0] : null;
    }
    return state.virtualTrack;
  }

  /** getUserMedia にタイムアウトを付ける（許可ダイアログ放置でも入室が止まらないように） */
  function getMedia(constraints, ms = 12000) {
    if (!navigator.mediaDevices?.getUserMedia) return Promise.reject(new Error('Camera unavailable'));
    return new Promise((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => { settled = true; reject(new Error('getUserMedia timeout')); }, ms);
      navigator.mediaDevices.getUserMedia(constraints).then((s) => {
        clearTimeout(timer);
        if (settled) { s.getTracks().forEach((t) => t.stop()); return; }
        settled = true;
        resolve(s);
      }, (err) => { clearTimeout(timer); if (!settled) { settled = true; reject(err); } });
    });
  }

  async function startLocalMedia() {
    state.audioTrack = null;
    state.realVideoTrack = null;
    const md = navigator.mediaDevices;
    // ?cam=virtual … 1台でのデモ用にバーチャル茶の間カメラで入室
    const forceVirtual = new URLSearchParams(location.search).get('cam') === 'virtual';
    if (md?.getUserMedia && !forceVirtual) {
      try {
        const s = await getMedia({ video: VIDEO_CONSTRAINTS, audio: { echoCancellation: true, noiseSuppression: true } });
        state.realVideoTrack = s.getVideoTracks()[0] || null;
        state.audioTrack = s.getAudioTracks()[0] || null;
      } catch {
        try {
          const s = await getMedia({ video: VIDEO_CONSTRAINTS });
          state.realVideoTrack = s.getVideoTracks()[0] || null;
        } catch {
          try {
            const a = await getMedia({ audio: true });
            state.audioTrack = a.getAudioTracks()[0] || null;
          } catch { /* マイクも無し */ }
        }
      }
    }
    let videoTrack = state.realVideoTrack;
    state.cameraMode = 'real';
    if (!videoTrack) {
      videoTrack = getVirtualTrack();
      state.cameraMode = 'virtual';
    } else {
      watchRealTrack(videoTrack);
    }
    state.localStream = new MediaStream([videoTrack, state.audioTrack].filter(Boolean));
    if (!videoTrack || videoTrack.readyState !== 'live') throw new Error('利用できる映像がありません。このブラウザでは入室できません。');
    if (state.audioTrack) state.audioTrack.enabled = state.micOn;
    attachSelfVideo();
    return state.cameraMode;
  }

  function watchRealTrack(track) {
    track.addEventListener('ended', () => {
      if (state.room && state.cameraMode === 'real') {
        toast('📷 カメラが切れたので、バーチャル茶の間カメラに切りかえました（ビデオはONのままです）');
        switchCamera('virtual');
      }
    });
  }

  function attachSelfVideo() {
    el.selfVideo.srcObject = state.localStream;
    el.selfVideo.play().catch(() => {});
    const virtual = state.cameraMode === 'virtual';
    el.selfTile.classList.toggle('is-virtual', virtual);
    el.selfCamNote.textContent = '📷 実カメラ';
    el.selfCamNote.hidden = virtual; // バーチャル時はキャンバス内にラベルあり
    el.camRealBtn.setAttribute('aria-checked', String(!virtual));
    el.camVirtualBtn.setAttribute('aria-checked', String(virtual));
    el.selfName.textContent = `-${state.account}-`;
  }

  async function switchCamera(mode) {
    if (!state.localStream || state.switchingCamera || mode === state.cameraMode) return;
    const stream = state.localStream;
    const revision = ++state.cameraSwitch;
    state.switchingCamera = true;
    try {
      let newTrack;
      if (mode === 'real') {
        try {
          const s = await getMedia({ video: VIDEO_CONSTRAINTS });
          newTrack = s.getVideoTracks()[0];
          if (revision !== state.cameraSwitch || state.localStream !== stream) { s.getTracks().forEach((tr) => tr.stop()); return; }
          if (!newTrack) throw new Error('No video track');
          state.realVideoTrack = newTrack;
          watchRealTrack(newTrack);
        } catch {
          toast('📷 カメラが使えませんでした。バーチャル茶の間カメラのまま団らんを続けます。');
          return;
        }
      } else {
        newTrack = getVirtualTrack();
        if (!newTrack) throw new Error('Virtual camera unavailable');
      }
      const old = state.localStream.getVideoTracks()[0];
      if (old) state.localStream.removeTrack(old);
      state.localStream.addTrack(newTrack);
      const senders = [...state.peers.values()].map((peer) => peer.pc.getSenders().find((s) => s.track?.kind === 'video')).filter(Boolean);
      const results = await Promise.allSettled(senders.map((sender) => sender.replaceTrack(newTrack)));
      if (revision !== state.cameraSwitch || state.localStream !== stream) { newTrack.stop(); return; }
      if (results.some((r) => r.status === 'rejected')) {
        await Promise.allSettled(senders.map((sender) => sender.replaceTrack(old)));
        if (revision !== state.cameraSwitch || state.localStream !== stream) { newTrack.stop(); return; }
        stream.removeTrack(newTrack);
        if (old) stream.addTrack(old);
        newTrack.stop();
        if (mode === 'real') state.realVideoTrack = null;
        else { state.virtualTrack = null; state.selfCam?.stop(); }
        toast('カメラの切替を送信できませんでした。もう一度お試しください。');
        return;
      }
      if (mode === 'virtual' && state.realVideoTrack) {
        state.realVideoTrack.stop();
        state.realVideoTrack = null;
      }
      if (mode === 'real') { state.selfCam?.stop(); state.virtualTrack?.stop(); state.virtualTrack = null; }
      state.cameraMode = mode;
      attachSelfVideo();
    } catch {
      if (mode === 'virtual' && state.cameraMode === 'real') state.selfCam?.stop();
      toast('映像の切替ができませんでした。');
      if (!state.localStream?.getVideoTracks().some((tr) => tr.readyState === 'live')) {
        if (state.room) send({ type: 'leave_door', doorId: state.room.door.id });
        resetRoom();
      }
    } finally { if (revision === state.cameraSwitch) state.switchingCamera = false; }
  }

  function stopLocalMedia() {
    ++state.cameraSwitch;
    state.switchingCamera = false;
    state.localStream?.getTracks().forEach((tr) => tr.stop());
    state.virtualTrack?.stop();
    state.virtualTrack = null;
    state.realVideoTrack?.stop();
    state.audioTrack?.stop();
    state.localStream = null;
    state.realVideoTrack = null;
    state.audioTrack = null;
    state.selfCam?.stop();
    el.selfVideo.srcObject = null;
  }

  function toggleMic() {
    if (!state.audioTrack) { toast('🎙️ マイクが見つかりませんでした（映像とリアクションで団らんできます）'); return; }
    state.micOn = !state.micOn;
    state.audioTrack.enabled = state.micOn;
    el.micBtn.textContent = state.micOn ? '🎙️ マイク ON' : '🔇 マイク OFF';
    el.micBtn.setAttribute('aria-pressed', String(!state.micOn));
  }

  // ------------------------------------------------------------------
  // ノック → ドアが開く → 団らんルーム
  // ------------------------------------------------------------------
  function knockAnim(unit) {
    unit.classList.remove('is-knocking');
    void unit.offsetWidth;
    unit.classList.add('is-knocking');
    const bubble = h('span', { class: 'knock-bubble' }, 'コンコン');
    unit.querySelector('.door-frame').append(bubble);
    setTimeout(() => { bubble.remove(); unit.classList.remove('is-knocking'); }, 1000);
  }

  function knockDoor(doorId) {
    if (state.room || state.entering) return;
    const door = state.doors.find((d) => d.id === doorId);
    if (!door) return;

    const doKnock = async () => {
      state.entering = true;
      const unit = state.doorEls.get(doorId);
      playKnock(2);
      if (unit) knockAnim(unit);
      send({ type: 'knock_door', doorId, accountName: state.account });
      await sleep(900);
      if (unit) unit.classList.add('is-opening');
      await sleep(350);
      await enterRoom(doorId);
      if (unit) unit.classList.remove('is-opening');
    };

    if (door.occupantAccount && door.occupantAccount !== state.account && door.timingScore === 'busy') {
      openModal('いまは、そっとしておく？', [
        h('p', { class: 'result-status' }, door.statusText),
        h('p', {}, door.aiDetail || '今は手が離せないようです。'),
        h('div', { class: 'row' },
          h('button', { type: 'button', class: 'btn btn-soft', onclick: closeModal }, '🍵 あとにする'),
          h('button', { type: 'button', class: 'btn btn-lamp', onclick: () => { closeModal(); doKnock(); } }, '✊ それでもノックする')),
      ]);
      return;
    }
    doKnock();
  }

  async function playDoorTransition(caption, closing = false) {
    el.dtCaption.textContent = caption;
    el.doorTransition.hidden = false;
    el.doorTransition.classList.remove('is-open', 'is-close');
    void el.doorTransition.offsetWidth;
    el.doorTransition.classList.add(closing ? 'is-close' : 'is-open');
    await sleep(closing ? 1000 : 1300);
  }
  function hideDoorTransition() {
    el.doorTransition.hidden = true;
    el.doorTransition.classList.remove('is-open', 'is-close');
  }

  async function enterRoom(doorId) {
    if (state.room || state.mediaStarting) return;
    const door = state.doors.find((d) => d.id === doorId);
    if (!door) { state.entering = false; return; }
    state.entering = true;
    state.mediaStarting = true;
    clearTimeout(accountTimer);
    audioCtx();

    const transition = playDoorTransition(`おじゃまします`);
    let mode;
    try { mode = await startLocalMedia(); }
    catch (err) {
      stopLocalMedia();
      await transition;
      hideDoorTransition();
      state.entering = false;
      state.mediaStarting = false;
      toast(err.message || '映像を準備できませんでした。');
      return;
    }
    await transition;

    state.room = {
      door,
      startedAt: Date.now(),
      timer: null,
      topicsUsed: [],
      participants: new Set([state.account]),
      currentTopic: null,
    };

    // UI 切替
    el.lobby.hidden = true;
    el.lobbyControls.hidden = true;
    el.accountPreview.hidden = true;
    el.room.hidden = false;
    el.roomIcon.textContent = door.icon || '🚪';
    el.roomName.textContent = door.name;
    el.roomSub.textContent = door.subtitle || '';
    el.memoInput.value = '';
    el.memoChips.querySelectorAll('.chip').forEach((c) => c.classList.remove('is-on'));
    el.topicHistory.replaceChildren();
    el.historyCount.textContent = '0';
    el.topicCard.className = 'topic-card is-back';
    window.scrollTo({ top: 0 });
    hideDoorTransition();
    state.entering = false;
    state.mediaStarting = false;
    const roomSession = state.room;

    // 家族シミュレーター（1人でも寂しくないように）
    const simName = door.occupantAccount && door.occupantAccount !== state.account
      ? door.occupantAccount
      : (state.doors.find((d) => d.occupantAccount && d.occupantAccount !== state.account)?.occupantAccount || 'おばあちゃん');
    el.simulatorName.textContent = `-${simName}-`;
    if (!state.simCam) state.simCam = new HomeCam(el.simulatorCanvas, { kind: 'family', elder: true, cardigan: '#a35866' });
    state.simCam.name = simName;
    state.simCam.elder = !/kaigunn|yoiko|_\d|[a-z]{4,}/i.test(simName) || /おばあ|おじい|祖|母|父/.test(simName);
    updateSimulatorVisibility();
    state.simCam.start();
    setTimeout(() => {
      if (state.room !== roomSession) return;
      state.simCam.wave();
      state.simCam.say('あら、いらっしゃい！顔が見られて嬉しいわ。');
    }, 600);

    renderParticipants();
    state.room.timer = setInterval(() => {
      el.roomTimer.textContent = formatTime((Date.now() - state.room.startedAt) / 1000);
    }, 1000);
    el.roomTimer.textContent = '00:00';

    // サーバーから room_state（参加者ID一覧）が届いたら、各ピアへ hello を送って WebRTC 接続
    send({ type: 'enter_door', doorId, accountName: state.account, videoEnabled: true });

    if (mode === 'virtual') {
      toast('📷 カメラが使えないため「🍵 バーチャル茶の間カメラ」で入室しました。顔を見せ合う団らんはそのままです。', { duration: 6000 });
    }
    // 最初の1枚を自動でめくって、会話のきっかけに
    setTimeout(() => { if (state.room === roomSession && !state.room.currentTopic) drawRandomTopic(); }, 1800);
  }

  function renderParticipants() {
    if (!state.room) return;
    const names = [...state.room.participants].filter(Boolean);
    el.participantsBar.replaceChildren(
      h('span', { class: 'participant' }, '🏠 いまこの部屋に：'),
      ...names.map((n) => h('span', { class: `participant ${n === state.account ? 'is-me' : ''}` }, `-${n}-${n === state.account ? '（あなた）' : ''}`)),
    );
  }

  function floatEmoji(tile, emoji) {
    if (!tile) return;
    const layer = tile.querySelector('.reaction-layer');
    if (!layer) return;
    const e = h('span', { class: 'float-emoji' }, emoji);
    e.style.left = `${15 + Math.random() * 65}%`;
    layer.append(e);
    setTimeout(() => e.remove(), 2500);
  }

  function sendReaction(emoji) {
    floatEmoji(el.selfTile, emoji);
    state.selfCam?.react(emoji);
    sendSignal({ kind: 'reaction', emoji });
    if (state.peers.size === 0 && state.simCam) {
      const sim = state.simCam;
      setTimeout(() => {
        switch (emoji) {
          case '👋': sim.wave(); sim.say('はーい、ちゃんと見えてるわよ〜'); break;
          case '😊': sim.laugh(); sim.react('😊'); break;
          case '😂': sim.laugh(); sim.react('😂'); sim.say('あはは、おかしいわねぇ！'); break;
          case '👍': sim.nod(); sim.say('うんうん、そうよね！'); break;
          case '❤️': sim.react('❤️'); sim.say('ありがとうね。嬉しいわ。'); break;
          case '🍵': sim.sip(); sim.say('いただきます。あったかいわねぇ。'); break;
          default: sim.react(emoji);
        }
      }, 700);
    }
  }

  // ------------------------------------------------------------------
  // 話題カード（100件デッキ + Gemini 生成）
  // ------------------------------------------------------------------
  async function loadTopics() {
    try {
      const res = await fetch('data/topics.json');
      const json = await res.json();
      state.topics = Array.isArray(json) ? json : json.topics || [];
    } catch {
      state.topics = [];
    }
    if (!state.topics.length) state.topics = EMERGENCY_TOPICS;
    renderCategoryChips();
  }

  function renderCategoryChips() {
    const cats = [...new Set(state.topics.map((t) => t.category))];
    const mk = (value, label) => h('button', {
      type: 'button', class: 'chip', 'aria-pressed': String(state.topicFilter === value),
      onclick: () => { state.topicFilter = value; renderCategoryChips(); },
    }, label);
    el.categoryChips.replaceChildren(mk('all', `すべて（${state.topics.length}）`), ...cats.map((c) => mk(c, c)));
    el.drawTopicBtn.textContent = state.topicFilter === 'all'
      ? `🎲 話題カードをランダムに引く（全${state.topics.length}件）`
      : `🎲「${state.topicFilter}」から引く`;
  }

  function localRandomTopic() {
    let pool = state.topicFilter === 'all' ? state.topics : state.topics.filter((t) => t.category === state.topicFilter);
    if (!pool.length) pool = state.topics;
    const fresh = pool.filter((t) => !state.recentTopicIds.includes(t.id));
    return pick(fresh.length ? fresh : pool);
  }

  async function drawRandomTopic() {
    if (!state.room) return;
    const room = state.room;
    setBusy(el.drawTopicBtn, true, '🎴 カードをめくっています…');
    let topic = null;
    let source = 'curated-100';
    try {
      const q = state.topicFilter === 'all' ? '' : `?category=${encodeURIComponent(state.topicFilter)}`;
      const res = await api(`/api/topics/random${q}`, { timeout: 3000 });
      topic = res.topic;
      // 直近と同じカードならローカルで引き直す
      if (topic && state.recentTopicIds.includes(topic.id)) topic = localRandomTopic();
    } catch {
      topic = localRandomTopic();
    }
    if (!topic) topic = localRandomTopic();
    await sleep(250);
    setBusy(el.drawTopicBtn, false);
    if (state.room !== room) return;
    showTopic(topic, { source });
    shareTopic(topic);
  }

  function roomContext() {
    const d = new Date();
    const hour = d.getHours();
    const timeOfDay = hour < 10 ? '朝' : hour < 15 ? '昼下がり' : hour < 18 ? '夕方' : '夜';
    const recent = state.room?.topicsUsed.slice(-3).map((t) => t.topic).join(' / ');
    const memo = el.memoInput.value.trim();
    return [
      `${d.getMonth() + 1}月の${timeOfDay}、離れて暮らす家族とのビデオ団らん`,
      recent ? `さっきまでの話題：${recent}` : '',
      memo ? `気づいたこと：${memo}` : '',
    ].filter(Boolean).join('。').slice(0, 2000);
  }

  async function generateGeminiTopic() {
    if (!state.room) return;
    const room = state.room;
    setBusy(el.geminiTopicBtn, true, '✨ Gemini が話題を考えています…');
    const others = [...state.room.participants].filter((n) => n !== state.account);
    let topic = null;
    let source = 'gemini';
    try {
      const res = await api('/api/topics/generate', {
        method: 'POST',
        timeout: 20000,
        body: {
          accountName: state.account,
          partnerAccount: others[0] || state.room.door.occupantAccount || 'おばあちゃん',
          doorName: state.room.door.name,
          context: roomContext(),
        },
      });
      topic = res.topic;
      source = res.source === 'gemini' ? 'gemini' : 'gemini-fallback';
    } catch {
      topic = localRandomTopic();
      source = 'gemini-fallback';
    }
    setBusy(el.geminiTopicBtn, false);
    if (!topic || state.room !== room) return;
    if (source === 'gemini-fallback') toast('✨ Gemini がひと休み中のため、100選からぴったりのカードを選びました');
    showTopic(topic, { source });
    shareTopic(topic, source);
  }

  function shareTopic(topic, source) {
    if (!state.room) return;
    send({
      type: 'share_topic',
      doorId: state.room.door.id,
      topic: { id: topic.id ?? `card-${Date.now()}`, category: topic.category || '団らん', topic: topic.topic, hint: topic.hint || '' },
      drawnBy: state.account,
    });
  }

  function showTopic(topic, { source = 'curated-100', by = '', silent = false } = {}) {
    if (!state.room || !topic) return;
    const t = {
      id: topic.id,
      category: topic.category || '団らん',
      topic: topic.topic || topic.text || '',
      hint: topic.hint || '',
    };
    if (!t.topic) return;
    state.room.currentTopic = t;
    state.room.topicsUsed.push({ id: t.id, category: t.category, topic: t.topic, source });
    if (typeof t.id === 'number') {
      state.recentTopicIds.push(t.id);
      if (state.recentTopicIds.length > 30) state.recentTopicIds.shift();
    }

    const isGemini = source === 'gemini' || topic.source === 'gemini';
    const card = el.topicCard;
    card.classList.remove('is-back', 'is-flipping', 'is-gemini');
    el.topicCategory.textContent = t.category;
    el.topicText.textContent = t.topic;
    el.topicHint.textContent = t.hint ? `💡 ${t.hint}` : '';
    let label;
    if (source === 'shared') label = `🤝 -${by || '家族'}-が引いたカード`;
    else if (isGemini) label = '✨ Gemini 2.5 Flash 生成';
    else if (source === 'gemini-fallback') label = `🎴 100選 No.${t.id ?? '-'}（Gemini休憩中）`;
    else label = `🎴 団らん100選 No.${t.id ?? '-'}`;
    el.topicSource.textContent = label;
    if (isGemini) card.classList.add('is-gemini');
    void card.offsetWidth;
    card.classList.add('is-flipping');
    if (!silent) playChime();

    // 履歴
    const li = h('li', { title: 'もう一度表示', onclick: () => {
      el.topicCategory.textContent = t.category;
      el.topicText.textContent = t.topic;
      el.topicHint.textContent = t.hint ? `💡 ${t.hint}` : '';
      el.topicSource.textContent = label;
      card.classList.toggle('is-gemini', isGemini);
    } }, `${isGemini ? '✨' : '🎴'} ${t.topic}`);
    el.topicHistory.prepend(li);
    el.historyCount.textContent = String(state.room.topicsUsed.length);

    // 家族シミュレーターのお返事
    if (state.peers.size === 0 && state.simCam && source !== 'shared') {
      const key = Object.keys(SIM_REPLIES).find((k) => t.category.includes(k)) || 'default';
      setTimeout(() => {
        if (!state.room) return;
        state.simCam.nod();
        state.simCam.say(pick(SIM_REPLIES[key]));
      }, 1600);
    }
  }

  // ------------------------------------------------------------------
  // 退室 → 安心見守りレポート
  // ------------------------------------------------------------------
  function resetRoom() {
    if (state.room) clearInterval(state.room.timer);
    state.room = null;
    closeAllPeers();
    stopLocalMedia();
    state.simCam?.stop();
    el.room.hidden = true;
    el.lobby.hidden = false;
    el.lobbyControls.hidden = false;
    el.accountPreview.hidden = false;
    hideDoorTransition();
  }

  async function leaveRoom() {
    if (!state.room) return;
    const room = state.room;
    const durationSec = Math.min(86400, Math.max(0, Math.round((Date.now() - room.startedAt) / 1000)));
    const notes = el.memoInput.value.trim();
    const participants = [...room.participants].filter(Boolean);

    setBusy(el.leaveBtn, true, '🚪 ドアを閉めています…');
    sendSignal({ kind: 'bye' });
    send({ type: 'leave_door', doorId: room.door.id, accountName: state.account });
    clearInterval(room.timer);
    closeAllPeers();
    stopLocalMedia();
    state.simCam?.stop();
    state.room = null;

    await playDoorTransition('おじゃましました', true);
    el.room.hidden = true;
    el.lobby.hidden = false;
    el.lobbyControls.hidden = false;
    el.accountPreview.hidden = false;
    hideDoorTransition();
    setBusy(el.leaveBtn, false);
    window.scrollTo({ top: 0 });

    openModal('📓 安心見守りレポート', [
      h('div', { class: 'loading-tea' }, h('span', { class: 'cup' }, '🍵'), h('p', {}, 'Gemini が今日の団らんをふり返っています…')),
    ]);
    const reportModal = modalRevision;

    const payload = {
      doorId: room.door.id,
      doorName: room.door.name,
      accountName: state.account,
      participants,
      durationSec,
      topicsUsed: room.topicsUsed.slice(-100).map(({ id, category, topic }, i) => ({
        id: id ?? `card-${i + 1}`, category: String(category).slice(0, 80), topic: String(topic).slice(0, 500),
      })),
      notes,
    };

    let summary;
    try {
      const res = await api('/api/summary', { method: 'POST', body: payload, timeout: 25000 });
      summary = normalizeSummary(res.summary || res.log || res, payload);
    } catch {
      summary = localSummary(payload);
    }
    saveLocalLog(summary);
    if (reportModal === modalRevision && !state.room) renderSummaryModal(summary);
    await loadLogs();
  }

  function normalizeSummary(s, payload = {}) {
    const highlights = Array.isArray(s.highlights) ? s.highlights : s.highlights ? [String(s.highlights)] : [];
    let next = s.nextTopicSuggestion;
    if (next && typeof next === 'object') next = next.topic || next.text || '';
    let score = s.vitalityScore;
    if (typeof score === 'string' && score.trim() !== '') score = Number(score);
    if (typeof score !== 'number' || !Number.isFinite(score)) score = null;
    return {
      title: s.title || `${payload.doorName || s.doorName || '家族'}の団らん記録`,
      vitalityScore: score === null ? null : Math.max(0, Math.min(100, Math.round(score))),
      mood: s.mood || '様子は未評価',
      highlights,
      nextTopicSuggestion: next || '',
      createdAt: s.createdAt || new Date().toISOString(),
      source: s.source || 'fallback',
      doorName: s.doorName || payload.doorName || '',
      durationSec: s.durationSec ?? payload.durationSec,
    };
  }

  function localSummary(p) {
    const mins = Math.max(1, Math.round(p.durationSec / 60));
    const highlights = [
      `団らん時間：約${mins}分`,
      `参加者：${p.participants.map((n) => `-${n}-`).join('、')}`,
    ];
    if (p.topicsUsed.length) highlights.push(`話した話題：${p.topicsUsed.slice(-3).map((t) => t.topic).join(' / ')}`);
    if (p.notes) highlights.push(`メモ：${p.notes}`);
    return normalizeSummary({
      title: `${p.doorName}の団らん記録`,
      vitalityScore: null,
      mood: p.notes ? 'メモをもとに記録しました（Gemini未接続）' : '様子は未評価',
      highlights,
      nextTopicSuggestion: localRandomTopic()?.topic || '',
      source: 'fallback',
    }, p);
  }

  function vitalityNode(score) {
    if (score === null || score === undefined) {
      return h('p', { class: 'vitality-na' }, '元気度：未評価（「気づきメモ」を書くと、Gemini が会話の活気の目安を出します）');
    }
    const bar = h('span');
    const node = h('div', { class: 'vitality' }, h('strong', {}, `元気度 ${score}`), h('div', { class: 'vitality-bar' }, bar));
    bar.style.width = '0%';
    requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.width = `${score}%`; }));
    return node;
  }

  function renderSummaryModal(s) {
    openModal(`📓 ${s.title}`, [
      h('p', {}, h('span', { class: `source-tag ${s.source === 'gemini' ? '' : 'is-fallback'}` },
        s.source === 'gemini' ? '✨ Gemini 2.5 Flash がまとめました' : '🏮 かんたん記録（Gemini未接続）'),
        '　', h('time', {}, formatDate(s.createdAt))),
      vitalityNode(s.vitalityScore),
      h('p', { class: 'summary-mood' }, `🌤 様子：${s.mood}`),
      s.highlights.length ? h('ul', { class: 'summary-highlights' }, ...s.highlights.map((x) => h('li', {}, x))) : null,
      s.nextTopicSuggestion ? h('p', { class: 'summary-next' }, `🎴 次回の話題：${s.nextTopicSuggestion}`) : null,
      h('p', { class: 'privacy-note' }, '🔒 この記録は医療的な診断ではありません。家族で様子を気にかけるための「やさしいメモ」です。'),
      h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn btn-lamp', onclick: () => {
        closeModal();
        document.querySelector('.care-notes')?.scrollIntoView({ behavior: 'smooth' });
      } }, '📓 見守りノートで見る')),
    ]);
  }

  function saveLocalLog(summary) {
    const logs = loadLS(LS.logs, []);
    logs.unshift(summary);
    saveLS(LS.logs, logs.slice(0, 30));
  }

  async function loadLogs() {
    let server = [];
    try {
      const res = await api('/api/logs', { timeout: 5000 });
      server = Array.isArray(res) ? res : res.logs || [];
    } catch { /* オフライン */ }
    const local = loadLS(LS.logs, []);
    const seen = new Set();
    const merged = [];
    for (const raw of [...server, ...local]) {
      if (!raw || typeof raw !== 'object') continue;
      const s = normalizeSummary(raw.summary ? { ...raw, ...raw.summary } : raw, raw);
      const key = `${s.title}|${s.createdAt}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(s);
    }
    merged.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    state.logs = merged.slice(0, 12);
    renderLogs();
  }

  function renderLogs() {
    if (!state.logs.length) {
      el.careList.replaceChildren(h('li', { class: 'care-empty' }, 'まだ記録はありません。ドアをノックして、最初の団らんを始めましょう。'));
      return;
    }
    el.careList.replaceChildren(...state.logs.map((s) => h('li', { class: 'care-item' },
      h('h3', {}, s.title),
      h('time', {}, `${formatDate(s.createdAt)}${s.durationSec ? `・約${Math.max(1, Math.round(s.durationSec / 60))}分` : ''}　`),
      h('span', { class: `source-tag ${s.source === 'gemini' ? '' : 'is-fallback'}` }, s.source === 'gemini' ? '✨Gemini' : '🏮記録'),
      vitalityNode(s.vitalityScore),
      h('p', { class: 'summary-mood' }, `🌤 ${s.mood}`),
      s.highlights.length ? h('ul', {}, ...s.highlights.slice(0, 4).map((x) => h('li', {}, x))) : null,
      s.nextTopicSuggestion ? h('p', { class: 'care-next' }, `🎴 次回：${s.nextTopicSuggestion}`) : null,
    )));
  }

  // ------------------------------------------------------------------
  // イベント
  // ------------------------------------------------------------------
  let accountTimer = null;
  el.accountInput.value = state.account;
  el.accountInput.addEventListener('input', () => {
    const name = clampName(el.accountInput.value);
    if (!name) return;
    state.account = name;
    updateAccountPreview();
    clearTimeout(accountTimer);
    accountTimer = setTimeout(() => {
      saveLS(LS.account, name);
      if (!state.room && !state.entering) send({ type: 'join_lobby', accountName: name });
      // すでに自分のドアに明かりを灯していれば、新しい名前で即座に更新
      const mine = state.myDoorId && state.doors.find((d) => d.id === state.myDoorId);
      if (mine && mine.occupantAccount) setPresence({ doorId: state.myDoorId, mode: el.modeSelect.value });
      else renderDoors();
    }, 450);
  });
  el.accountInput.addEventListener('blur', () => {
    if (!clampName(el.accountInput.value)) el.accountInput.value = state.account;
  });
  el.accountInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') onSetPresence(); });
  el.modeSelect.addEventListener('change', updateAccountPreview);
  el.setPresenceBtn.addEventListener('click', onSetPresence);
  el.geminiPresenceBtn.addEventListener('click', openGeminiPresence);

  el.camRealBtn.addEventListener('click', () => switchCamera('real'));
  el.camVirtualBtn.addEventListener('click', () => switchCamera('virtual'));
  el.micBtn.addEventListener('click', toggleMic);
  document.querySelectorAll('.react').forEach((b) => b.addEventListener('click', () => sendReaction(b.dataset.emoji)));

  el.drawTopicBtn.addEventListener('click', drawRandomTopic);
  el.geminiTopicBtn.addEventListener('click', generateGeminiTopic);
  el.leaveBtn.addEventListener('click', leaveRoom);

  el.memoChips.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    const text = chip.dataset.memo;
    const parts = el.memoInput.value.split('。').map((s) => s.trim()).filter(Boolean);
    const on = !parts.includes(text);
    const next = on ? [...parts, text] : parts.filter((s) => s !== text);
    el.memoInput.value = next.length ? `${next.join('。')}。` : '';
    chip.classList.toggle('is-on', on);
  });

  window.addEventListener('beforeunload', () => {
    if (state.room) {
      sendSignal({ kind: 'bye' });
      send({ type: 'leave_door', doorId: state.room.door.id, accountName: state.account });
    }
  });

  // ------------------------------------------------------------------
  // 起動
  // ------------------------------------------------------------------
  async function boot() {
    updateAccountPreview();
    updateConn();
    await Promise.all([loadDoors(), loadTopics()]);
    if (state.myDoorId && state.doors.some((d) => d.id === state.myDoorId)) el.myDoorSelect.value = state.myDoorId;
    else el.myDoorSelect.value = state.doors.find((d) => d.occupantAccount === state.account)?.id || state.doors[0]?.id;
    connectWS();
    loadLogs();
    // デモ用ディープリンク：?door=chanoma で、そのドアをノックしてすぐ入室
    const deep = new URLSearchParams(location.search).get('door');
    if (deep && state.doors.some((d) => d.id === deep)) setTimeout(() => knockDoor(deep), 600);
  }

  boot();
})();
