'use strict';
/* Vice City Sunset — poster renderer.
 *
 * Draws a GTA-poster-style cover on a 2D canvas: a warm sunset sky with a
 * glowing sun, a dark skyline and palm silhouettes along the bottom, photo
 * panels with thin light borders, film grain, a vignette, and a heavy
 * condensed caption in white with a neon pink-orange glow. Pure canvas, no
 * network, no library. Every draw is deterministic: the grain uses a seeded
 * generator, so the same state always paints the same cover.
 */

const ViceCityCover = (function () {
  // Small seeded generator (mulberry32) so the grain never changes a cover.
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Panel rectangles for each layout, as fractions of the cover size.
  // Every layout leaves a caption band across the lower part of the cover.
  function layoutPanels(layout, width, height) {
    if (layout === 'strips') {
      const gap = 0.02 * width;
      const pw = (width * 0.92 - gap * 2) / 3;
      const panels = [];
      for (let i = 0; i < 3; i++) {
        panels.push({
          x: width * 0.04 + i * (pw + gap),
          y: height * 0.04,
          w: pw,
          h: height * 0.68,
        });
      }
      return { panels: panels, captionY: height * 0.86, captionSize: height * 0.115 };
    }
    if (layout === 'grid') {
      const gapX = 0.02 * width;
      const gapY = 0.02 * height;
      const pw = (width * 0.92 - gapX) / 2;
      const ph = (height * 0.74 - gapY) / 2;
      return {
        panels: [
          { x: width * 0.04, y: height * 0.03, w: pw, h: ph },
          { x: width * 0.04 + pw + gapX, y: height * 0.03, w: pw, h: ph },
          { x: width * 0.04, y: height * 0.03 + ph + gapY, w: pw, h: ph },
          { x: width * 0.04 + pw + gapX, y: height * 0.03 + ph + gapY, w: pw, h: ph },
        ],
        captionY: height * 0.89,
        captionSize: height * 0.095,
      };
    }
    // hero: one wide panel across the top, caption band below it.
    return {
      panels: [{ x: width * 0.04, y: height * 0.04, w: width * 0.92, h: height * 0.62 }],
      captionY: height * 0.85,
      captionSize: height * 0.12,
    };
  }

  function defaultFrames(layout) {
    const count = layout === 'hero' ? 1 : layout === 'strips' ? 3 : 4;
    const frames = [];
    for (let i = 0; i < count; i++) {
      // Each panel starts with its own slight framing so the panels do not
      // all show the same crop of the photo.
      frames.push({ zoom: 1, x: (i % 2 === 0 ? -0.04 : 0.04) * i, y: 0 });
    }
    return frames;
  }

  function drawSky(ctx, width, height) {
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0.0, '#ff3d00');
    sky.addColorStop(0.32, '#ff2e63');
    sky.addColorStop(0.62, '#c22ed0');
    sky.addColorStop(1.0, '#2b1055');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    // Bright horizon glow band where the sun sits.
    const glow = ctx.createLinearGradient(0, height * 0.34, 0, height * 0.62);
    glow.addColorStop(0, 'rgba(255, 214, 120, 0)');
    glow.addColorStop(0.5, 'rgba(255, 214, 120, 0.55)');
    glow.addColorStop(1, 'rgba(255, 214, 120, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, height * 0.34, width, height * 0.28);
  }

  function drawSun(ctx, width, height) {
    const cx = width * 0.7;
    const cy = height * 0.46;
    const r = height * 0.17;
    const halo = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 2.6);
    halo.addColorStop(0, 'rgba(255, 236, 160, 0.85)');
    halo.addColorStop(0.4, 'rgba(255, 150, 80, 0.35)');
    halo.addColorStop(1, 'rgba(255, 150, 80, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(cx - r * 2.6, cy - r * 2.6, r * 5.2, r * 5.2);
    const disc = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
    disc.addColorStop(0, '#fff3b0');
    disc.addColorStop(1, '#ff9a3d');
    ctx.fillStyle = disc;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawSkyline(ctx, width, height, rand) {
    const base = height * 0.94;
    ctx.fillStyle = '#170a33';
    let x = 0;
    while (x < width) {
      const bw = width * (0.05 + rand() * 0.07);
      const bh = height * (0.05 + rand() * 0.13);
      ctx.fillRect(x, base - bh, bw, bh);
      // A few lit windows in the silhouette.
      ctx.fillStyle = 'rgba(255, 190, 90, 0.85)';
      const windows = 1 + Math.floor(rand() * 4);
      for (let i = 0; i < windows; i++) {
        const wx = x + bw * (0.15 + rand() * 0.7);
        const wy = base - bh + bh * (0.15 + rand() * 0.65);
        ctx.fillRect(wx, wy, Math.max(2, width * 0.006), Math.max(2, height * 0.008));
      }
      ctx.fillStyle = '#170a33';
      x += bw + width * 0.012;
    }
  }

  function drawPalm(ctx, x, baseY, size, lean, rand) {
    ctx.save();
    ctx.translate(x, baseY);
    ctx.rotate(lean);
    ctx.strokeStyle = '#12061f';
    ctx.fillStyle = '#12061f';
    ctx.lineCap = 'round';
    // Trunk: a gently curving tapered line, drawn as stacked segments.
    const segments = 7;
    let px = 0;
    let py = 0;
    for (let i = 0; i < segments; i++) {
      const ny = py - size / segments;
      const nx = px + size * 0.03 * Math.sin(i * 0.9);
      ctx.lineWidth = size * 0.045 * (1 - i / (segments * 1.4));
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(nx, ny);
      ctx.stroke();
      px = nx;
      py = ny;
    }
    // Fronds: long arcs fanning out from the crown.
    const fronds = 7;
    for (let i = 0; i < fronds; i++) {
      const angle = Math.PI * (0.08 + (i / (fronds - 1)) * 0.84);
      const len = size * (0.42 + rand() * 0.16);
      const ex = px + Math.cos(angle) * len;
      const ey = py + Math.sin(angle) * len * 0.55 - size * 0.08;
      ctx.lineWidth = size * 0.02;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.quadraticCurveTo(
        px + Math.cos(angle) * len * 0.5,
        py + Math.sin(angle) * len * 0.5 - size * 0.16,
        ex,
        ey,
      );
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawPalms(ctx, width, height, rand) {
    const base = height * 0.985;
    const spots = [
      { x: width * 0.06, s: height * 0.2, lean: -0.1 },
      { x: width * 0.2, s: height * 0.15, lean: 0.08 },
      { x: width * 0.9, s: height * 0.22, lean: 0.12 },
      { x: width * 0.97, s: height * 0.14, lean: -0.06 },
    ];
    for (const spot of spots) {
      drawPalm(ctx, spot.x, base, spot.s, spot.lean, rand);
    }
  }

  // Draw one photo panel: cover-fit with the panel's own pan/zoom, a thin
  // light border and a soft drop shadow. Without a photo, paint a warm
  // placeholder gradient with a prompt so the cover never looks empty.
  function drawPanel(ctx, panel, photo, frame) {
    ctx.save();
    ctx.shadowColor = 'rgba(10, 2, 20, 0.55)';
    ctx.shadowBlur = panel.w * 0.02;
    ctx.shadowOffsetY = panel.h * 0.012;
    ctx.fillStyle = '#241031';
    ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.rect(panel.x, panel.y, panel.w, panel.h);
    ctx.clip();
    if (photo && photo.naturalWidth > 0) {
      const zoom = Math.max(1, frame.zoom || 1);
      const base = Math.max(panel.w / photo.naturalWidth, panel.h / photo.naturalHeight);
      const scale = base * zoom;
      const dw = photo.naturalWidth * scale;
      const dh = photo.naturalHeight * scale;
      const maxX = Math.max(0, (dw - panel.w) / 2);
      const maxY = Math.max(0, (dh - panel.h) / 2);
      const ox = Math.max(-maxX, Math.min(maxX, (frame.x || 0) * panel.w));
      const oy = Math.max(-maxY, Math.min(maxY, (frame.y || 0) * panel.h));
      ctx.drawImage(photo, panel.x + (panel.w - dw) / 2 + ox, panel.y + (panel.h - dh) / 2 + oy, dw, dh);
      // Warm sunset tint over the photo so every panel shares the grade.
      const tint = ctx.createLinearGradient(panel.x, panel.y, panel.x, panel.y + panel.h);
      tint.addColorStop(0, 'rgba(255, 94, 0, 0.10)');
      tint.addColorStop(1, 'rgba(178, 44, 208, 0.14)');
      ctx.fillStyle = tint;
      ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
    } else {
      const ph = ctx.createLinearGradient(panel.x, panel.y, panel.x + panel.w, panel.y + panel.h);
      ph.addColorStop(0, '#ff7a18');
      ph.addColorStop(0.55, '#ff2e63');
      ph.addColorStop(1, '#5b2a86');
      ctx.fillStyle = ph;
      ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.font = '600 ' + Math.round(panel.h * 0.07) + 'px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ADD A PHOTO', panel.x + panel.w / 2, panel.y + panel.h / 2);
    }
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = Math.max(2, panel.w * 0.006);
    ctx.strokeRect(panel.x, panel.y, panel.w, panel.h);
    ctx.restore();
  }

  function drawGrain(ctx, width, height, rand) {
    ctx.save();
    const dots = Math.floor((width * height) / 260);
    for (let i = 0; i < dots; i++) {
      const v = rand();
      ctx.fillStyle = v > 0.5 ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.06)';
      ctx.fillRect(rand() * width, rand() * height, 1.4, 1.4);
    }
    ctx.restore();
  }

  function drawVignette(ctx, width, height) {
    const vg = ctx.createRadialGradient(
      width / 2, height * 0.45, Math.min(width, height) * 0.42,
      width / 2, height * 0.5, Math.max(width, height) * 0.75,
    );
    vg.addColorStop(0, 'rgba(10, 2, 20, 0)');
    vg.addColorStop(1, 'rgba(10, 2, 20, 0.42)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, width, height);
  }

  function drawCaption(ctx, width, height, caption, captionY, captionSize) {
    const text = (caption || '').toUpperCase();
    if (!text) return;
    ctx.save();
    ctx.translate(width / 2, captionY);
    ctx.rotate(-0.035);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Shrink the lettering until it fits the cover with a margin.
    let size = captionSize;
    let font = '';
    for (;;) {
      font = '700 ' + Math.round(size) + 'px Oswald, "Arial Narrow", sans-serif';
      ctx.font = font;
      if (ctx.measureText(text).width <= width * 0.92 || size < 12) break;
      size *= 0.92;
    }
    // Kicker above the caption.
    ctx.font = '600 ' + Math.round(size * 0.22) + 'px Inter, sans-serif';
    try {
      ctx.letterSpacing = Math.round(size * 0.08) + 'px';
    } catch (err) {
      void err;
    }
    ctx.fillStyle = 'rgba(255, 214, 120, 0.95)';
    ctx.fillText('V I C E   C I T Y', 0, -size * 0.72);
    try {
      ctx.letterSpacing = '0px';
    } catch (err) {
      void err;
    }
    // Heavy caption: warm neon glow, dark outline, white face.
    ctx.font = font;
    ctx.shadowColor = 'rgba(255, 46, 136, 0.9)';
    ctx.shadowBlur = size * 0.22;
    ctx.lineWidth = Math.max(3, size * 0.09);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1c0533';
    ctx.strokeText(text, 0, 0);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, 0, 0);
    // Thin neon underline under the caption.
    const tw = ctx.measureText(text).width;
    const underline = ctx.createLinearGradient(-tw / 2, 0, tw / 2, 0);
    underline.addColorStop(0, '#ff9a3d');
    underline.addColorStop(0.5, '#ff2e88');
    underline.addColorStop(1, '#b537f2');
    ctx.fillStyle = underline;
    ctx.fillRect(-tw / 2, size * 0.52, tw, Math.max(3, size * 0.045));
    ctx.restore();
  }

  // Paint the whole cover onto a canvas sized width x height.
  // state: { photo, layout, caption, frames }.
  function renderCover(canvas, state, width, height) {
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const rand = mulberry32(20261120);
    drawSky(ctx, width, height);
    drawSun(ctx, width, height);
    drawSkyline(ctx, width, height, rand);
    const geo = layoutPanels(state.layout || 'hero', width, height);
    const frames = state.frames || defaultFrames(state.layout || 'hero');
    geo.panels.forEach(function (panel, i) {
      drawPanel(ctx, panel, state.photo || null, frames[i] || { zoom: 1, x: 0, y: 0 });
    });
    drawPalms(ctx, width, height, rand);
    drawGrain(ctx, width, height, rand);
    drawVignette(ctx, width, height);
    drawCaption(ctx, width, height, state.caption || '', geo.captionY, geo.captionSize);
    return canvas;
  }

  return {
    renderCover: renderCover,
    layoutPanels: layoutPanels,
    defaultFrames: defaultFrames,
  };
})();

if (typeof window !== 'undefined') window.ViceCityCover = ViceCityCover;
