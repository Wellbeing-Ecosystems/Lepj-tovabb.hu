// Lépj tovább! – a design/*.dc.html honlaptervből statikus HTML oldalakat készít a site/ mappába.
// Futtatás: cd tools && npm install && npm run generate
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DESIGN = path.join(ROOT, 'design');
const SITE = path.join(ROOT, 'site');

// Az élesítéskor ide kerül a végleges domain (a megosztási képekhez kell).
const SITE_URL = 'https://lepj-tovabb.hu';
// Amíg a helykitöltők ([...]) benne vannak, a keresők ne indexeljék az oldalt.
const NOINDEX = true;
// A Bevétel.hu jelentkezési űrlap beágyazási címe (pl. https://bevetel.hu/intrest?id=...&lang=hu).
// Amíg üres, a terv saját (nem küldő) űrlapja látszik.
const BEVETEL_URL = 'https://bevetel.hu/intrest?id=5c42f2d626098559&lang=hu';
const FONT_HEAD = '<link rel="preload" href="/fonts/outfit-latin-700-normal.woff2" as="font" type="font/woff2" crossorigin>\n<link rel="stylesheet" href="/fonts/fonts.css">';
const LEGAL_LINKS = '<nav aria-label="Jogi információk" class="legal-links"><a href="/adatkezeles">Adatkezelési tájékoztató</a><a href="/aszf">ÁSZF</a><a href="/impresszum">Impresszum</a></nav>';
// Google Tag Manager (GTM-5P75SGPQ). A Google-hozzájárulási mód alapból mindent tilt;
// a sütisáv „Elfogadom” gombja után engedélyezi a méréseket. A választás a böngészőben marad (localStorage).
const GTM_ID = 'GTM-5P75SGPQ';
function gtmHead(pageType) {
  return `<!-- Google Tag Manager – hozzájárulás alapértéke (a GTM előtt kell lefutnia) -->
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied', wait_for_update: 500 });
  try { if (localStorage.getItem('lt_suti') === 'igen') gtag('consent', 'update', { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted', analytics_storage: 'granted' }); } catch (e) {}
  dataLayer.push({ page_type: '${pageType}'${pageType === 'jelentkezes' ? ", jelentkezesi_oldal: true" : ''} });
</script>
<script async src="https://www.googletagmanager.com/gtm.js?id=${GTM_ID}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
</script>
<!-- /Google Tag Manager -->`;
}
// Sütisáv: minden oldal aljára; a láblécbe „Süti-beállítások” gomb kerül, amellyel újra megnyitható.
const COOKIE_BANNER = `<div id="sutisav" role="dialog" aria-live="polite" aria-label="Sütik" hidden style="position:fixed;left:16px;right:16px;bottom:16px;z-index:1000;max-width:760px;margin:0 auto;background:#FFFDF8;color:#33261C;border:1px solid #E8DFD0;border-radius:20px;box-shadow:0 10px 30px rgba(51,38,28,.18);padding:18px 22px;font-family:'Source Sans 3',sans-serif;display:flex;flex-wrap:wrap;align-items:center;gap:12px 20px">
<p style="margin:0;flex:1 1 320px;font-size:1rem;line-height:1.5">Látogatottságméréshez sütiket használnánk, hogy lássuk, mi segít a legtöbbet az oldalon. Csak a hozzájárulásoddal kapcsoljuk be. <a href="/adatkezeles#sutik" style="color:#7A3E17">Részletek</a></p>
<div style="display:flex;gap:10px;flex-wrap:wrap"><button type="button" data-suti="nem" style="min-height:44px;padding:0 18px;border:1.5px solid #CFC3AF;border-radius:999px;background:#FFFDF8;color:#33261C;font:600 1rem 'Outfit',sans-serif;cursor:pointer">Elutasítom</button><button type="button" data-suti="igen" style="min-height:44px;padding:0 18px;border:0;border-radius:999px;background:#7A3E17;color:#FFFDF8;font:600 1rem 'Outfit',sans-serif;cursor:pointer">Elfogadom</button></div>
</div>
<script>
(function(){var sav=document.getElementById('sutisav');if(!sav)return;var v=null;try{v=localStorage.getItem('lt_suti');}catch(e){}
function nyit(){sav.hidden=false;sav.style.display='flex';}function zar(){sav.hidden=true;sav.style.display='none';}
if(!v)nyit();else zar();
sav.addEventListener('click',function(e){var b=e.target.closest('[data-suti]');if(!b)return;var igen=b.getAttribute('data-suti')==='igen';var s=igen?'granted':'denied';
try{localStorage.setItem('lt_suti',igen?'igen':'nem');}catch(e){}
gtag('consent','update',{ad_storage:s,ad_user_data:s,ad_personalization:s,analytics_storage:s});dataLayer.push({event:igen?'suti_elfogadva':'suti_elutasitva'});zar();});
var hely=[];document.querySelectorAll('footer a[href="/impresszum"]').forEach(function(a){if(hely.indexOf(a.parentNode)<0)hely.push(a.parentNode);});hely.forEach(function(n){var b=document.createElement('button');b.type='button';b.textContent='Süti-beállítások';b.className='suti-link';b.style.color='#E8DFD0';b.style.textAlign='left';b.style.alignSelf='flex-start';b.addEventListener('click',nyit);n.appendChild(b);});})();
</script>`;
// Csak a jelentkezési oldalon: külön GTM-események a jelentkezéshez.
// A Bevétel.hu űrlap más domainről, iframe-ben fut, ezért a beküldést innen nem lehet látni;
// azt mérjük, hogy az űrlap láthatóvá vált-e, és hogy a látogató belekattintott-e.
const JELENTKEZES_TRACKING = `<script>
(function(){window.dataLayer=window.dataLayer||[];dataLayer.push({event:'jelentkezes_oldal_megtekintes'});
var doboz=document.getElementById('jelentkezes-urlap');if(!doboz)return;var f=doboz.querySelector('iframe');
if('IntersectionObserver' in window){var io=new IntersectionObserver(function(es){if(es.some(function(x){return x.isIntersecting;})){dataLayer.push({event:'jelentkezes_urlap_megtekintes'});io.disconnect();}},{threshold:0.4});io.observe(doboz);}
var volt=false;window.addEventListener('blur',function(){setTimeout(function(){if(!volt&&document.activeElement===f){volt=true;dataLayer.push({event:'jelentkezes_urlap_interakcio'});}},0);});})();
</script>`;
let SHELL = null; // a főoldal fejléce és lábléce a jogi oldalakhoz

const PAGES = {
  'Main.dc.html': { out: 'index.html', url: '/', og: '01_ujrakezdes_osveny',
    desc: '12 alkalmas, nyitott válásfeldolgozó és újratervező csoport Budapesten: gyász, önismeret, konfliktuskezelés, gyermekek, új kapcsolatok és jövőépítés.' },
  'Program.dc.html': { out: 'program.html', url: '/program', og: '02_csoportszoba',
    desc: 'A Lépj tovább! 12 alkalmas válásfeldolgozó program négy modulja: veszteség és gyász, önmagam újraértelmezése, kapcsolatok újrarendezése, újrakezdés.' },
  'Kinekszol.dc.html': { out: 'kinek-szol.html', url: '/kinek-szol', og: '03_ferfi_ablaknal',
    desc: 'Válás után nem tudsz továbblépni? Kinek szól a Lépj tovább! válásfeldolgozó csoport, és mikor nem a csoport az első lépés.' },
  'Gyermekek.dc.html': { out: 'valas-es-gyermekek.html', url: '/valas-es-gyermekek', og: '04_apa_gyermek_park',
    desc: 'Hogyan segítheted a gyermekeidet a válás során? Normális reakciók, kommunikáció, közös szülőség és életkor szerinti útmutató.' },
  'Exkapcsolat.dc.html': { out: 'exkapcsolat.html', url: '/exkapcsolat', og: '05_hatizsak_atadas',
    desc: 'Válás utáni konfliktuskezelés, kommunikáció az expartnerrel, közös szülőség, határok és érzelmi leválás.' },
  'Rolam.dc.html': { out: 'rolunk.html', url: '/rolunk', og: '02_csoportszoba',
    desc: 'A Lépj tovább! koncepciója és oktatóink, Tímár Ildikó és Lovász Zoltán bemutatkozása.' },
  'Cikkek.dc.html': { out: 'cikkek/index.html', url: '/cikkek', og: '06_no_tea_kanape',
    desc: 'Cikkek a válás feldolgozásáról, a gyermekekről, az újrakezdésről és a kapcsolatokról.' },
  'Jelentkezes.dc.html': { out: 'jelentkezes.html', url: '/jelentkezes', pageType: 'jelentkezes', og: '10_tea_jegyzetfuzet',
    desc: 'Gyakori kérdések és jelentkezés díjmentes konzultációra a Lépj tovább! válásfeldolgozó csoportba.' },
  'Cikk-gyasz.dc.html': { out: 'cikkek/mennyi-ideig-tart-a-gyasz.html', url: '/cikkek/mennyi-ideig-tart-a-gyasz', og: '06_no_tea_kanape', article: true,
    desc: 'A válás utáni gyásznak nincs menetrendje – de vannak jelek, amelyekből láthatod, hogy halad a folyamat.' },
  'Cikk-gyermek.dc.html': { out: 'cikkek/mit-el-at-egy-gyermek-valaskor.html', url: '/cikkek/mit-el-at-egy-gyermek-valaskor', og: '07_anya_gyermek_rajzol', article: true,
    desc: 'Mit él át egy gyermek váláskor, életkor szerint – és mit tehetsz szülőként, hogy biztonságban érezze magát.' },
  'Cikk-uj-kapcsolat.dc.html': { out: 'cikkek/mikor-allok-keszen-uj-kapcsolatra.html', url: '/cikkek/mikor-allok-keszen-uj-kapcsolatra', og: '08_ferfi_kavezoban', article: true,
    desc: 'Öt kérdés, amely segít eldönteni, készen állsz-e egy új kapcsolatra a válás után.' },
  'Cikk-feldolgozas.dc.html': { out: 'cikkek/hogyan-dolgozzuk-fel-a-valast.html', url: '/cikkek/hogyan-dolgozzuk-fel-a-valast', og: 'cikk_hogyan_dolgozzuk_fel_a_valast', article: true,
    desc: 'A válás feldolgozása nem egyetlen döntés, hanem folyamat. Mi segít benne, mi nehezíti, és honnan tudod, hogy jó irányba haladsz?' },
  'Cikk-elengedes.dc.html': { out: 'cikkek/miert-nem-tudom-elengedni.html', url: '/cikkek/miert-nem-tudom-elengedni', og: 'cikk_miert_nem_tudom_elengedni', article: true,
    desc: 'Tudod, hogy vége, mégis visszahúz. Mi tart fogva egy véget ért kapcsolatban, és hogyan lehet lépésről lépésre elengedni?' },
  'Cikk-kozos-szuloseg.dc.html': { out: 'cikkek/kozos-szuloseg-konfliktus-nelkul.html', url: '/cikkek/kozos-szuloseg-konfliktus-nelkul', og: 'cikk_kozos_szuloseg_konfliktus_nelkul', article: true,
    desc: 'Párként vége, szülőként nem. Gyakorlati útmutató a válás utáni együttműködéshez: kommunikáció, szabályok, átadások és határok.' },
  'Cikk-onbizalom.dc.html': { out: 'cikkek/onbizalom-valas-utan.html', url: '/cikkek/onbizalom-valas-utan', og: 'cikk_onbizalom_valas_utan', article: true,
    desc: 'A válás gyakran az önértékelést is megrendíti. Honnan jön a „nem vagyok elég” érzése, és hogyan lehet újraépíteni az önbizalmat?' },
  'Cikk-40-felett.dc.html': { out: 'cikkek/uj-elet-40-felett.html', url: '/cikkek/uj-elet-40-felett', og: 'cikk_uj_elet_40_felett', article: true,
    desc: 'Válás 40, 50 vagy 60 felett: nem késő újrakezdeni. Gyakorlati gondolatok az új napi rendről, a kapcsolatokról, a pénzügyekről és a jövőképről.' },
  'Cikk-toxikus.dc.html': { out: 'cikkek/toxikus-exkapcsolatok.html', url: '/cikkek/toxikus-exkapcsolatok', og: 'cikk_toxikus_exkapcsolatok', article: true,
    desc: 'Mikor válik egy válás utáni kapcsolat mérgezővé? Ismerd fel a jeleket – manipuláció, bűntudatkeltés, játszmák –, és tudd, mit tehetsz.' },
  'Cikk-hatarok.dc.html': { out: 'cikkek/egeszseges-hatarok-kialakitasa.html', url: '/cikkek/egeszseges-hatarok-kialakitasa', og: 'cikk_egeszseges_hatarok_kialakitasa', article: true,
    desc: 'A határok nem falak, hanem keretek, amelyek megvédik az energiádat. Hogyan húzz határt az expartnerrel, a családdal és saját magaddal szemben?' },
};

// A tervben használt képek (asset-azonosító → fájlnév-tő, elérhető szélességek, eredeti méret)
const LOGO_BLOB = 'dc230e1d9deab4db518f158007803f55';
const PHOTOS = {
  '39c5a41fc65862158538a973e6970fb3': ['01_ujrakezdes_osveny', [480, 800, 1200], 1200, 1200],
  '4736fbc0446844dabffe1f7494f73b6a': ['02_csoportszoba', [480, 800, 1200, 1600], 1600, 900],
  '4910694a4839da9bde1e770afdd57ad1': ['03_ferfi_ablaknal', [480, 800, 1200, 1600], 1600, 900],
  '89e5860667c923523ddb6730f8814870': ['04_apa_gyermek_park', [480, 800, 1200, 1600], 1600, 900],
  '3dea0970756cb7e79e10317a6647468a': ['05_hatizsak_atadas', [480, 800, 1200, 1600], 1600, 900],
  '97dc837aa864483ac182b5db0bc48ff5': ['06_no_tea_kanape', [480, 800, 1200, 1600], 1600, 900],
  '0d4e1d8656856bd86196a45ada0c1e87': ['07_anya_gyermek_rajzol', [480, 800, 1200, 1600], 1600, 900],
  '0a65060a17e18288137496fdc65d3036': ['08_ferfi_kavezoban', [480, 800, 1200, 1600], 1600, 900],
  '790ace21a4fae73be49a2983f404daec': ['09_oszi_erdo', [480, 800, 1200], 1200, 900],
  '81901f754ca40ad00cc9be4eae17d687': ['10_tea_jegyzetfuzet', [480, 800, 960], 960, 1200],
  'a5336c11d4bde4d1a7e1de20dd19a2e3': ['cikk_hogyan_dolgozzuk_fel_a_valast', [480, 800, 1200, 1600], 1600, 900],
  '4c084980f4bb7be2e7aff219af82acdb': ['cikk_miert_nem_tudom_elengedni', [480, 800, 1200, 1600], 1600, 900],
  '20341be6c872cff1aa384a6c1ac1451e': ['cikk_kozos_szuloseg_konfliktus_nelkul', [480, 800, 1200, 1600], 1600, 900],
  'a2812dfc9698d0e86a9844874a108ad7': ['cikk_onbizalom_valas_utan', [480, 800, 1200, 1600], 1600, 900],
  '6664f91c65e15bc65e03aa56175cbd73': ['cikk_uj_elet_40_felett', [480, 800, 1200, 1600], 1600, 900],
  '5f563ba3b65aefd9da4be083f9c45e9e': ['cikk_toxikus_exkapcsolatok', [480, 800, 1200, 1600], 1600, 900],
  'eab683c5f88514a43c1648567e35d177': ['cikk_egeszseges_hatarok_kialakitasa', [480, 800, 1200, 1600], 1600, 900],
  '222d7212dd4bc3174039cddb5b0b6b5e': ['lovasz-zoltan', [480, 800, 960], 960, 1200, 'trenerek'],
  'dcde4076c237454f7911dfae97495ca4': ['timar-ildiko', [480, 800, 960], 960, 1200, 'trenerek'],
};
const photoByStem = Object.fromEntries(Object.values(PHOTOS).map((p) => [p[0], p]));

function lookup(scope, p) {
  p = p.trim();
  if (p === 'true') return true;
  if (p === 'false') return false;
  return p.split('.').reduce((o, k) => (o == null ? undefined : o[k]), scope);
}
const fillHoles = (s, scope) =>
  s.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, p) => { const v = lookup(scope, p); return v == null ? '' : String(v); });

function expand($, parent, scope) {
  for (const node of [...$(parent).contents()]) {
    if (node.type === 'text') { node.data = fillHoles(node.data, scope); continue; }
    if (node.type !== 'tag') continue;
    if (node.name === 'sc-for') {
      const list = lookup(scope, ($(node).attr('list') || '').replace(/^\{\{|\}\}$/g, '')) || [];
      const as = $(node).attr('as') || 'item';
      const tpl = $(node).html();
      let out = '';
      list.forEach((item, i) => {
        const frag = cheerio.load(`<div id="__f">${tpl}</div>`, null, false);
        expand(frag, frag('#__f')[0], { ...scope, [as]: item, $index: i });
        out += frag('#__f').html();
      });
      $(node).replaceWith(out);
      continue;
    }
    if (node.name === 'sc-if') {
      const v = lookup(scope, ($(node).attr('value') || '').replace(/^\{\{|\}\}$/g, ''));
      if (v) { expand($, node, scope); $(node).replaceWith($(node).html()); } else $(node).remove();
      continue;
    }
    for (const [k, v] of Object.entries(node.attribs || {})) {
      if (k.startsWith('hint-')) { $(node).removeAttr(k); continue; }
      if (v.includes('{{')) $(node).attr(k, fillHoles(v, scope));
    }
    expand($, node, scope);
  }
}

const linkMap = Object.fromEntries(Object.entries(PAGES).map(([f, p]) => [f, p.url]));
function rewriteHref(h) {
  if (!h) return h;
  const m = h.match(/^([A-Za-z0-9_-]+\.dc\.html)(#.*)?$/);
  if (m && linkMap[m[1]]) return linkMap[m[1]] + (m[2] || '');
  return h;
}

let firstImage;
function rewriteImg($, el) {
  const src = $(el).attr('src') || '';
  const id = (src.match(/^\/_blob\/([0-9a-f]{32})$/) || [])[1];
  if (!id) return;
  if (id === LOGO_BLOB) {
    $(el).attr('src', '/img/logo/lepj-tovabb-logo-fejlec-128.webp')
      .attr('srcset', '/img/logo/lepj-tovabb-logo-fejlec-128.webp 149w, /img/logo/lepj-tovabb-logo-fejlec-256.webp 297w')
      .attr('sizes', '84px').attr('width', '84').attr('height', '72')
      .attr('style', 'display: block; height: 72px; width: auto');
    return;
  }
  const p = PHOTOS[id];
  if (!p) throw new Error('Ismeretlen kép: ' + id);
  const [stem, widths, w, h, dir = 'fotok'] = p;
  const max = widths[widths.length - 1];
  $(el).attr('src', `/img/${dir}/${stem}-${max >= 1200 ? 1200 : max}w.webp`);
  $(el).attr('srcset', widths.map((x) => `/img/${dir}/${stem}-${x}w.webp ${x}w`).join(', '));
  const style = $(el).attr('style') || '';
  const sizes = dir === 'trenerek' ? '(max-width: 700px) 90vw, 380px'
    : /width: 100%; height: 180px/.test(style) ? '(max-width: 700px) 100vw, 300px'
    : /aspect-ratio: 16 \/ 9; object-fit: cover; border-radius: 24px/.test(style) ? '(max-width: 1100px) 100vw, 1052px'
    : '(max-width: 960px) 100vw, 50vw';
  $(el).attr('sizes', sizes).attr('width', String(w)).attr('height', String(h));
  if (!firstImage) { firstImage = true; $(el).attr('fetchpriority', 'high'); }
  else { $(el).attr('loading', 'lazy'); }
  $(el).attr('decoding', 'async');
}

function build(file) {
  const meta = PAGES[file];
  const raw = fs.readFileSync(path.join(DESIGN, file), 'utf8');
  const $ = cheerio.load(raw);
  const title = $('title').first().text();
  const code = $('script[data-dc-script]').text();
  class DCLogic { constructor() { this.props = {}; this.state = {}; } setState() {} forceUpdate() {} }
  const Component = new Function('DCLogic', `${code}\nreturn Component;`)(DCLogic);
  const vals = new Component().renderVals() || {};

  const helmet = $('x-dc > helmet');
  const fontLinks = FONT_HEAD;
  const css = helmet.find('style').text().trim();
  helmet.remove();

  const xdc = $('x-dc')[0];
  expand($, xdc, vals);
  firstImage = false;
  $(xdc).find('a[href]').each((_, a) => { $(a).attr('href', rewriteHref($(a).attr('href'))); });
  $(xdc).find('img').each((_, img) => rewriteImg($, img));
  $(xdc).find('nav[aria-label="Főmenü"] a').each((_, a) => {
    if ($(a).attr('style')?.includes('border-bottom: 2px solid #D9701C')) $(a).attr('aria-current', 'page');
  });
  // Mobil menü: menügomb a főmenü elé, a fejléc kap egy osztályt
  const mainNav = $(xdc).find('nav[aria-label="Főmenü"]').first();
  mainNav.attr('id', 'fomenu');
  mainNav.parent().addClass('site-header');
  mainNav.before(`<button type="button" class="menu-btn" aria-expanded="false" aria-controls="fomenu" aria-label="Menü megnyitása"><svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"></path></svg><span>Menü</span></button>`);
  $(xdc).find('footer').each((_, f) => {
    if (!$(f).find('a[href="/impresszum"]').length) $(f).append(`<div style="max-width: 1240px; margin: 0 auto; padding: 0 24px 32px">${LEGAL_LINKS}</div>`);
  });
  if (BEVETEL_URL && file === 'Jelentkezes.dc.html') {
    $(xdc).find('form').replaceWith(`<div id="jelentkezes-urlap" data-gtm-jelentkezes="urlap" style="flex: 1 1 480px; min-width: 0; background: #FFFDF8; border-radius: 24px; padding: 16px; display: flex; flex-direction: column; gap: 10px"><iframe src="${BEVETEL_URL}" title="Jelentkezés – Lépj tovább!" width="100%" height="640" loading="lazy" style="border: none; background: transparent"></iframe><p style="margin: 0 12px 8px; font-size: 0.95rem; color: #4A3A2D">Az űrlap elküldésével elfogadod az <a href="/adatkezeles">adatkezelési tájékoztatót</a> és az <a href="/aszf">ÁSZF-et</a>.</p></div>`);
  }
  if (file === 'Main.dc.html') {
    SHELL = { header: $.html($(xdc).find('header').first()), footer: $.html($(xdc).find('footer').first()), css, fontLinks };
  }
  const body = $(xdc).html().trim();

  const og = photoByStem[meta.og];
  const ogImg = og ? `${SITE_URL}/img/fotok/${meta.og}-${og[1].includes(1200) ? 1200 : og[1][og[1].length - 1]}w.webp` : `${SITE_URL}/img/logo/og-alapkep-1200x630.jpg`;
  const html = `<!doctype html>
<html lang="hu">
<head>
${gtmHead(meta.pageType || 'oldal')}
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${meta.desc}">
${NOINDEX ? '<meta name="robots" content="noindex, nofollow">\n' : ''}<link rel="canonical" href="${SITE_URL}${meta.url}">
<meta property="og:type" content="${meta.article ? 'article' : 'website'}">
<meta property="og:locale" content="hu_HU">
<meta property="og:site_name" content="Lépj tovább! – Válásfeldolgozó Csoport">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${meta.desc}">
<meta property="og:url" content="${SITE_URL}${meta.url}">
<meta property="og:image" content="${ogImg}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#7A3E17">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/img/logo/favicon-32.png">
<link rel="apple-touch-icon" href="/img/logo/apple-touch-icon-180.png">
<link rel="manifest" href="/site.webmanifest">
${fontLinks}
<style>
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
img{max-width:100%;height:auto}
${css}
summary::-webkit-details-marker{color:#7A3E17}
a:focus-visible,button:focus-visible,summary:focus-visible,input:focus-visible,textarea:focus-visible{outline:3px solid #D9701C;outline-offset:3px}
.legal-links{display:flex;flex-wrap:wrap;gap:6px 22px;padding-top:20px;border-top:1px solid rgba(232,223,208,.25);font-size:.95rem}
.legal-links a,.legal-links .suti-link{color:#E8DFD0}
.suti-link{background:none;border:0;padding:0;font:inherit;text-decoration:underline;cursor:pointer}
.menu-btn{display:none;align-items:center;gap:8px;min-height:48px;padding:0 18px;border:1.5px solid #CFC3AF;border-radius:999px;background:#FFFDF8;color:#33261C;font:600 1rem 'Outfit',sans-serif;cursor:pointer}
@media (max-width: 1080px){
  .menu-btn{display:inline-flex}
  #fomenu{display:none !important}
  .site-header.open #fomenu{display:flex !important;flex-direction:column;align-items:stretch !important;width:100%;gap:0 !important;padding:8px 0 4px;border-top:1px solid #E8DFD0}
  .site-header.open #fomenu a{padding:14px 4px !important;border-bottom:1px solid #F0E9DD !important}
  .site-header.open #fomenu a:last-child{margin-top:12px;text-align:center;border-bottom:0 !important}
}
</style>
</head>
<body>
${body}
<script>
(function(){var b=document.querySelector('.menu-btn');if(!b)return;var h=b.closest('.site-header');
b.addEventListener('click',function(){var o=h.classList.toggle('open');b.setAttribute('aria-expanded',o);b.setAttribute('aria-label',o?'Menü bezárása':'Menü megnyitása');});})();
</script>
${COOKIE_BANNER}
${file === 'Jelentkezes.dc.html' ? JELENTKEZES_TRACKING + '\n' : ''}</body>
</html>
`;
  const outPath = path.join(SITE, meta.out);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html);
  console.log('✓', meta.out);
}

for (const f of Object.keys(PAGES)) build(f);

// Jogi oldalak: a design/jogi/*.html tartalmát a főoldal fejlécével és láblécével csomagoljuk be.
const LEGAL_CSS = `.legal{max-width:820px;margin:0 auto;padding:64px 24px 88px;color:#33261C}
.legal h1{margin:0 0 12px;font-family:'Outfit',sans-serif;font-weight:700;font-size:clamp(2rem,4.5vw,3rem);line-height:1.12;color:#7A3E17}
.legal h2{margin:44px 0 12px;font-family:'Outfit',sans-serif;font-weight:700;font-size:1.45rem;color:#33261C}
.legal h3{margin:28px 0 8px;font-family:'Outfit',sans-serif;font-weight:600;font-size:1.15rem}
.legal p,.legal li{color:#4A3A2D}.legal p{margin:0 0 14px}.legal ul,.legal ol{margin:0 0 16px;padding-left:1.3em}.legal li{margin-bottom:6px}
.legal .lead{font-size:1.2rem}.legal .meta{font-size:.95rem;color:#6B5A4C}
.legal dl{display:grid;grid-template-columns:minmax(0,220px) minmax(0,1fr);gap:8px 20px;margin:0 0 16px;padding:20px 24px;background:#FFFDF8;border-radius:16px}
.legal dt{font-weight:600;color:#6B5A4C}.legal dd{margin:0;overflow-wrap:anywhere}
.legal table{width:100%;border-collapse:collapse;margin:8px 0 16px;background:#FFFDF8;border-radius:16px;overflow:hidden;font-size:1rem}
.legal th,.legal td{text-align:left;vertical-align:top;padding:12px 14px;border-bottom:1px solid #E8DFD0}.legal th{font-family:'Outfit',sans-serif;font-weight:600}
.legal .table-wrap{overflow-x:auto}
.legal .note{background:#FBEBD6;border-radius:16px;padding:18px 22px;margin:8px 0 16px}.legal .note p{margin:0}
.legal mark{background:#F2B240;color:#33261C;padding:0 4px;border-radius:4px}
@media (max-width:600px){.legal dl{grid-template-columns:1fr}.legal dt{margin-top:6px}}`;
const legalDir = path.join(DESIGN, 'jogi');
if (fs.existsSync(legalDir) && SHELL) {
  const base = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8');
  for (const f of fs.readdirSync(legalDir).filter((x) => x.endsWith('.html'))) {
    const src = fs.readFileSync(path.join(legalDir, f), 'utf8');
    const meta = Object.fromEntries([...src.match(/<!--([\s\S]*?)-->/)[1].matchAll(/^\s*(\w+):\s*(.+)$/gm)].map((m) => [m[1], m[2].trim()]));
    const content = src.replace(/<!--[\s\S]*?-->/, '').trim().replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, '</table></div>');
    const $ = cheerio.load(base);
    const url = '/' + meta.out.replace(/\.html$/, '');
    const title = `${meta.title} – Lépj tovább!`;
    $('title').text(title);
    $('meta[name="description"], meta[property="og:description"]').attr('content', meta.desc);
    $('meta[property="og:title"]').attr('content', title);
    $('link[rel="canonical"]').attr('href', SITE_URL + url);
    $('meta[property="og:url"]').attr('content', SITE_URL + url);
    $('meta[property="og:image"]').attr('content', `${SITE_URL}/img/logo/og-alapkep-1200x630.jpg`);
    $('head style').first().append(LEGAL_CSS);
    const root = $('body > div').first();
    root.children().not('header, footer').remove();
    root.find('[aria-current]').removeAttr('aria-current').css('border-bottom', '').css('color', '#33261C');
    root.find('header').after(`<main class="legal"><h1>${meta.title}</h1>\n${content}</main>`);
    fs.writeFileSync(path.join(SITE, meta.out), $.html());
    console.log('✓', meta.out);
  }
}

// Köszönőoldal: a Bevétel.hu űrlap sikeres beküldés után ide irányít (Bevétel.hu → Csatorna → Köszönőoldal URL).
// Itt fut le a „jelentkezes_elkuldve” GTM-esemény, ez a tényleges jelentkezés (konverzió) mérése.
{
  const base = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8');
  const $ = cheerio.load(base);
  const title = 'Köszönjük a jelentkezésed! – Lépj tovább!';
  $('title').text(title);
  $('head script').first().html($('head script').first().html().replace(/page_type: '[^']*'/, "page_type: 'koszonjuk'"));
  $('meta[name="description"], meta[property="og:description"]').attr('content', 'Köszönjük a jelentkezésed a Lépj tovább! csoportba.');
  $('meta[property="og:title"]').attr('content', title);
  $('link[rel="canonical"]').attr('href', SITE_URL + '/koszonjuk');
  $('meta[property="og:url"]').attr('content', SITE_URL + '/koszonjuk');
  $('meta[name="robots"]').remove();
  $('head').append('<meta name="robots" content="noindex, nofollow">');
  const root = $('body > div').first();
  root.children().not('header, footer').remove();
  root.find('[aria-current]').removeAttr('aria-current').css('border-bottom', '').css('color', '#33261C');
  root.find('header').after(`<main style="max-width: 760px; margin: 0 auto; padding: 96px 24px 112px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 20px">
<h1 style="margin: 0; font-family: 'Outfit', sans-serif; font-weight: 700; font-size: clamp(2rem, 4.5vw, 3rem); line-height: 1.12; color: #7A3E17">Köszönjük, megkaptuk a jelentkezésed!</h1>
<p style="margin: 0; font-family: 'Outfit', sans-serif; font-weight: 500; font-size: 1.3rem; color: #4A3A2D">Ezzel megtetted az első lépést.</p>
<p style="margin: 0; color: #4A3A2D">Hamarosan felvesszük veled a kapcsolatot a megadott elérhetőségeiden, és egyeztetjük a díjmentes konzultáció időpontját. Ha addig kérdésed van, írj nekünk: <a href="mailto:hello@lepj-tovabb.hu">hello@lepj-tovabb.hu</a>.</p>
<a href="/" style="margin-top: 12px; text-decoration: none; background: #7A3E17; color: #FFFDF8; padding: 16px 28px; border-radius: 999px; font-family: 'Outfit', sans-serif; font-weight: 600">Vissza a főoldalra</a>
</main>`);
  $('body').append(`<script>
(function(){window.dataLayer=window.dataLayer||[];var k='lt_jelentkezes_'+location.search;var m=false;try{m=sessionStorage.getItem(k);}catch(e){}
if(!m){dataLayer.push({event:'jelentkezes_elkuldve'});try{sessionStorage.setItem(k,'1');}catch(e){}}})();
</script>
`);
  fs.writeFileSync(path.join(SITE, 'koszonjuk.html'), $.html());
  console.log('✓ koszonjuk.html');
}
