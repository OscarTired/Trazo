import { chapterIds, content, sources, type Language } from './content';
import { assetUrl } from './assets';

export const arrowRight = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h17m-6-6 6 6-6 6"/></svg>';
export const arrowUpRight = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12"/></svg>';
export const pencilIcon = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m4 16 12-12 4 4-12 12-5 1 1-5ZM13 7l4 4M4 16l4 4"/></svg>';

/** A continuous diagonal hatching path reveals the real graphite artwork, stroke by stroke. */
export function hatchPath() {
  const points: string[] = [];
  for (let k = -512; k <= 512; k += 38) {
    const left = Math.max(0, -k), top = Math.max(0, k);
    const right = Math.min(512, 512 - k), bottom = Math.min(512, 512 + k);
    const flip = Math.round((k + 512) / 38) % 2 === 0;
    const a = flip ? [left, top] : [right, bottom];
    const b = flip ? [right, bottom] : [left, top];
    points.push(`${points.length ? 'L' : 'M'}${a[0]} ${a[1]} L${b[0]} ${b[1]}`);
  }
  return points.join(' ');
}

export function renderStory(language: Language) {
  const c = content[language];
  const chapterList = c.chapters.map((chapter, i) => `<a href="#${chapterIds[i]}" class="timeline-stop"><span class="timeline-point" aria-hidden="true"></span><span>${chapter.name}</span></a>`).join('');
  const journey = `<section class="journey" id="recorrido" aria-labelledby="journey-heading"><div class="journey-intro"><h2 id="journey-heading">${c.journeyTitle}</h2><p>${c.journeyText}</p></div><nav class="timeline" aria-label="${c.chapterNav}">${chapterList}</nav></section>`;
  const chapters = c.chapters.map((chapter, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    return `<section id="${chapterIds[i]}" class="chapter chapter-${i + 1} ${i % 2 ? 'chapter-reverse' : ''}" aria-labelledby="heading-${chapterIds[i]}" data-chapter="${i}">
      <div class="chapter-copy">
        <h2 id="heading-${chapterIds[i]}">${chapter.title}</h2>
        <p class="chapter-date">${chapter.name}<span aria-hidden="true"> · </span>${chapter.date}</p>
        <p class="chapter-lead">${chapter.text}</p>
        <p class="chapter-detail">${chapter.detail}</p>
        <a class="source-link" href="${sources[i].url}" target="_blank" rel="noopener noreferrer">${c.source}${arrowUpRight}</a>
      </div>
      <figure class="artwork">
        <svg class="chapter-art" viewBox="0 0 512 512" role="img" aria-label="${chapter.alt}">
          <defs><mask id="sketch-mask-${i}" maskUnits="userSpaceOnUse" x="0" y="0" width="512" height="512"><path class="hatch" d="${hatchPath()}" fill="none" stroke="white" stroke-width="60" stroke-linecap="round" stroke-linejoin="round" /></mask><clipPath id="cell-${i}"><rect width="512" height="512" /></clipPath></defs>
          <g clip-path="url(#cell-${i})"><image href="${assetUrl('chapters.webp')}" x="${-col * 512}" y="${-row * 512}" width="1536" height="1024" opacity=".07" /><image class="finished-art" href="${assetUrl('chapters.webp')}" x="${-col * 512}" y="${-row * 512}" width="1536" height="1024" mask="url(#sketch-mask-${i})" /></g>
          <circle class="pencil-point" cx="0" cy="0" r="2.8" fill="#a32d20" opacity="0" />
        </svg>
        <figcaption>${chapter.material}</figcaption>
      </figure>
      <div class="chapter-bottom"><span class="chapter-count">${String(i + 1).padStart(2, '0')} / 06</span><span>${i === 0 ? c.sketchHint : c.next}</span><span class="chapter-bottom-rule" aria-hidden="true"></span></div>
    </section>`;
  }).join('');
  return journey + `<div class="chapters">${chapters}</div>`;
}

export function closingMarkup() {
  return `<section class="closing" id="tu-trazo" aria-labelledby="closing-heading">
    <div class="closing-copy"><h2 id="closing-heading"><span data-ui="closingTitle"></span><br /><em data-ui="closingAccent"></em></h2><p data-ui="closingText"></p><span class="closing-note" aria-hidden="true">${pencilIcon}</span></div>
    <div class="drawing-studio">
      <div class="drawing-paper"><canvas id="drawing" width="1200" height="720" tabindex="0" aria-describedby="drawing-instructions drawing-keyboard"></canvas><p class="blank-hint" data-ui="canvasHint"></p></div>
      <p id="drawing-instructions" class="sr-only" data-ui="canvasHint"></p><p id="drawing-keyboard" class="sr-only" data-ui="canvasKeyboard"></p>
      <div class="drawing-toolbar"><div class="pencil-colors" role="group"><button type="button" class="pencil-color graphite" data-color="#34312b" aria-pressed="true"><span></span></button><button type="button" class="pencil-color red-pencil" data-color="#a32d20" aria-pressed="false"><span></span></button></div><button type="button" class="text-button add-line">${pencilIcon}<span data-ui="drawLine"></span></button><span class="toolbar-space"></span><button class="text-button clear-drawing" type="button" disabled><span data-ui="erase"></span></button><button class="text-button save-drawing" type="button" disabled><span data-ui="save"></span>${arrowRight}</button></div>
      <p class="drawing-status sr-only" role="status" aria-live="polite"></p>
    </div>
  </section>`;
}

export function footerMarkup() {
  return `<footer class="footer"><details class="sources"><summary><span data-ui="sources"></span><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></summary><div class="sources-content"><p data-ui="sourcesIntro"></p><ol>${sources.map(source=>`<li><a href="${source.url}" target="_blank" rel="noopener noreferrer">${source.name}${arrowUpRight}</a></li>`).join('')}</ol></div></details><div class="footer-bottom"><a class="footer-wordmark" href="#inicio" aria-label="Trazo">trazo.</a><p data-ui="footer"></p><button class="text-button replay-intro" type="button" data-ui="replay"></button><a class="back-top" href="#inicio"><span data-ui="backTop"></span><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20V4m-6 6 6-6 6 6"/></svg></a></div></footer>`;
}
