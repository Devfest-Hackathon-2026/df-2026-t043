/* 団らんルームのストリートビュー。通話の映像・音声とは独立して動く。 */
(() => {
  'use strict';

  const LOAD_TIMEOUT = 12000;
  const COMMAND_TIMEOUT = 5000;
  const UPDATE_INTERVAL = 200;
  const POSITION_TOLERANCE_METRES = 8;
  const VIEW_UNAVAILABLE = '景色を表示できませんでした。通話は続けられます。';
  const MAPS_AUTH_ERROR = 'Google マップを認証できませんでした。通話は続けられます。';

  function nearPosition(actual, expected) {
    if (!actual) return false;
    const metresPerDegree = 111320;
    const latitude = actual.lat - expected.lat;
    const longitude = ((actual.lng - expected.lng + 540) % 360) - 180;
    const longitudeScale = Math.cos(expected.lat * Math.PI / 180);
    return Math.hypot(latitude, longitude * longitudeScale) * metresPerDegree <= POSITION_TOLERANCE_METRES;
  }

  window.createWalkPanel = ({ send, getClientId, loadConfig }) => {
    const byId = (id) => document.getElementById(id);
    const panel = byId('walkPanel');
    if (!panel) return null;
    const stage = panel.parentElement;
    const settings = byId('walkCallSettings');
    const setup = byId('walkSetup');
    const place = byId('walkPlace');
    const start = byId('walkStart');
    const stop = byId('walkStop');
    const status = byId('walkStatus');
    const view = byId('walkView');

    let room = null;
    let session = null;
    let pending = null;
    let configPromise;
    let mapsPromise;
    let mapsLoadAttempt = 0;
    let authFailed = false;

    function render() {
      panel.hidden = !room?.config || room.config.enabled === false;
      const active = Boolean(session);
      const walking = active && !session.error && pending?.type !== 'walk_stop';
      const previousFocus = document.activeElement;
      const focusWasInView = view.contains(previousFocus);
      if (stage.classList.contains('is-walking') !== walking) {
        stage.classList.toggle('is-walking', walking);
        settings.open = !walking || settings.contains(previousFocus);
      }
      const canStart = room?.connected && room.config?.apiKey && place.value && !authFailed;
      setup.hidden = active;
      place.disabled = start.disabled = !canStart || Boolean(pending);
      stop.hidden = !active;
      stop.disabled = pending?.type === 'walk_stop';
      view.hidden = !walking || !session.renderer?.panorama;

      let message = '家族とつながると散歩を始められます。';
      if (session?.error) message = session.error;
      else if (pending?.type === 'walk_start') message = '散歩を始めています…';
      else if (pending?.type === 'walk_stop') message = '散歩を終えています…';
      else if (session) {
        const name = room.config?.places.find(({ id }) => id === session.state.placeId)?.name;
        const label = name ? `${name}　` : '';
        if (session.renderer?.ready) {
          if (session.guide) message = label + '案内役です。矢印で進み、ドラッグで見回せます。';
          else message = label + (session.renderer.approximate ? '案内役の近くの景色を見ています。' : '案内役と同じ景色を見ています。');
        }
        else if (!session.guide && !session.state.pano) message = label + '案内役の景色を待っています…';
        else message = label + '景色を読み込んでいます…';
      } else if (room?.notice) message = room.notice;
      else if (authFailed) message = MAPS_AUTH_ERROR;
      else if (room?.configError) message = '散歩の設定を読み込めませんでした。';
      else if (room?.connected && !room.config) message = '散歩先を読み込んでいます…';
      else if (room?.config && !canStart) message = 'この環境では散歩を利用できません。通話は続けられます。';
      else if (canStart) message = '散歩先を選ぶと、通話中の家族と同じ景色を楽しめます。';
      if (status.textContent !== message) status.textContent = message;

      if (active && !stop.disabled && (previousFocus === start || (focusWasInView && view.hidden))) stop.focus();
      if (!active && !start.disabled && previousFocus === stop) start.focus();
    }

    function destroyRenderer() {
      const renderer = session?.renderer;
      if (!renderer) return;
      session.renderer = null;
      clearTimeout(renderer.viewTimer);
      clearTimeout(renderer.updateTimer);
      renderer.observer?.disconnect();
      renderer.listeners.forEach((listener) => listener.remove());
      renderer.panorama?.setVisible(false);
      renderer.mount?.remove();
    }

    function failView(message = VIEW_UNAVAILABLE) {
      if (!session || pending?.type === 'walk_stop') return;
      const focusWasInView = view.contains(document.activeElement);
      session.error = message;
      destroyRenderer();
      if (session.guide) sendCommand('walk_stop', { sessionId: session.state.sessionId });
      render();
      if (focusWasInView && !stop.disabled) stop.focus();
    }

    function loadMaps(apiKey) {
      if (authFailed) return Promise.reject(new Error('Maps authentication failed'));
      if (mapsPromise) return mapsPromise;
      const attempt = new Promise((resolve, reject) => {
        const callback = `tonariWalkMapsReady${++mapsLoadAttempt}`;
        let script;
        let settled = false;
        const fail = () => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          if (script) { script.remove(); window[callback] = () => {}; }
          reject(new Error('Maps loader failed'));
        };
        const timer = setTimeout(fail, LOAD_TIMEOUT);
        window.gm_authFailure = () => {
          authFailed = true;
          fail();
          failView(MAPS_AUTH_ERROR);
          render();
        };
        const ready = async () => {
          try {
            const library = await window.google.maps.importLibrary('streetView');
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            delete window[callback];
            resolve(library);
          } catch { fail(); }
        };
        if (window.google?.maps?.importLibrary) { ready(); return; }
        window[callback] = ready;
        const params = new URLSearchParams({ key: apiKey, callback, loading: 'async', v: 'quarterly', language: 'ja' });
        script = document.createElement('script');
        script.async = true;
        script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
        script.onerror = fail;
        document.head.append(script);
      });
      mapsPromise = attempt;
      attempt.catch(() => { if (mapsPromise === attempt) mapsPromise = null; });
      return attempt;
    }

    function prepareConfig(currentRoom) {
      currentRoom.requestedConfig = true;
      configPromise ??= loadConfig().catch(() => { configPromise = null; return null; });
      configPromise.then((config) => {
        if (room !== currentRoom) return;
        if (config && Array.isArray(config.places)) {
          currentRoom.config = config;
          const selection = place.value;
          place.replaceChildren(...config.places.map(({ id, name }) => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = name;
            return option;
          }));
          if (config.places.some(({ id }) => id === selection)) place.value = selection;
        } else currentRoom.configError = true;
        showWalk();
      });
    }

    function scheduleUpdate(renderer) {
      if (session?.renderer !== renderer || !renderer.ready || renderer.updateTimer !== undefined) return;
      const flush = () => {
        renderer.updateTimer = undefined;
        if (session?.renderer !== renderer) return;
        const panorama = renderer.panorama;
        const pano = panorama.getPano();
        const location = panorama.getLocation();
        const position = location?.pano === pano ? location?.latLng?.toJSON() : null;
        const pov = panorama.getPov();
        const zoom = panorama.getZoom();
        if (panorama.getStatus() !== 'OK' || typeof pano !== 'string' || !pano.trim() || !position || !pov ||
            ![position.lat, position.lng, pov.heading, pov.pitch, zoom].every(Number.isFinite)) return;
        const heading = ((pov.heading % 360) + 360) % 360;
        const update = { pano, position, pov: { heading, pitch: pov.pitch }, zoom: Math.min(5, Math.max(0, zoom)) };
        const signature = JSON.stringify(update);
        if (signature === renderer.lastUpdate) return;
        if (send({ type: 'walk_update', doorId: room.doorId, sessionId: session.state.sessionId, ...update })) {
          renderer.lastUpdate = signature;
          renderer.lastSent = performance.now();
        }
      };
      // Coalesce events and send the final view once the rate-limit window closes.
      renderer.updateTimer = setTimeout(flush, Math.max(0, renderer.lastSent + UPDATE_INTERVAL - performance.now()));
    }

    function requestPano(renderer, pano, position) {
      renderer.request = { pano, position };
      renderer.loadedPano = null;
      clearTimeout(renderer.viewTimer);
      renderer.viewTimer = setTimeout(() => failView(), LOAD_TIMEOUT);
      if (position) renderer.panorama.setPosition(position);
      else renderer.panorama.setPano(pano);
    }

    function follow(renderer) {
      const latest = session.state;
      if (renderer.request) return;
      if (renderer.loadedPano !== latest.pano) {
        requestPano(renderer, latest.pano);
      } else if (renderer.appliedRevision !== latest.revision) {
        renderer.panorama.setPov(latest.pov);
        renderer.panorama.setZoom(latest.zoom);
        renderer.appliedRevision = latest.revision;
        renderer.ready = true;
        render();
      }
    }

    function onPanoStatus(renderer) {
      if (session?.renderer !== renderer) return;
      const panorama = renderer.panorama;
      const requested = renderer.request;
      if (!requested) {
        if (session.guide) scheduleUpdate(renderer);
        return;
      }
      clearTimeout(renderer.viewTimer);
      renderer.request = null;
      const statusOK = panorama.getStatus() === 'OK';
      const matches = requested.position
        ? nearPosition(panorama.getPosition()?.toJSON(), requested.position)
        : panorama.getPano() === requested.pano;
      if (statusOK && matches) {
        renderer.loadedPano = requested.pano;
        renderer.approximate = Boolean(requested.position) && panorama.getPano() !== requested.pano;
      }
      else if (session.guide) { failView(); return; }
      else if (requested.pano === session.state.pano) {
        if (requested.position) failView();
        // Google panorama IDs may differ between browsers. Use the shared coordinates for one nearby lookup.
        else requestPano(renderer, requested.pano, session.state.position);
        return;
      }
      if (session.guide) {
        panorama.setPov(session.state.pov);
        panorama.setZoom(session.state.zoom);
        renderer.ready = true;
        render();
        scheduleUpdate(renderer);
      } else follow(renderer);
    }

    async function openRenderer(current, apiKey) {
      const renderer = { listeners: [], lastSent: -Infinity };
      current.renderer = renderer;
      const stillOpen = () => session === current && current.renderer === renderer;
      try {
        const { StreetViewPanorama, StreetViewService, StreetViewPreference } = await loadMaps(apiKey);
        if (!stillOpen()) return;
        let pano = current.state.pano;
        if (current.guide && !pano) {
          renderer.viewTimer = setTimeout(() => failView(), LOAD_TIMEOUT);
          const result = await new StreetViewService().getPanorama({
            location: current.state.position, radius: 200, preference: StreetViewPreference.NEAREST,
          });
          if (!stillOpen()) return;
          pano = result.data?.location?.pano;
          if (!pano) { failView(); return; }
        }

        const mount = document.createElement('div');
        mount.className = 'walk-pano';
        renderer.mount = mount;
        view.append(mount);
        view.hidden = false;
        const panorama = new StreetViewPanorama(mount, {
          visible: true, disableDefaultUI: true, addressControl: true,
          linksControl: current.guide, clickToGo: current.guide, zoomControl: current.guide,
          fullscreenControl: false, scrollwheel: false,
          motionTracking: false, motionTrackingControl: false,
        });
        renderer.panorama = panorama;
        if (!stillOpen()) { panorama.setVisible(false); return; }
        renderer.listeners.push(panorama.addListener('status_changed', () => onPanoStatus(renderer)));
        if (current.guide) {
          for (const event of ['pano_changed', 'position_changed', 'pov_changed', 'zoom_changed']) {
            renderer.listeners.push(panorama.addListener(event, () => scheduleUpdate(renderer)));
          }
        }
        if (window.ResizeObserver) {
          renderer.observer = new window.ResizeObserver(() => {
            if (stillOpen()) window.google.maps.event.trigger(panorama, 'resize');
          });
          renderer.observer.observe(mount);
        }
        if (current.guide) requestPano(renderer, pano);
        else follow(renderer);
      } catch {
        if (stillOpen()) failView(authFailed ? MAPS_AUTH_ERROR : VIEW_UNAVAILABLE);
      }
    }

    function showWalk() {
      if (session && !session.error && pending?.type !== 'walk_stop') {
        if (authFailed) { failView(MAPS_AUTH_ERROR); return; }
        if (room.configError || (room.config && !room.config.apiKey)) { failView(); return; }
        if (room.config?.apiKey && !session.renderer && (session.guide || session.state.pano)) {
          openRenderer(session, room.config.apiKey);
        } else if (!session.guide && session.renderer?.panorama) follow(session.renderer);
      }
      render();
    }

    function clearPending() {
      clearTimeout(pending?.timer);
      pending = null;
    }

    function commandFailed(type) {
      if (pending?.type !== type) return;
      const restoreFocus = pending.restoreFocus;
      clearPending();
      if (type === 'walk_start') room.notice = '散歩を始められませんでした。もう一度お試しください。';
      showWalk();
      if (type === 'walk_stop') status.textContent = '散歩を終えられませんでした。もう一度お試しください。';
      const control = type === 'walk_start' ? start : stop;
      if (restoreFocus && !control.disabled) control.focus();
    }

    function sendCommand(type, params) {
      if (!room?.connected || pending || !send({ type, doorId: room.doorId, ...params })) return false;
      room.notice = '';
      const control = type === 'walk_start' ? start : stop;
      pending = {
        type,
        restoreFocus: document.activeElement === control,
        timer: setTimeout(() => commandFailed(type), COMMAND_TIMEOUT),
      };
      return true;
    }

    start.addEventListener('click', () => {
      if (!session && room?.config?.apiKey && place.value && !authFailed) sendCommand('walk_start', { placeId: place.value });
      render();
    });
    stop.addEventListener('click', () => {
      if (session && sendCommand('walk_stop', { sessionId: session.state.sessionId })) destroyRenderer();
      render();
    });

    // Followers cannot navigate the viewer. Preserve Google's attribution links and normal tab navigation.
    for (const type of ['pointerdown', 'mousedown', 'touchstart', 'wheel', 'click', 'dblclick', 'keydown']) {
      view.addEventListener(type, (event) => {
        if (session?.guide || event.target.closest?.('a[href]') || (type === 'keydown' && event.key === 'Tab')) return;
        event.stopImmediatePropagation();
      }, true);
    }

    function clearWalk() {
      clearPending();
      destroyRenderer();
      session = null;
    }

    return {
      enter(doorId) {
        clearWalk();
        room = { doorId };
        render();
      },
      leave() {
        clearWalk();
        room = null;
        render();
      },
      disconnect() {
        clearWalk();
        if (room) room = { doorId: room.doorId };
        render();
      },
      sync(doorId, walk) {
        if (room?.doorId !== doorId) return;
        room.connected = true;
        if (!room.requestedConfig) prepareConfig(room);
        let focusAfter;
        if (!walk) {
          if (session) {
            if (view.contains(document.activeElement) || pending?.restoreFocus) focusAfter = start;
            room.notice = session.error || '散歩を終えました。';
            clearWalk();
          }
        } else if (session?.state.sessionId !== walk.sessionId) {
          if (pending?.restoreFocus) focusAfter = stop;
          clearWalk();
          room.notice = '';
          session = { state: walk, guide: walk.guideId === getClientId() };
        } else if (walk.revision > session.state.revision) session.state = walk;
        showWalk();
        if (focusAfter && !focusAfter.disabled) focusAfter.focus();
      },
      error: commandFailed,
    };
  };
})();
