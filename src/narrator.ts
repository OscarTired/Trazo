/** The guide is articulated geometry: every joint follows scroll, rather than a static picture. */
export function drawNarrator(canvas: HTMLCanvasElement, phase = 0, facing = 1) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.scale(2, 2);
  if (facing < 0) { ctx.translate(64, 0); ctx.scale(-1, 1); }
  ctx.strokeStyle = '#3a3730';
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const step = Math.sin(phase) * 12;
  const bob = Math.abs(Math.sin(phase)) * 2;
  ctx.translate(0, -bob);
  const line = (points: number[]) => { ctx.beginPath(); ctx.moveTo(points[0], points[1]); for(let i=2;i<points.length;i+=2) ctx.lineTo(points[i],points[i+1]); ctx.stroke(); };
  ctx.beginPath(); ctx.ellipse(31,12,7.8,9,.2,0,Math.PI*2); ctx.stroke();
  ctx.fillStyle = '#3a3730'; ctx.beginPath(); ctx.arc(34,11,1.2,0,Math.PI*2); ctx.fill();
  line([29,22,24,60]);
  line([28,28,34 + step*.3,48,54,55]);
  line([27,30,14 - step*.3,48,11 - step*.2,63]);
  line([24,60,38 + step*.3,82,50 + step,104,58 + step,106]);
  line([24,60,18 - step*.3,83,7 - step,103,1 - step,104]);
  ctx.globalAlpha = .2; ctx.lineWidth = .9; line([30,23,26,60,39 + step*.3,82]);
  ctx.globalAlpha = 1; ctx.strokeStyle = '#a32d20'; ctx.lineWidth = 3; line([51,57,58,50]);
  ctx.restore();
}
