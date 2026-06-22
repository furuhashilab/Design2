// =========================================
//  World Cup Journey — 3D Storytelling Map
//  app.js  |  MapLibre GL JS
// =========================================

(function () {
  'use strict';

  /* ── 定数 ── */
  const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
  const SCENE_DURATION = 12000;
  const TOTAL = scenes.length;

  /* ── 状態管理 ── */
  let currentIndex = 0;
  let isPlaying = true;
  let sceneTimer = null;
  let countdownTimer = null;
  let orbitTimer = null;
  let countdownStart = null;
  let mapReady = false;
  let map = null;

  /* ── DOM参照 ── */
  const $ = id => document.getElementById(id);
  const panel         = $('sidePanel');
  const sceneNumEl    = $('sceneNum');
  const flagEl        = $('panelFlag');
  const countryEl     = $('panelCountry');
  const landmarkEl    = $('panelLandmark');
  const winsEl        = $('panelWins');
  const playersEl     = $('panelPlayers');
  const descEl        = $('panelDescription');
  const charmEl       = $('panelCharm');
  const progressFill  = $('progressFill');
  const progressDots  = $('progressDots');
  const ringFill      = $('ringFill');
  const btnPlay       = $('btnPlay');
  const btnPrev       = $('btnPrev');
  const btnNext       = $('btnNext');
  const popup         = $('customPopup');
  const popupTitle    = $('popupTitle');
  const popupLandmark = $('popupLandmark');
  const loadingScreen = $('loadingScreen');
  const loadingBar    = $('loadingBarFill');

  /* ── プログレスドット生成 ── */
  function buildDots() {
    progressDots.innerHTML = '';
    for (let i = 0; i < TOTAL; i++) {
      const d = document.createElement('div');
      d.className = 'progress-dot';
      d.dataset.i = i;
      d.addEventListener('click', () => jumpTo(i));
      d.style.pointerEvents = 'auto';
      d.style.cursor = 'pointer';
      progressDots.appendChild(d);
    }
  }

  function updateDots(idx) {
    progressDots.querySelectorAll('.progress-dot').forEach((d, i) => {
      d.className = 'progress-dot';
      if (i < idx)   d.classList.add('done');
      if (i === idx) d.classList.add('active');
    });
  }

  /* ── カウントダウンリング ── */
  const RING_CIRC = 113;

  function startCountdown(duration) {
    stopCountdown();
    countdownStart = performance.now();
    function frame(now) {
      const progress = Math.min((now - countdownStart) / duration, 1);
      ringFill.style.strokeDashoffset = RING_CIRC * (1 - progress);
      if (progress < 1 && isPlaying) countdownTimer = requestAnimationFrame(frame);
    }
    countdownTimer = requestAnimationFrame(frame);
  }

  function stopCountdown() {
    if (countdownTimer) { cancelAnimationFrame(countdownTimer); countdownTimer = null; }
    ringFill.style.strokeDashoffset = RING_CIRC;
  }

  /* ── サイドパネル更新 ── */
  function updatePanel(scene, index) {
    panel.classList.add('transitioning');
    setTimeout(() => {
      sceneNumEl.textContent  = String(index + 1).padStart(2, '0');
      flagEl.textContent      = scene.flag || '';
      countryEl.textContent   = scene.country;
      landmarkEl.textContent  = scene.landmark;
      winsEl.textContent      = scene.wins;
      playersEl.textContent   = scene.players;
      descEl.textContent      = scene.description;
      charmEl.textContent     = scene.charm;
      progressFill.style.width = `${((index + 1) / TOTAL) * 100}%`;
      updateDots(index);
      panel.classList.remove('transitioning');
    }, 200);
  }

  /* ── ポップアップ表示 ── */
  function showPopup(scene) {
    popupTitle.textContent    = scene.country + '　' + (scene.flag || '');
    popupLandmark.textContent = scene.landmark;
    const rect = document.getElementById('map').getBoundingClientRect();
    popup.style.left = (rect.width / 2 - 90) + 'px';
    popup.style.top  = (rect.height * 0.28)   + 'px';
    popup.classList.add('visible');
    setTimeout(() => popup.classList.remove('visible'), 4500);
  }

  /* ── カメラ飛行 ── */
  function flyToScene(scene, cb) {
    if (!mapReady) return;
    map.flyTo({
      center:  scene.center,
      zoom:    scene.zoom,
      pitch:   scene.pitch,
      bearing: scene.bearing,
      speed:   0.65,
      curve:   1.4,
    });
    // moveend が来なくても 5秒後に保険で cb を呼ぶ
    let cbCalled = false;
    const safeCb = () => {
      if (cbCalled) return;
      cbCalled = true;
      if (cb) cb();
      if (orbitTimer) clearTimeout(orbitTimer);
      orbitTimer = setTimeout(() => {
        if (!isPlaying || !mapReady) return;
        map.easeTo({
          bearing:  scene.orbitBearing,
          pitch:    Math.min(scene.pitch + 5, 65),
          zoom:     scene.zoom + 0.3,
          duration: scene.duration || 4500,
        });
      }, 1800);
    };
    map.once('moveend', safeCb);
    setTimeout(safeCb, 5000);
  }

  /* ── シーン再生 ── */
  function playScene(index) {
    clearTimers();
    const scene = scenes[index];
    updatePanel(scene, index);
    flyToScene(scene, () => showPopup(scene));
    startCountdown(SCENE_DURATION);
    if (isPlaying) {
      sceneTimer = setTimeout(nextScene, SCENE_DURATION);
    }
  }

  function nextScene() { currentIndex = (currentIndex + 1) % TOTAL; playScene(currentIndex); }
  function prevScene() { currentIndex = (currentIndex - 1 + TOTAL) % TOTAL; playScene(currentIndex); }
  function jumpTo(i)   { currentIndex = i; playScene(currentIndex); }

  function clearTimers() {
    if (sceneTimer) { clearTimeout(sceneTimer); sceneTimer = null; }
    if (orbitTimer) { clearTimeout(orbitTimer); orbitTimer = null; }
    stopCountdown();
  }

  /* ── 再生/停止 ── */
  function togglePlay() {
    isPlaying = !isPlaying;
    if (isPlaying) {
      btnPlay.innerHTML = '&#9646;&#9646;';
      btnPlay.className = 'ctrl-btn ctrl-play playing';
      playScene(currentIndex);
    } else {
      btnPlay.innerHTML = '&#9654;';
      btnPlay.className = 'ctrl-btn ctrl-play paused';
      clearTimers();
    }
  }

  btnPlay.addEventListener('click', togglePlay);
  btnNext.addEventListener('click', nextScene);
  btnPrev.addEventListener('click', prevScene);

  /* ── ローディングバーアニメーション ── */
  function animateLoadingBar(cb) {
    let pct = 0;
    const iv = setInterval(() => {
      pct += Math.random() * 15 + 5;
      if (pct >= 100) {
        pct = 100;
        loadingBar.style.width = '100%';
        clearInterval(iv);
        setTimeout(cb, 300);
      } else {
        loadingBar.style.width = pct + '%';
      }
    }, 180);
  }

  /* ── ローディング画面を閉じてスタート ── */
  function startApp() {
    loadingScreen.classList.add('fade-out');
    setTimeout(() => {
      loadingScreen.style.display = 'none';
      buildDots();
      btnPlay.className = 'ctrl-btn ctrl-play playing';
      playScene(0);
    }, 700);
  }

  /* ── 3Dビルディングレイヤー追加 ── */
  function add3DBuildings() {
    // ソース名はスタイルによって異なる。存在するソースを優先的に使用
    const sourceId = map.getSource('openmaptiles')  ? 'openmaptiles'
                   : map.getSource('maptiler_planet') ? 'maptiler_planet'
                   : null;
    if (!sourceId) return;
    if (map.getLayer('3d-buildings')) return;
    try {
      map.addLayer({
        id: '3d-buildings',
        source: sourceId,
        'source-layer': 'building',
        type: 'fill-extrusion',
        minzoom: 14,
        paint: {
          'fill-extrusion-color': [
            'interpolate', ['linear'], ['coalesce', ['get', 'render_height'], ['get', 'height'], 5],
            0,   '#0D1B2A',
            10,  '#112240',
            30,  '#1B3A6B',
            80,  '#2E5F8A',
            200, '#3D7EAA',
          ],
          'fill-extrusion-height': [
            'interpolate', ['linear'], ['zoom'],
            14, 0,
            16, ['coalesce', ['get', 'render_height'], ['get', 'height'], 5]
          ],
          'fill-extrusion-base': [
            'interpolate', ['linear'], ['zoom'],
            14, 0,
            16, ['coalesce', ['get', 'render_min_height'], ['get', 'min_height'], 0]
          ],
          'fill-extrusion-opacity': 0.82,
          'fill-extrusion-vertical-gradient': true,
        }
      });
    } catch (e) {
      console.warn('3D buildings layer error:', e);
    }
  }

  /* ── マップ初期化 ── */
  function initMap() {
    map = new maplibregl.Map({
      container: 'map',
      style:     STYLE_URL,
      center:    scenes[0].center,
      zoom:      10,
      pitch:     45,
      bearing:   0,
      antialias: true,
    });

    // ── タイムアウト保険：10秒でも load が来なければ強制スタート ──
    const loadTimeout = setTimeout(() => {
      if (!mapReady) {
        console.warn('map load timeout — forcing start');
        mapReady = true;
        add3DBuildings();
        animateLoadingBar(startApp);
      }
    }, 10000);

    map.on('load', () => {
      clearTimeout(loadTimeout);
      if (mapReady) return; // 二重発火防止
      mapReady = true;

      add3DBuildings();

      // フォグ（エラーを握りつぶす）
      try {
        map.setFog({
          color:           'rgba(10,14,28,0.5)',
          'high-color':    'rgba(6,8,15,0.9)',
          'horizon-blend': 0.05,
          'space-color':   '#000008',
          'star-intensity': 0.4,
        });
      } catch (e) { /* フォグ非対応でも続行 */ }

      animateLoadingBar(startApp);
    });

    map.on('error', (e) => {
      console.warn('MapLibre error:', e.error);
      // タイルエラーはよくある。マップ自体の load は別なので何もしない
    });
  }

  initMap();

})();
