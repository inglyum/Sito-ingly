/* ============ SEO (modulo) ============
   Meta dinamici per pagina, Open Graph, Twitter Card, canonical, hreflang
   e dati strutturati Schema.org (Organization + Product sulla pagina prodotto).
   Tutto generato dai dati dell'admin: nessuna duplicazione. */
const { CONFIG } = window.INGLY;
const S = CONFIG.seo || {};
const base = () => (S.dominio || location.origin).replace(/\/+$/,'');
const abs = p => base() + '/' + String(p||'').replace(/^\/+/,'');

const set = (sel, attr, val) => {
  let el = document.head.querySelector(sel);
  if(!el){ el=document.createElement(sel.startsWith('link')?'link':'meta');
    const m=sel.match(/\[(\w+)="([^"]+)"\]/); if(m) el.setAttribute(m[1],m[2]);
    document.head.appendChild(el); }
  el.setAttribute(attr,val); return el;
};
const jsonld = (id,obj) => {
  let s=document.getElementById(id);
  if(!s){ s=document.createElement('script'); s.type='application/ld+json'; s.id=id; document.head.appendChild(s) }
  s.textContent=JSON.stringify(obj);
};

/* dati strutturati fissi: chi è INGLY (aiuta Google a mostrare il brand) */
export function initSeo(){
  jsonld('ld-org',{
    "@context":"https://schema.org","@type":"LocalBusiness",
    "name":S.azienda||"INGLY DESIGN",
    "description":S.descrizione||"",
    "url":base(),
    "logo":abs('assets/images/logo.png'),
    "image":abs(S.immagineSocial||'assets/images/og-image.jpg'),
    "email":CONFIG.email||undefined,
    "telephone":S.telefono||undefined,
    "address":{"@type":"PostalAddress","addressLocality":S.citta||"","addressRegion":S.regione||"","addressCountry":S.paese||"IT"},
    "sameAs":Object.values(CONFIG.social||{}).filter(u=>u&&u.startsWith('http')),
    "priceRange":"€€"
  });
  set('meta[name="keywords"]','content',S.keywords||'');
  set('meta[name="theme-color"]','content','#0a0d18');
  set('meta[property="og:site_name"]','content',S.azienda||'INGLY DESIGN');
  set('meta[property="og:type"]','content','website');
  set('meta[name="twitter:card"]','content','summary_large_image');
}

/* meta della pagina corrente (chiamato dal router a ogni cambio pagina) */
export function updateSeo(page, L, T, product){
  const titles = {
    home:S.titolo||document.title, shop:T('shopH2'), digital:T('digEye'), business:T('bizH2'),
    portfolio:T('portH2'), about:T('abH2'), faq:T('faqH2'), quote:T('qH2')
  };
  const isProd = page==='product' && product;
  const title = isProd
      ? `${product.n[L]} — ${S.azienda||'INGLY DESIGN'}`
      : (page==='home' ? (S.titolo||'INGLY DESIGN') : `${(titles[page]||'').replace(/<[^>]+>/g,'')} — ${S.azienda||'INGLY DESIGN'}`);
  const desc = isProd
      ? ((product.desc&&product.desc[L])||S.descrizione||'')
      : (S.descrizione||'');
  const url = base()+'/#/'+page;
  const img = isProd ? abs((CONFIG.cartellaImmagini||'img/')+product.id+'.webp') : abs(S.immagineSocial||'assets/images/og-image.jpg');

  document.title = title;
  set('meta[name="description"]','content',desc);
  set('link[rel="canonical"]','href',url);
  set('meta[property="og:title"]','content',title);
  set('meta[property="og:description"]','content',desc);
  set('meta[property="og:url"]','content',url);
  set('meta[property="og:image"]','content',img);
  set('meta[property="og:locale"]','content',L==='it'?'it_IT':'en_US');
  set('meta[name="twitter:title"]','content',title);
  set('meta[name="twitter:description"]','content',desc);
  set('meta[name="twitter:image"]','content',img);
  /* hreflang: stessa pagina, due lingue */
  set('link[rel="alternate"][hreflang="it"]','href',url);
  set('link[rel="alternate"][hreflang="en"]','href',url);
  set('link[rel="alternate"][hreflang="x-default"]','href',url);

  if(isProd){
    jsonld('ld-product',{
      "@context":"https://schema.org","@type":"Product",
      "name":product.n[L], "sku":'INGLY-'+product.id,
      "description":desc,
      "image":img,
      "brand":{"@type":"Brand","name":S.azienda||"INGLY DESIGN"},
      "aggregateRating":product.rev?{"@type":"AggregateRating","ratingValue":"4.9","reviewCount":product.rev}:undefined,
      "offers":{"@type":"Offer","price":product.price,"priceCurrency":"EUR",
        "availability":"https://schema.org/InStock","url":url,
        "seller":{"@type":"Organization","name":S.azienda||"INGLY DESIGN"}}
    });
  } else { const s=document.getElementById('ld-product'); if(s) s.remove(); }
}
