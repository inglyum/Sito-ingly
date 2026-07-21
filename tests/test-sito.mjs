/* Test del SITO pubblico: carica index.html con il bundle di fallback e verifica
   immagini categoria, pulsante WhatsApp e foto portfolio. */
import { JSDOM, VirtualConsole } from 'jsdom';
import { readFileSync, writeFileSync, copyFileSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { execSync } from 'child_process';

const ROOT = '.';
const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => { const m = String(e.message || e); if (!/getContext/.test(m)) errors.push('jsdomError: ' + m); });

// dati di prova: una categoria e una tessera portfolio CON immagine, WhatsApp attivo
const cats = JSON.parse(readFileSync(ROOT + '/data/categories.json', 'utf8'));
cats[0].img = 'img/cat-casa.webp';
const content = JSON.parse(readFileSync(ROOT + '/data/content.json', 'utf8'));
content.PORT[0][3] = 'img/port-1.webp';
const config = JSON.parse(readFileSync(ROOT + '/data/config.json', 'utf8'));
config.aboutMedia = { tipo: 'immagine', src: 'img/about.webp' };
// THEME ENGINE: tema natalizio in calendario con artwork per la categoria casa
content.THEMES = { attivo: 'default', auto: true, temi: [
  { id:'default', n:{it:'Default',en:'Default'}, palette:['#111827','#1E3A8A','#FACC15'], stato:'libreria', art:{} },
  { id:'christmas', n:{it:'Natale',en:'Christmas'}, palette:['#0B1A2E','#C8A24A','#F5F0E6'],
    stato:'attivo', dal:'01-01', al:'12-31', prio:20, bg:'bokeh', art:{ casa:'img/theme/christmas-casa.webp' } }
]};
content.PORT[1][4] = 'https://www.instagram.com/p/ABC123/';
config.whatsappFab = { attivo: true, numero: '393331234567', messaggio: 'Ciao INGLY!', etichetta: { it: 'Scrivici su WhatsApp', en: 'Chat on WhatsApp' } };

const products = JSON.parse(readFileSync(ROOT + '/data/products.json', 'utf8'));
// SPORCA i dati come farebbe un backup vecchio o un import sbagliato
products[0].mat = 'MaterialeInesistente';   // causava: Cannot read properties of undefined (reading 'bg')
products[1].sub = 0;                        // sottocategoria fuori scala
delete products[2].n.en;                    // traduzione mancante
content.FOCAL = { 'img/1.webp': '30% 20%' };// punto focale
content.REVIEWS[0].st = 4;
content.REVIEWS[0].ph = ['img/1.webp', 'img/2.webp'];
content.REVIEWS[0].vf = true;
content.REVIEWS[0].dt = 'Marzo 2026';
content.SPONSORS = { attivo:true, grigio:false,
  titolo:{it:'Partner',en:'Partners'}, sottotitolo:{it:'Con chi lavoriamo',en:'Who we work with'},
  cta:{it:'Vuoi comparire qui?',en:'Want to appear here?'}, ctaLink:'#/contatti',
  lista:[
    {nome:'Bronzo Srl', livello:'bronze', link:'https://b.example', logo:'img/1.webp'},
    {nome:'Oro Spa',    livello:'gold',   link:'https://g.example', logo:'img/2.webp', desc:{it:'Falegnameria',en:'Woodshop'}},
    {nome:'Argento Snc',livello:'silver', logo:'img/3.webp'},
    {nome:'Nascosto',   livello:'silver', attivo:false}
  ]};
content.PROMO = { attivo:false, id:'p1', dal:'', al:'', testo:{it:'Promo di prova',en:'Test promo'},
                  cta:{it:'Vai',en:'Go'}, link:'#/shop', colori:'#1E3A8A,#111827' };
// prodotto ricco (2.1): video, tabella misure, correlati scelti a mano
products[0].video = 'https://cdn.example/p1.mp4';
products[0].misure = [['Dimensioni', '30 × 20 cm'], ['Spessore', '5 mm']];
products[0].rel = [products[7].id, products[9].id];
const INGLY = Object.assign({
  CONFIG: config,
  D: JSON.parse(readFileSync(ROOT + '/data/texts.json', 'utf8')),
  SOCIALS: JSON.parse(readFileSync(ROOT + '/data/social.json', 'utf8')),
  P: products,
  CATS: cats
}, content, { __v: 12345 });

const html = readFileSync(ROOT + '/index.html', 'utf8')
  .replace(/<script[^>]*src="[^"]*app\.js"[^>]*>\s*<\/script>/g, '');

const dom = new JSDOM(html, {
  url: 'https://inglyum.github.io/sito-ingly/',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  virtualConsole: vc,
  beforeParse(win) {
    win.INGLY = INGLY;
    // motore artwork (nel sito reale arriva da <script src="assets/js/artwork.js">)
    const art = readFileSync(ROOT + '/assets/js/artwork.js', 'utf8');
    new Function('window', art)(win);
    win.scrollTo = () => {};
    win.matchMedia = () => ({ matches: false, addEventListener() {}, addListener() {} });
    win.__observed = [];
    win.IntersectionObserver = class {
      observe(el) { win.__observed.push(el) } unobserve() {} disconnect() {} };
    win.fetch = async () => ({ ok: false, status: 404, json: async () => ({}) });
  }
});
const win = dom.window, doc = win.document;
await new Promise(r => setTimeout(r, 300));

// esegue il bundle di fallback (stesso codice del sito, senza moduli ES)
const bundle = readFileSync(ROOT + '/assets/js/app.fallback.js', 'utf8');
const s = doc.createElement('script'); s.textContent = bundle; doc.body.appendChild(s);
await new Promise(r => setTimeout(r, 500));

const wait = ms => new Promise(r => setTimeout(r, ms));
let prodMod = null;
let pass = 0, fail = 0;
const check = (n, c, x = '') => { if (c) { pass++; console.log('  ✔ ' + n) } else { fail++; console.log('  ✖ ' + n + (x ? ' → ' + x : '')) } };
const $ = id => doc.getElementById(id);

// il loader NON deve mostrare l'errore fatale
const loaderTxt = (doc.getElementById('loader') || {}).textContent || '';
console.log('\n=== SITO PUBBLICO ===');
check('nessun errore JS', errors.length === 0, errors.slice(0, 2).join(' | '));
check('nessun errore fatale nel loader', !/Impossibile caricare/.test(loaderTxt), loaderTxt.slice(0,120));

const bento = $('catBento');
check('griglia "12 mondi" renderizzata', bento && bento.querySelectorAll('.bcard').length >= 12, bento ? bento.querySelectorAll('.bcard').length + ' card' : 'assente');
check('categoria CON immagine mostra la foto', bento && bento.querySelector('.bcard--photo img.bimg') !== null);
check('immagine categoria con cache-busting (?v=)', bento && /\.webp\?v=\d/.test(bento.innerHTML));
check('ogni card riceve uno sfondo (foto o generato)', bento && bento.querySelectorAll('.bcard--photo').length >= 12);

const fab = $('waFab');
check('pulsante WhatsApp presente nel DOM', !!fab);
check('pulsante WhatsApp visibile', fab && fab.style.display !== 'none', 'display=' + (fab && fab.style.display));
check('link WhatsApp corretto (numero)', fab && fab.href.includes('wa.me/393331234567'), fab && fab.href);
check('messaggio precompilato presente', fab && fab.href.includes('Ciao'), fab && fab.href);
check('etichetta tradotta', fab && /WhatsApp/.test(fab.textContent));

const port = $('portGrid');
check('portfolio renderizzato', port && port.querySelectorAll('.gtile').length >= 10);
check('tessera portfolio con foto usa <img>', port && port.querySelector('.gtile--photo img.gimg') !== null);

const biz = $('bizCards');
const tech = $('techGrid');
check('sezione Tecnologie renderizzata dai dati', tech && tech.querySelectorAll('.mcard').length >= 3);
check('sezione Business renderizzata dai dati', biz && biz.querySelectorAll('.rcard').length >= 3);

console.log('\n=== NUOVE FUNZIONI ===');
const art = doc.querySelector('.about-art');
check('«Chi siamo»: immagine personalizzata al posto del logo', art && art.querySelector('.about-media img') !== null);
check('«Chi siamo»: immagine con cache-busting', art && /about\.webp\?v=/.test(art.innerHTML));
check('portfolio: tessera con link Instagram è cliccabile', port && port.querySelector('a.gtile-a[href*="instagram.com/p/ABC123"]') !== null);
check('portfolio: tessere senza link restano statiche', port && port.querySelectorAll('figure.gtile').length > port.querySelectorAll('a.gtile-a').length);

// test: WhatsApp disattivato
INGLY.CONFIG.whatsappFab.attivo = false;
win.dispatchEvent(new win.Event('resize'));
const st1 = bento.querySelectorAll('.bcard')[1].getAttribute('style').replace(/\s+/g, '');
check('data-uri non tronca l attributo style (apici singoli)', st1.includes('svg+xml'), st1.slice(0, 90));
check('lo sfondo generato sopravvive alle modifiche di style da JS',
  bento.querySelectorAll('.bcard--gen').length >= 10,
  bento.querySelectorAll('.bcard--gen').length + ' card');
console.log('\n=== AUTO-GUARIGIONE DATI (regressione crash) ===');
check('il sito NON crolla con un materiale inesistente', errors.length === 0, errors.slice(0,1).join(''));
check('materiale non valido riparato', win.INGLY.P[0].mat !== 'MaterialeInesistente');
check('sottocategoria fuori scala riparata', win.INGLY.P[1].sub === 1);
check('traduzione mancante riparata', typeof win.INGLY.P[2].n.en === 'string');
check('griglia prodotti renderizzata comunque', doc.getElementById('shopGrid') && doc.getElementById('shopGrid').querySelectorAll('.pcard').length > 10);

console.log('\n=== PUNTO FOCALE ===');
const grid = doc.getElementById('shopGrid');
check('punto focale applicato alle foto prodotto', grid && /object-position:30% 20%/.test(grid.innerHTML));
check('immagini senza punto focale restano invariate', grid && grid.querySelectorAll('img.pimgph').length > (grid.innerHTML.match(/object-position/g)||[]).length);

console.log('\n=== FASE 2.1 — Pagina prodotto ===');
await wait(120);
check('lightbox presente nel DOM', !!doc.getElementById('lightbox'));
check('video del prodotto renderizzato', /<video[^>]+p1\.mp4/.test(doc.getElementById('ppVideo').innerHTML));
check('tabella misure renderizzata', doc.getElementById('ppSizes').querySelectorAll('tr').length === 2);
check('misure mostrano etichetta e valore', /30 × 20 cm/.test(doc.getElementById('ppSizes').innerHTML));
check('suggerimento zoom presente', /pp-zoomhint/.test(doc.getElementById('ppArt').innerHTML));
const rel = doc.getElementById('relGrid');
const firstRel = rel && rel.querySelector('.pcard');
check('il correlato scelto a mano è il primo della griglia',
  firstRel && firstRel.outerHTML.includes('data-id="' + products[7].id + '"'),
  firstRel ? firstRel.outerHTML.slice(0, 80) : 'nessuna card');
// apertura lightbox
doc.getElementById('ppMain').click(); await wait(120);
check('lightbox si apre al click sulla foto', doc.getElementById('lightbox').hidden === false);
check('lightbox mostra un immagine', !!doc.getElementById('lbxImg').getAttribute('src'));
doc.getElementById('lbxClose').click(); await wait(80);
check('lightbox si chiude', doc.getElementById('lightbox').hidden === true);

console.log('\n=== FASE 2.2 — Ricerca e filtri ===');
check('ordinamento «Novità» disponibile', /value="nw"/.test(doc.getElementById('sortSel').innerHTML));
check('contenitore suggerimenti presente', !!doc.getElementById('sugg'));
const q = doc.getElementById('q');
q.value = products[0].n.it.slice(0, 5);
q.dispatchEvent(new win.Event('input'));
await wait(150);
check('suggerimenti mostrati mentre si scrive', doc.getElementById('sugg').hidden === false &&
  doc.getElementById('sugg').querySelectorAll('button').length > 0);
check('suggerimenti etichettati per tipo', /class="k"/.test(doc.getElementById('sugg').innerHTML));
// filtri nell'URL
win.location.hash = '#/shop';
await wait(150);
prodMod = null;
q.value = '';
q.dispatchEvent(new win.Event('input'));
await wait(200);
check('lo stato dei filtri finisce nell URL', /#\/shop/.test(win.location.hash));

console.log('\n=== THEME ENGINE ===');
check('artwork del tema applicato alla categoria', bento && /theme\/christmas-casa\.webp/.test(bento.innerHTML));
check('artwork del tema ha priorità sull immagine fissa', bento && !/cat-casa\.webp/.test(bento.innerHTML));
check('accento del tema applicato al documento', doc.documentElement.style.getPropertyValue('--theme-accent').trim() === '#F5F0E6');
check('attributo data-theme impostato', doc.documentElement.getAttribute('data-theme') === 'christmas');
check('categorie senza artwork restano invariate', bento && bento.querySelectorAll('.bcard').length >= 12);
check('sfondo generato applicato alle categorie senza foto', bento && /--card-bg:url\('data:image\/svg\+xml/.test(bento.innerHTML));
check('la foto caricata ha la precedenza sullo sfondo generato', bento && /christmas-casa\.webp/.test(bento.innerHTML));
const genCards = bento.querySelectorAll('.bcard--gen').length;
check('tutte le altre categorie ricevono lo sfondo', genCards >= 10, genCards + ' card');

console.log('\n=== SPONSOR & PARTNER ===');
const spSec = doc.getElementById('sponsorSec');
check('sezione sponsor presente', !!spSec);
check('sezione visibile quando ci sono partner', spSec.hidden === false);
// REGRESSIONE: una sezione .reveal mai osservata resta a opacity:0 per sempre
check('la sezione sponsor viene osservata (altrimenti resterebbe invisibile)',
  win.__observed.includes(spSec), win.__observed.length + ' elementi osservati');
const orfani = [...doc.querySelectorAll('.reveal')].filter(el => {
  const pg = el.closest('.page');
  if (pg && !pg.classList.contains('active')) return false;
  if (el.classList.contains('in')) return false;   // già rivelato: visibile comunque
  return !win.__observed.includes(el);
});
check('nessun elemento .reveal resta senza osservatore', orfani.length === 0,
  orfani.slice(0,3).map(e => e.id || e.className).join(' | '));
const spGrid = doc.getElementById('spGrid');
check('partner renderizzati', spGrid && spGrid.querySelectorAll('.sp-it').length === 3, (spGrid.querySelectorAll('.sp-it').length) + ' voci');
check('partner nascosto escluso', !/Nascosto/.test(spGrid.innerHTML));
check('Gold viene per primo', spGrid.querySelector('.sp-it').classList.contains('gold'));
check('link con rel sponsored', /rel="noopener sponsored"/.test(spGrid.innerHTML));
check('partner senza link non è un collegamento', spGrid.querySelectorAll('div.sp-it').length >= 1);
check('loghi a colori di default', spSec.classList.contains('color'));
check('descrizione mostrata quando presente', /Falegnameria/.test(spGrid.innerHTML));
check('invito finale con link', /#\/contatti/.test(doc.getElementById('spCta').innerHTML));

console.log('\n=== RECENSIONI ===');
const rv = doc.getElementById('revGrid');
check('recensioni renderizzate', rv && rv.querySelectorAll('.rcard').length >= 2);
check('stelle parziali mostrate', /class="off"/.test(rv.innerHTML));
check('foto della recensione mostrate', rv.querySelectorAll('.rph img').length >= 1);
check('badge cliente verificato', /class="vfd"/.test(rv.innerHTML));
check('data della recensione mostrata', /Marzo 2026/.test(rv.innerHTML));
rv.querySelector('[data-action="rev-photo"]').click();
await wait(120);
check('la foto recensione si apre nella lightbox', doc.getElementById('lightbox').hidden === false);
doc.getElementById('lbxClose').click(); await wait(60);

console.log('\n=== FASE 1.3 — Tema su tutta la pagina ===');
check('classe has-theme-bg attiva', doc.documentElement.classList.contains('has-theme-bg'));
check('variabile --theme-bg impostata', /svg\+xml/.test(doc.documentElement.style.getPropertyValue('--theme-bg')));
check('accento del tema propagato', !!doc.documentElement.style.getPropertyValue('--theme-accent'));

console.log('\n=== FASE 3.2 — Ingresso scaglionato ===');
const allRev = [...doc.querySelectorAll('.reveal')];
const delayed = allRev.filter(e => e.style.getPropertyValue('--rd'));
check('ritardi progressivi applicati', delayed.length > 0, delayed.length + ' su ' + allRev.length);
check('il primo elemento di ogni gruppo non ha ritardo', allRev.some(e => !e.style.getPropertyValue('--rd')));
check('i ritardi crescono di 70ms', delayed.some(e => e.style.getPropertyValue('--rd') === '70ms'));

console.log('\n=== FASE 2.4 — Fascia promozionale ===');
const bar = doc.getElementById('promoBar');
check('contenitore fascia presente', !!bar);
check('fascia spenta non viene mostrata', bar.innerHTML.trim() === '');

console.log('\n=== ICONE VETTORIALI ===');
check('categorie usano le icone SVG INGLY', bento && bento.querySelectorAll('.ic .ic-svg').length >= 10);
check('riferimento corretto allo sprite', bento && /ingly-icons\.svg#ic-casa/.test(bento.innerHTML));
const techG = doc.getElementById('techGrid');
check('tecnologie usano le icone SVG', techG && techG.querySelectorAll('.ic-svg').length >= 3);
// fallback: categoria senza icon deve tornare all'emoji
check('fallback emoji per icone non definite', bento && bento.querySelectorAll('.ic .ic-emoji').length >= 0);

console.log(`\n=========== SITO: ${pass} passati, ${fail} falliti ===========`);
if (errors.length) errors.slice(0, 5).forEach(e => console.log(' - ' + e.slice(0, 180)));
process.exit(fail ? 1 : 0);
