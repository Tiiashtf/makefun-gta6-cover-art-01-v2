'use strict';
/* Vice City Sunset — demo scene helper.
 *
 * Reads the page's query string for screenshot and demo mode:
 *   ?shot=editor&photo=boulevard&caption=BOULEVARD%20QUEEN
 *   ?shot=cover&photo=pier&caption=SUNSET%20HEIST&layout=hero
 * `photo` picks a built-in sample photo, `caption` sets the caption,
 * `layout` picks hero, strips or grid, and `shot` picks the scene:
 * editor shows the editor with the sample photo loaded, cover shows the
 * cover alone, full-bleed. Once the scene has painted, sets
 * window.__shotReady so screenshot tooling knows it is ready.
 */

const ViceCityShots = (function () {
  function readParams() {
    const q = new URLSearchParams(window.location.search);
    return {
      shot: q.get('shot') || '',
      photo: q.get('photo') || 'pier',
      caption: q.get('caption') || '',
      layout: q.get('layout') || 'hero',
    };
  }

  async function applyShot(app) {
    const params = readParams();
    if (!params.shot) return false;
    if (params.caption) app.setCaption(params.caption);
    if (params.layout) app.setLayout(params.layout);
    await app.loadSample(params.photo);
    if (params.shot === 'cover') {
      document.body.classList.add('cover-only');
      app.enterCoverScene();
    }
    // Wait for the fonts, then for two animation frames, so the painted
    // scene is the finished one before signalling readiness.
    if (document.fonts && document.fonts.ready) {
      try {
        await document.fonts.ready;
      } catch (err) {
        void err;
      }
    }
    app.renderPreview();
    await new Promise(function (resolve) {
      requestAnimationFrame(function () {
        requestAnimationFrame(resolve);
      });
    });
    window.__shotReady = true;
    return true;
  }

  return {
    readParams: readParams,
    applyShot: applyShot,
  };
})();

if (typeof window !== 'undefined') window.ViceCityShots = ViceCityShots;
