'use strict';
/* Vice City Sunset — editor logic.
 *
 * Wires the page: photo loading (file picker, drag-and-drop, built-in
 * demo photos), per-panel pan/zoom (drag, mouse wheel, slider, arrow
 * keys), layout switching, caption editing, live preview on a canvas,
 * PNG export at the three post sizes, and the URL demo mode (see
 * shots.js). Photos are read on this machine and never uploaded.
 */

const ViceCityApp = (function () {
  const SAMPLES = {
    boulevard: 'samples/boulevard.jpg',
    pier: 'samples/pier.jpg',
  };
  const DEFAULT_CAPTIONS = {
    boulevard: 'BOULEVARD QUEEN',
    pier: 'SUNSET HEIST',
  };
  const EXPORT_SIZES = [
    { label: 'Square 1080 × 1080', w: 1080, h: 1080 },
    { label: 'Portrait 1080 × 1350', w: 1080, h: 1350 },
    { label: 'Wide 1920 × 1080', w: 1920, h: 1080 },
  ];
  const PREVIEW_SIZE = 880;

  const state = {
    photo: null,
    photoName: 'pier',
    layout: 'hero',
    caption: 'SUNSET HEIST',
    frames: null,
    activePanel: 0,
  };
  state.frames = ViceCityCover.defaultFrames('hero');

  let canvas = null;
  let captionInput = null;
  let zoomSlider = null;
  let zoomLabel = null;
  let statusLine = null;
  let drag = null;

  function $(id) {
    return document.getElementById(id);
  }

  function setStatus(message) {
    if (statusLine) statusLine.textContent = message;
  }

  function renderPreview() {
    if (!canvas) return;
    if (document.body.classList.contains('cover-only')) {
      ViceCityCover.renderCover(canvas, state, canvas.width, canvas.height);
    } else {
      ViceCityCover.renderCover(canvas, state, PREVIEW_SIZE, PREVIEW_SIZE);
    }
  }

  function renderWhenFontsReady() {
    renderPreview();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        renderPreview();
      });
    }
  }

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      const img = new Image();
      img.onload = function () {
        resolve(img);
      };
      img.onerror = function () {
        reject(new Error('could not load image: ' + src));
      };
      img.src = src;
    });
  }

  async function loadSample(name) {
    const src = SAMPLES[name];
    if (!src) throw new Error('unknown sample photo: ' + name);
    const img = await loadImage(src);
    state.photo = img;
    state.photoName = name;
    setStatus('Loaded demo photo: ' + name + '.');
    renderWhenFontsReady();
    return img;
  }

  async function loadFile(file) {
    if (!file || !file.type || file.type.indexOf('image/') !== 0) {
      setStatus('That file is not an image. Choose a photo file.');
      return null;
    }
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      state.photo = img;
      state.photoName = file.name || 'your photo';
      setStatus('Loaded your photo: ' + state.photoName + '.');
      renderWhenFontsReady();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function setLayout(layout) {
    if (layout !== 'hero' && layout !== 'strips' && layout !== 'grid') return;
    state.layout = layout;
    state.frames = ViceCityCover.defaultFrames(layout);
    state.activePanel = 0;
    const radio = document.querySelector('input[name="layout"][value="' + layout + '"]');
    if (radio) radio.checked = true;
    updateZoomControl();
    renderPreview();
  }

  function setCaption(text) {
    state.caption = text;
    if (captionInput && captionInput.value !== text) captionInput.value = text;
    renderPreview();
  }

  function updateZoomControl() {
    if (!zoomSlider || !zoomLabel) return;
    const frame = state.frames[state.activePanel] || { zoom: 1 };
    zoomSlider.value = String(frame.zoom);
    zoomLabel.textContent =
      'Zoom — panel ' + (state.activePanel + 1) + ' of ' + state.frames.length +
      ' (' + Math.round(frame.zoom * 100) + '%)';
  }

  function setZoom(zoom) {
    const frame = state.frames[state.activePanel];
    if (!frame) return;
    frame.zoom = Math.max(1, Math.min(3.5, zoom));
    updateZoomControl();
    renderPreview();
  }

  function nudge(dx, dy) {
    const frame = state.frames[state.activePanel];
    if (!frame) return;
    frame.x = (frame.x || 0) + dx;
    frame.y = (frame.y || 0) + dy;
    renderPreview();
  }

  // Which panel (if any) sits under a point on the preview canvas.
  function panelAt(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;
    const geo = ViceCityCover.layoutPanels(state.layout, canvas.width, canvas.height);
    for (let i = 0; i < geo.panels.length; i++) {
      const p = geo.panels[i];
      if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) return i;
    }
    return -1;
  }

  function wireCanvasInput() {
    canvas.addEventListener('pointerdown', function (event) {
      const hit = panelAt(event.clientX, event.clientY);
      if (hit < 0) return;
      state.activePanel = hit;
      updateZoomControl();
      const frame = state.frames[hit];
      drag = {
        panel: hit,
        startX: event.clientX,
        startY: event.clientY,
        frameX: frame.x || 0,
        frameY: frame.y || 0,
      };
      canvas.setPointerCapture(event.pointerId);
      event.preventDefault();
    });
    canvas.addEventListener('pointermove', function (event) {
      if (!drag) return;
      const rect = canvas.getBoundingClientRect();
      const geo = ViceCityCover.layoutPanels(state.layout, canvas.width, canvas.height);
      const panel = geo.panels[drag.panel];
      const frame = state.frames[drag.panel];
      frame.x = drag.frameX + ((event.clientX - drag.startX) / rect.width) * (canvas.width / panel.w);
      frame.y = drag.frameY + ((event.clientY - drag.startY) / rect.height) * (canvas.height / panel.h);
      renderPreview();
    });
    function endDrag() {
      drag = null;
    }
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('wheel', function (event) {
      const hit = panelAt(event.clientX, event.clientY);
      if (hit < 0) return;
      event.preventDefault();
      state.activePanel = hit;
      const frame = state.frames[hit];
      setZoom((frame.zoom || 1) * Math.exp(-event.deltaY * 0.0012));
    }, { passive: false });
    canvas.addEventListener('keydown', function (event) {
      const step = event.shiftKey ? 0.05 : 0.015;
      if (event.key === 'ArrowLeft') { nudge(-step, 0); event.preventDefault(); }
      else if (event.key === 'ArrowRight') { nudge(step, 0); event.preventDefault(); }
      else if (event.key === 'ArrowUp') { nudge(0, -step); event.preventDefault(); }
      else if (event.key === 'ArrowDown') { nudge(0, step); event.preventDefault(); }
      else if (event.key === '+' || event.key === '=') { setZoom((state.frames[state.activePanel].zoom || 1) + 0.1); event.preventDefault(); }
      else if (event.key === '-') { setZoom((state.frames[state.activePanel].zoom || 1) - 0.1); event.preventDefault(); }
    });
  }

  // Render the cover at an exact export size and return a PNG data URL.
  // Used by the download buttons and by automated checks of the export.
  function exportDataURL(width, height) {
    const offscreen = document.createElement('canvas');
    ViceCityCover.renderCover(offscreen, state, width, height);
    return offscreen.toDataURL('image/png');
  }

  function exportPNG(width, height) {
    const offscreen = document.createElement('canvas');
    ViceCityCover.renderCover(offscreen, state, width, height);
    offscreen.toBlob(function (blob) {
      if (!blob) {
        setStatus('Export failed: the browser could not make the PNG.');
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'vice-city-sunset-' + width + 'x' + height + '.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () {
        URL.revokeObjectURL(url);
      }, 5000);
      setStatus('Exported ' + width + ' × ' + height + ' PNG.');
    }, 'image/png');
  }

  function enterCoverScene() {
    // Full-bleed cover: the canvas fills the viewport and draws the cover
    // at the viewport's own size.
    function fit() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      renderPreview();
    }
    fit();
    window.addEventListener('resize', fit);
  }

  function wireControls() {
    const photoInput = $('photoInput');
    if (photoInput) {
      photoInput.addEventListener('change', function () {
        if (photoInput.files && photoInput.files[0]) {
          loadFile(photoInput.files[0]).catch(function (err) {
            setStatus('Could not read that photo: ' + err.message);
          });
        }
      });
    }
    const dropZone = $('dropZone');
    if (dropZone) {
      dropZone.addEventListener('dragover', function (event) {
        event.preventDefault();
        dropZone.classList.add('dragging');
      });
      dropZone.addEventListener('dragleave', function () {
        dropZone.classList.remove('dragging');
      });
      dropZone.addEventListener('drop', function (event) {
        event.preventDefault();
        dropZone.classList.remove('dragging');
        const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
        if (file) {
          loadFile(file).catch(function (err) {
            setStatus('Could not read that photo: ' + err.message);
          });
        }
      });
      dropZone.addEventListener('click', function () {
        if (photoInput) photoInput.click();
      });
      dropZone.addEventListener('keydown', function (event) {
        if ((event.key === 'Enter' || event.key === ' ') && photoInput) {
          event.preventDefault();
          photoInput.click();
        }
      });
    }
    document.querySelectorAll('[data-sample]').forEach(function (button) {
      button.addEventListener('click', function () {
        const name = button.getAttribute('data-sample');
        if (DEFAULT_CAPTIONS[name] && !state.photo) setCaption(DEFAULT_CAPTIONS[name]);
        loadSample(name).catch(function (err) {
          setStatus('Could not load the demo photo: ' + err.message);
        });
      });
    });
    document.querySelectorAll('input[name="layout"]').forEach(function (radio) {
      radio.addEventListener('change', function () {
        if (radio.checked) setLayout(radio.value);
      });
    });
    if (captionInput) {
      captionInput.addEventListener('input', function () {
        setCaption(captionInput.value);
      });
    }
    if (zoomSlider) {
      zoomSlider.addEventListener('input', function () {
        setZoom(Number(zoomSlider.value));
      });
    }
    document.querySelectorAll('[data-export]').forEach(function (button) {
      button.addEventListener('click', function () {
        const parts = button.getAttribute('data-export').split('x');
        exportPNG(Number(parts[0]), Number(parts[1]));
      });
    });
  }

  async function init() {
    canvas = $('coverCanvas');
    captionInput = $('captionInput');
    zoomSlider = $('zoomSlider');
    zoomLabel = $('zoomLabel');
    statusLine = $('statusLine');
    if (!canvas) return;
    canvas.width = PREVIEW_SIZE;
    canvas.height = PREVIEW_SIZE;
    if (captionInput) captionInput.value = state.caption;
    wireControls();
    wireCanvasInput();
    updateZoomControl();

    // Load the bundled display and UI fonts before the first paint, then
    // paint again once they arrive so the caption uses the real face.
    if (document.fonts) {
      try {
        await Promise.all([
          document.fonts.load('700 100px Oswald'),
          document.fonts.load('600 20px Inter'),
        ]);
      } catch (err) {
        void err;
      }
    }

    const shotMode = window.ViceCityShots
      ? await window.ViceCityShots.applyShot(ViceCityApp)
      : false;
    if (!shotMode) {
      try {
        await loadSample('pier');
      } catch (err) {
        setStatus('Demo photo failed to load; choose a photo to begin.');
        renderWhenFontsReady();
      }
    }
    renderWhenFontsReady();
  }

  const ViceCityApp = {
    state: state,
    init: init,
    loadSample: loadSample,
    loadFile: loadFile,
    setLayout: setLayout,
    setCaption: setCaption,
    setZoom: setZoom,
    nudge: nudge,
    renderPreview: renderPreview,
    exportPNG: exportPNG,
    exportDataURL: exportDataURL,
    enterCoverScene: enterCoverScene,
    exportSizes: EXPORT_SIZES,
  };

  if (typeof window !== 'undefined') window.__viceCity = ViceCityApp;
  return ViceCityApp;
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function () {
    ViceCityApp.init();
  });
} else {
  ViceCityApp.init();
}
