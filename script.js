/* ==========================================================================
   BRUMPHOMET — Estudo de caso
   script.js — vanilla JS, sem dependências.
   1) Menu hambúrguer (mobile)
   2) Reveal on scroll
   3) Carrossel de shorts (setas)
   4) Scroll-spy (destaca o link da seção atual no menu)
   5) Seta "voltar ao topo" — só aparece perto do fim de cada seção
   ========================================================================== */

// 1. Menu hambúrguer
const navToggle = document.getElementById('navToggle');
const navLinksEl = document.getElementById('navLinks');
const navScrim = document.getElementById('navScrim');

function setNavOpen(open) {
  navToggle.classList.toggle('open', open);
  navToggle.setAttribute('aria-expanded', String(open));
  navToggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  navLinksEl.classList.toggle('open', open);
  navScrim.classList.toggle('open', open);
  document.body.style.overflow = open ? 'hidden' : '';
}
// Altura real da barra fixa -> variável CSS --nav-h (limita a altura do menu aberto e
// define o recuo de rolagem, para o título da seção não ficar sob a barra).
const navBar = document.querySelector('.nav');
function syncNavHeight() {
  document.documentElement.style.setProperty('--nav-h', navBar.offsetHeight + 'px');
}
syncNavHeight();
if ('ResizeObserver' in window) new ResizeObserver(syncNavHeight).observe(navBar);
window.addEventListener('resize', syncNavHeight);

navToggle.addEventListener('click', () => setNavOpen(!navLinksEl.classList.contains('open')));
navScrim.addEventListener('click', () => setNavOpen(false));

// Fecha o menu ao clicar em qualquer link do menu
navLinksEl.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setNavOpen(false)));

// Ao ampliar a janela até o layout de desktop (barra horizontal), garante o menu fechado e a rolagem liberada
window.matchMedia('(min-width: 1100px)').addEventListener('change', (e) => {
  if (e.matches) setNavOpen(false);
});

// Reforço de acessibilidade/robustez: fecha também com a tecla Esc caso o usuário esteja navegando pelo teclado

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && navLinksEl.classList.contains('open')) setNavOpen(false);
});

// 2. Reveal on scroll
const revealItems = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add('in'), (i % 4) * 70);
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: .15 });
revealItems.forEach(el => revealObserver.observe(el));

// 3. Carrossel de clipes (rolagem horizontal + setas)
// Toque: rolagem/swipe nativo com scroll-snap. Desktop: setas e teclado.
// O vídeo só é carregado ao clicar no play (a miniatura vem do YouTube).

const carousel = document.getElementById('carousel');
const carPrev = document.getElementById('carPrev');
const carNext = document.getElementById('carNext');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
if (carousel && carPrev && carNext) {
  const step = () => { const c = carousel.querySelector('.short-card'); return c ? c.offsetWidth + 16 : 240; };
  const move = (dir) => carousel.scrollBy({ left: dir * step() * 2, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  const updateButtons = () => {
    carPrev.disabled = carousel.scrollLeft <= 2;
    carNext.disabled = carousel.scrollLeft >= carousel.scrollWidth - carousel.clientWidth - 2;
  };
  carPrev.addEventListener('click', () => move(-1));
  carNext.addEventListener('click', () => move(1));
  carousel.addEventListener('keydown', (e) => {
    if (e.target !== carousel) return; // não interfere nos botões dos cards
    if (e.key === 'ArrowRight') { e.preventDefault(); move(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); move(-1); }
  });
  carousel.addEventListener('scroll', updateButtons, { passive: true });
  window.addEventListener('resize', updateButtons);
  updateButtons();

  // play: troca a miniatura pelo player do YouTube
  // ALTERAÇÃO: uma única URL controla o vídeo e sua miniatura.
  function obterVideoId(valor) {
    if (!valor) return null;
    valor = valor.trim();

    // Mantém os cards antigos funcionando durante a troca por URLs.
    if (/^[a-zA-Z0-9_-]{11}$/.test(valor)) return valor;

    try {
      const url = new URL(valor);
      const dominio = url.hostname.toLowerCase();
      let id = null;

      if (dominio === 'youtu.be') {
        id = url.pathname.split('/')[1];
      } else if (
        ['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(dominio)
      ) {
        const partes = url.pathname.split('/').filter(Boolean);

        if (['shorts', 'embed', 'live'].includes(partes[0])) {
          id = partes[1];
        } else if (url.pathname === '/watch') {
          id = url.searchParams.get('v');
        }
      }

      return /^[a-zA-Z0-9_-]{11}$/.test(id || '') ? id : null;
    } catch {
      return null;
    }
  }

  // Atualiza cada miniatura usando a URL do próprio botão.
  carousel.querySelectorAll('.short-thumb').forEach((thumb) => {
    const id = obterVideoId(thumb.dataset.video);
    const imagem = thumb.querySelector('img');

    if (id && imagem) {
      imagem.src = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
    }
  });

  // Abre somente o vídeo do card clicado.
  carousel.addEventListener('click', (e) => {
    const thumb = e.target.closest('.short-thumb');
    if (!thumb || !carousel.contains(thumb)) return;

    const id = obterVideoId(thumb.dataset.video);
    if (!id) {
      console.error('URL de vídeo inválida:', thumb.dataset.video);
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.className = 'short-player';
    iframe.src = `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
    iframe.title = (thumb.getAttribute('aria-label') || 'Clipe')
      .replace('Reproduzir clipe', 'Clipe');
    iframe.allow = 'autoplay; accelerometer; encrypted-media; picture-in-picture';
    iframe.allowFullscreen = true;

    thumb.replaceWith(iframe);
    iframe.focus();
  });

  // 4. Scroll-spy: destaca o link do menu conforme a seção visível
  const sections = document.querySelectorAll('#main > section[id]');
  const navAnchors = navLinksEl.querySelectorAll('a');
  const spyObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navAnchors.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id));
      }
    });
  }, { rootMargin: '-40% 0px -50% 0px', threshold: 0 });
  sections.forEach(s => spyObserver.observe(s));

  // ---- 5. Seta "voltar ao topo": aparece perto do fim de cada seção ----
  // Cada ".section-end-sentinel" fica bem na fronteira entre duas seções.

  const scrollHint = document.getElementById('scrollHint');
  const sentinels = [...document.querySelectorAll('.section-end-sentinel')];

  let tickingScrollHint = false;
  function updateScrollHint() {
    const vh = window.innerHeight;
    // "perto do fim da seção" = o sentinel está entre 15% e 85% da tela
    const nearSectionEnd = sentinels.some(sentinel => {
      const top = sentinel.getBoundingClientRect().top;
      return top > vh * 0.15 && top < vh * 0.85;
    });
    scrollHint.classList.toggle('show', nearSectionEnd);
    tickingScrollHint = false;
  }
  window.addEventListener('scroll', () => {
    if (!tickingScrollHint) {
      tickingScrollHint = true;
      requestAnimationFrame(updateScrollHint);
    }
  }, { passive: true });
  // Recalcula também ao redimensionar (rotacionar o celular, ou a barra de
  // endereço do navegador aparecer/sumir e mudar a altura da tela).
  window.addEventListener('resize', updateScrollHint);
  updateScrollHint(); // estado inicial, ao carregar a página

  scrollHint.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  });

  // ---- 6. Idioma: Português / English / Deutsch ----
  // DEPENDÊNCIA EXTERNA: Google Tradutor de sites (translate.google.com/translate_a/element.js),
  // gratuito, sem instalar biblioteca. Só é carregado quando o visitante escolhe EN ou DE
  // (em português nada externo é carregado). O alemão usa o Hochdeutsch padrão do Google.
  // A escolha fica no cookie "googtrans" (funciona em http/https, não em file://).
  // Trechos com translate="no" (nome da marca, hex, botões de idioma) não são traduzidos.
  const langButtons = document.querySelectorAll('.lang-switch button');
  const currentLang = (document.cookie.match(/googtrans=\/pt\/(en|de)/) || [])[1] || 'pt';

  function setLang(lang) {
    const past = 'expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    if (lang === 'pt') {
      document.cookie = 'googtrans=; ' + past;
      document.cookie = `googtrans=; ${past}; domain=${location.hostname}`;
    } else {
      document.cookie = `googtrans=/pt/${lang}; path=/`;
    }
    location.reload();
  }
  langButtons.forEach(btn => {
    btn.setAttribute('aria-pressed', btn.dataset.lang === currentLang);
    btn.addEventListener('click', () => { if (btn.dataset.lang !== currentLang) setLang(btn.dataset.lang); });
  });
  if (currentLang !== 'pt') {
    const holder = document.createElement('div');
    holder.id = 'google_translate_element';
    document.body.appendChild(holder);
    window.gtInit = () => new google.translate.TranslateElement({ pageLanguage: 'pt', includedLanguages: 'en,de', autoDisplay: false }, 'google_translate_element');
    const s = document.createElement('script');
    s.src = 'https://translate.google.com/translate_a/element.js?cb=gtInit';
    s.async = true;
    document.head.appendChild(s);
  }
}