import { content, type Language } from './content';

type Point = {x: number; y: number; pressure: number};
type Stroke = {color: string; points: Point[]};

export function initDrawing(getLanguage: () => Language) {
  const canvas = document.querySelector<HTMLCanvasElement>('#drawing')!;
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  const paper = document.querySelector<HTMLElement>('.drawing-paper')!;
  const clear = document.querySelector<HTMLButtonElement>('.clear-drawing')!;
  const save = document.querySelector<HTMLButtonElement>('.save-drawing')!;
  const status = document.querySelector<HTMLElement>('.drawing-status')!;
  let strokes: Stroke[] = [], active: Stroke | null = null, pointer: number | null = null;
  let color = '#34312b';

  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const stroke of strokes) {
      ctx.strokeStyle = stroke.color;
      for (let i = 0; i < stroke.points.length; i++) {
        const a = stroke.points[Math.max(0, i-1)], b = stroke.points[i];
        ctx.lineWidth = 1.6 + b.pressure * 2.6;
        ctx.globalAlpha = .75 + b.pressure * .2;
        ctx.beginPath(); ctx.moveTo(a.x * canvas.width, a.y * canvas.height);
        ctx.lineTo(b.x * canvas.width + (i === 0 ? .3 : 0), b.y * canvas.height + (i === 0 ? .3 : 0)); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  };
  const update = () => { clear.disabled = save.disabled = strokes.length === 0; paper.classList.toggle('has-marks', strokes.length > 0); };
  const point = (event: PointerEvent): Point => { const r = canvas.getBoundingClientRect(); return {x: Math.max(0, Math.min(1,(event.clientX-r.left)/r.width)), y: Math.max(0, Math.min(1,(event.clientY-r.top)/r.height)), pressure: event.pointerType === 'pen' ? event.pressure : .45}; };
  const down = (event: PointerEvent) => {
    if (pointer !== null || event.button !== 0) return;
    pointer = event.pointerId; canvas.setPointerCapture(pointer);
    active = {color, points: [point(event)]}; strokes.push(active); update(); draw();
  };
  const move = (event: PointerEvent) => {
    if (event.pointerId !== pointer || !active) return;
    const events = event.getCoalescedEvents?.() ?? [event];
    for (const coalesced of events.length ? events : [event]) active.points.push(point(coalesced));
    draw();
  };
  const up = (event: PointerEvent) => { if (event.pointerId !== pointer) return; active = null; pointer = null; status.textContent = content[getLanguage()].drawingAdded; };
  canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move); canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('lostpointercapture', () => {pointer = null; active = null;});
  canvas.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); addLine(); } });
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-color]')) button.addEventListener('click', () => { color = button.dataset.color!; document.querySelectorAll('[data-color]').forEach(el=>el.setAttribute('aria-pressed',String(el===button))); });
  function addLine() {
    const n = strokes.length % 6;
    const points = Array.from({length: 100}, (_,i)=>({x:.12+i*.0075, y:.27+n*.07+Math.sin(i*.065+n)*.075, pressure:.45}));
    strokes.push({color,points}); update(); draw(); status.textContent = content[getLanguage()].drawingAdded;
  }
  document.querySelector('.add-line')!.addEventListener('click', addLine);
  clear.addEventListener('click', () => { strokes = []; active = null; pointer = null; draw(); update(); status.textContent = content[getLanguage()].drawingCleared; });
  save.addEventListener('click', () => {
    const output = document.createElement('canvas');
    const displayed = canvas.getBoundingClientRect();
    output.width = canvas.width;
    output.height = Math.round(output.width * displayed.height / displayed.width);
    const target = output.getContext('2d'); if (!target) return;
    target.fillStyle = '#f1eee5'; target.fillRect(0,0,output.width,output.height); target.drawImage(canvas,0,0,output.width,output.height);
    output.toBlob(blob=> { if (!blob) return; const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'mi-trazo.png'; a.click(); window.setTimeout(()=>URL.revokeObjectURL(url),1000); status.textContent = content[getLanguage()].drawingSaved; });
  });
  return draw;
}
