// Builds a square "I saved Christmas" picture to share on WhatsApp and elsewhere.
import * as D from './draw.js';
import { CHARACTERS, drawJunie } from './characters.js';

export function gameUrl() {
  return location.href.split('#')[0].split('?')[0];
}

export function makeShareImage(charId, score) {
  const ch = CHARACTERS[charId];
  const c = document.createElement('canvas');
  c.width = c.height = 1080;
  const ctx = c.getContext('2d');
  const tone = '#f6efdf';
  D.setPaper(tone);
  D.setBoil(0);
  ctx.fillStyle = D.paperPattern(ctx, tone);
  ctx.fillRect(0, 0, 1080, 1080);

  D.pen(ctx, D.INK, 5);
  D.rect(ctx, 50, 50, 980, 980, { amt: 3 });

  D.text(ctx, 'Christmas Card Characters', 540, 130, 64, { sc: true });
  D.text(ctx, 'Save The Seasonal Spirit', 540, 195, 46);

  // stars burst like the cards
  D.pen(ctx, D.INK, 4);
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * (1.1 + i * 0.1);
    D.line(ctx, 540 + Math.cos(a) * 260, 640 + Math.sin(a) * 260, 540 + Math.cos(a) * 340, 640 + Math.sin(a) * 340, 2);
  }
  for (const [x, y] of [[220, 330], [860, 340], [180, 560], [900, 560]]) {
    D.pen(ctx, D.INK, 3);
    D.star(ctx, x, y, 22, { fill: 'rgba(241,200,75,0.7)' });
  }

  ctx.save();
  ctx.translate(540, 760);
  ctx.scale(6.5, 6.5);
  D.setPenScale(0.45);
  ch.draw(ctx, { state: 'idle', t: 0.4 });
  ctx.restore();

  ctx.save();
  ctx.translate(830, 780);
  ctx.scale(3.2, 3.2);
  D.setPenScale(0.7);
  drawJunie(ctx, 0.2);
  D.setPenScale(1);
  ctx.restore();

  D.text(ctx, `I saved the Seasonal Spirit as`, 540, 830, 44);
  D.text(ctx, ch.name, 540, 890, 62, { sc: true });
  D.text(ctx, `Score: ${score.toLocaleString('en-GB')}`, 540, 960, 52, { color: D.RED });
  D.text(ctx, 'Can you beat me?', 540, 1010, 30);
  return c;
}

export async function shareImage(charId, score) {
  const canvas = makeShareImage(charId, score);
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
  const file = new File([blob], 'seasonal-spirit-saved.png', { type: 'image/png' });
  const text = `I saved the Seasonal Spirit as ${CHARACTERS[charId].name} with ${score.toLocaleString('en-GB')} points! ${gameUrl()}`;
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text });
      return 'shared';
    } catch (e) {
      if (e && e.name === 'AbortError') return 'cancelled';
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  return 'downloaded';
}

export function whatsappLink(charId, score) {
  const text = `I saved the Seasonal Spirit as ${CHARACTERS[charId].name} with ${score.toLocaleString('en-GB')} points! Can you beat me? ${gameUrl()}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
