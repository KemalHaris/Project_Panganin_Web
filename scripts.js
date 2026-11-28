document.addEventListener('DOMContentLoaded', () => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /*1. HERO CAROUSEL*/
  const carouselFrame = document.getElementById('heroCarousel');
  const track = document.getElementById('carouselTrack');
  const slides = Array.from(document.querySelectorAll('.carousel-slide'));
  const dots = Array.from(document.querySelectorAll('.dot-btn'));
  const prevBtn = document.getElementById('prevSlideBtn');
  const nextBtn = document.getElementById('nextSlideBtn');
  const playPauseBtn = document.getElementById('playPauseBtn');
  const slideCounter = document.getElementById('slideCounter');

  const AUTOPLAY_MS = 5500;
  const totalSlides = slides.length;

  let currentIndex = 0;
  let timer = null;
  let userPaused = prefersReducedMotion;
  let hovering = false;
  let keyboardFocused = false;

  carouselFrame.style.setProperty('--autoplay-ms', `${AUTOPLAY_MS}ms`);

  // Fun facts: every slide has a list of facts (<ul class="slide-facts">).
  // Show one at random, and pick a different one each time the slide comes back.
  function showRandomFact(slide) {
    const list = slide.querySelector('.slide-facts');
    if (!list) return;
    const facts = Array.from(list.children);
    if (!facts.length) return;

    list.classList.add('is-js');
    const currentFact = facts.findIndex((fact) => fact.classList.contains('is-current'));
    const candidates = facts.map((_, i) => i).filter((i) => i !== currentFact);
    const pool = candidates.length ? candidates : [0];
    const next = pool[Math.floor(Math.random() * pool.length)];

    facts.forEach((fact, i) => fact.classList.toggle('is-current', i === next));
  }

  slides.forEach(showRandomFact); // random fact on first load, for every slide

  function updateCarousel(newIndex) {
    currentIndex = (newIndex + totalSlides) % totalSlides;

    slides.forEach((slide, idx) => {
      const willBeActive = idx === currentIndex;
      // A slide that is just becoming active gets a fresh random fun fact
      if (willBeActive && !slide.classList.contains('is-active')) showRandomFact(slide);
      slide.classList.toggle('is-active', willBeActive);
    });

    dots.forEach((dot, idx) => {
      const active = idx === currentIndex;
      dot.classList.toggle('is-active', active);
      if (active) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });

    slideCounter.textContent =
      `${String(currentIndex + 1).padStart(2, '0')} / ${String(totalSlides).padStart(2, '0')}`;
  }

  // Restart the progress-bar animation from zero
  function restartProgressBar() {
    carouselFrame.classList.remove('is-autoplaying');
    void carouselFrame.offsetWidth; // force reflow so the animation replays
    carouselFrame.classList.add('is-autoplaying');
  }

  function startTimer() {
    stopTimer();
    timer = setInterval(() => {
      updateCarousel(currentIndex + 1);
      restartProgressBar();
    }, AUTOPLAY_MS);
    restartProgressBar();
    track.setAttribute('aria-live', 'off');
  }

  function stopTimer() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    carouselFrame.classList.remove('is-autoplaying');
    track.setAttribute('aria-live', 'polite');
  }

  function syncAutoPlay() {
    const shouldRun = !userPaused && !hovering && !keyboardFocused && !document.hidden;
    if (shouldRun) startTimer();
    else stopTimer();
  }

  function goTo(index) {
    updateCarousel(index);
    if (timer) startTimer();
  }

  function updatePlayPauseButton() {
    playPauseBtn.textContent = userPaused ? 'Play' : 'Pause';
    playPauseBtn.setAttribute(
      'aria-label',
      userPaused ? 'Start automatic slide rotation' : 'Pause automatic slide rotation'
    );
  }

  prevBtn.addEventListener('click', () => goTo(currentIndex - 1));
  nextBtn.addEventListener('click', () => goTo(currentIndex + 1));
  dots.forEach((dot) => dot.addEventListener('click', () => goTo(Number(dot.dataset.target))));

  playPauseBtn.addEventListener('click', () => {
    userPaused = !userPaused;
    updatePlayPauseButton();
    syncAutoPlay();
  });

  // Pointer events + mouse check: on phones a tap fires a fake "mouseenter" that never
  // un-fires, which would leave autoplay stuck paused until the user tapped elsewhere.
  carouselFrame.addEventListener('pointerenter', (event) => {
    if (event.pointerType !== 'mouse') return;
    hovering = true;
    syncAutoPlay();
  });
  carouselFrame.addEventListener('pointerleave', (event) => {
    if (event.pointerType !== 'mouse') return;
    hovering = false;
    syncAutoPlay();
  });

  carouselFrame.addEventListener('focusin', (event) => {
    if (event.target.matches(':focus-visible')) {
      keyboardFocused = true;
      syncAutoPlay();
    }
  });
  carouselFrame.addEventListener('focusout', (event) => {
    if (!carouselFrame.contains(event.relatedTarget)) {
      keyboardFocused = false;
      syncAutoPlay();
    }
  });

  document.addEventListener('visibilitychange', syncAutoPlay);

  carouselFrame.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goTo(currentIndex - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      goTo(currentIndex + 1);
    }
  });

  // Touch swipe
  let touchStartX = null;
  let touchStartY = null;

  carouselFrame.addEventListener('touchstart', (event) => {
    touchStartX = event.changedTouches[0].clientX;
    touchStartY = event.changedTouches[0].clientY;
  }, { passive: true });

  carouselFrame.addEventListener('touchend', (event) => {
    if (touchStartX === null) return;
    const dx = event.changedTouches[0].clientX - touchStartX;
    const dy = event.changedTouches[0].clientY - touchStartY;
    touchStartX = touchStartY = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      goTo(dx < 0 ? currentIndex + 1 : currentIndex - 1);
    }
  }, { passive: true });

  updateCarousel(0);
  updatePlayPauseButton();
  syncAutoPlay();

  /* 3. SCROLL REVEAL */
  if (!prefersReducedMotion && 'IntersectionObserver' in window) {
    const revealTargets = document.querySelectorAll('.section-header, .product-card, .mascot-card');

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    revealTargets.forEach((el) => {
      const siblings = Array.from(el.parentElement.children);
      el.style.setProperty('--reveal-delay', `${(siblings.indexOf(el) % 5) * 80}ms`);
      el.classList.add('reveal');
      observer.observe(el);
    });
  }

  /*4. CLICK CONFETTI ON CARDS*/
  const confettiColors = ['#ffd43b', '#9775fa', '#51cf66', '#fff3bf', '#e5dbff'];

  function burstConfetti(x, y) {
    const count = 12;
    for (let i = 0; i < count; i++) {
      const bit = document.createElement('span');
      bit.className = 'confetti-bit';
      bit.style.left = `${x - 6}px`;
      bit.style.top = `${y - 6}px`;
      bit.style.backgroundColor = confettiColors[i % confettiColors.length];
      bit.style.borderRadius = i % 2 ? '50%' : '3px';
      document.body.appendChild(bit);

      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const distance = 60 + Math.random() * 60;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance;

      const animation = bit.animate(
        [
          { transform: 'translate(0, 0) rotate(0deg) scale(1)', opacity: 1 },
          { transform: `translate(${dx}px, ${dy + 40}px) rotate(${Math.random() * 360}deg) scale(0.4)`, opacity: 0 }
        ],
        { duration: 700 + Math.random() * 300, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
      );
      animation.onfinish = () => bit.remove();
    }
  }

  if (!prefersReducedMotion) {
    document.querySelectorAll('.product-card, .mascot-card').forEach((card) => {
      card.addEventListener('click', (event) => burstConfetti(event.clientX, event.clientY));
    });
  }

  /*5. BACK TO TOP BUTTON*/
  const backToTopBtn = document.getElementById('backToTopBtn');
  backToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  });

  /*6. ORDER POP-UP (sends the order to the admin's WhatsApp)*/

  // >>> SET THIS BEFORE GOING LIVE <<<
  // Admin WhatsApp number in international format, digits only:
  // country code, no "+", no spaces, no leading 0.  Example: '628123456789'
  const ADMIN_WHATSAPP = '6285117262696';

  const MAX_QTY = 99; // default cap; a product card can override it with data-max-jumlah="N"

  const orderModal = document.getElementById('orderModal');
  const orderDialog = document.getElementById('orderDialog');
  const orderForm = document.getElementById('orderForm');
  const orderImage = document.getElementById('orderImage');
  const orderName = document.getElementById('orderName');
  const orderDesc = document.getElementById('orderDesc');
  const orderSpecs = document.getElementById('orderSpecs');
  const orderUnitPill = document.getElementById('orderUnitPill');
  const orderQty = document.getElementById('orderQty');
  const qtyMinus = document.getElementById('qtyMinus');
  const qtyPlus = document.getElementById('qtyPlus');
  const summaryUnit = document.getElementById('summaryUnit');
  const summaryUnitLabel = document.getElementById('summaryUnitLabel');
  const summaryQty = document.getElementById('summaryQty');
  const summaryTotal = document.getElementById('summaryTotal');
  const customerName = document.getElementById('customerName');
  const customerAddress = document.getElementById('customerAddress');
  const nameError = document.getElementById('nameError');
  const addressError = document.getElementById('addressError');
  const formError = document.getElementById('formError');
  const orderSubmit = document.getElementById('orderSubmit');

  let currentProduct = null; // { name, price }
  let lastTrigger = null;
  let maxQty = MAX_QTY;
  let picks = []; // chosen characters, e.g. ['Jagung', 'Jagung', 'Sagu']

  const formatRupiah = (amount) => `Rp ${amount.toLocaleString('id-ID')}`;

  // Quantity as a safe whole number between 1 and MAX_QTY
  function getQty() {
    const value = parseInt(orderQty.value, 10);
    if (Number.isNaN(value) || value < 1) return 1;
    return Math.min(value, maxQty);
  }

  function updateTotals(animate) {
    if (!currentProduct) return;
    const qty = getQty();
    const total = currentProduct.price * qty;

    summaryUnitLabel.textContent = `Harga per ${currentProduct.unit}`;
    summaryUnit.textContent = formatRupiah(currentProduct.price);
    summaryQty.textContent = `${qty} ${currentProduct.unit}`;
    summaryTotal.textContent = formatRupiah(total);
    qtyMinus.disabled = qty <= 1;
    qtyPlus.disabled = qty >= maxQty;

    if (animate && !prefersReducedMotion) {
      summaryTotal.classList.remove('bump');
      void summaryTotal.offsetWidth;
      summaryTotal.classList.add('bump');
    }

    renderPicker(); // number of character slots depends on the quantity
  }

  function clearErrors() {
    [nameError, addressError, formError, pickError].forEach((el) => {
      el.textContent = '';
    });
    formError.classList.remove('is-success');
    customerName.classList.remove('is-invalid');
    customerAddress.classList.remove('is-invalid');
  }

  function openOrder(card) {
    const priceText = card.querySelector('.card-price')?.textContent || '';
    const price = Number(priceText.replace(/\D/g, ''));
    const title = card.querySelector('.card-title')?.textContent.trim() || 'Produk';
    const image = card.querySelector('.card-png-placeholder img');
    const descriptions = Array.from(card.querySelectorAll('.card-desc'));
    const [description, ...specs] = descriptions;

    const perItem = Math.max(0, parseInt(card.dataset.karakter, 10) || 0); // characters per item (0 = no choice)
    const unit = card.dataset.satuan || 'pcs';
    maxQty = Math.max(1, parseInt(card.dataset.maxJumlah, 10) || MAX_QTY);

    currentProduct = { name: title, price, perItem, unit };
    picks = [];
    orderQty.max = maxQty;

    // Fill the pop-up from the card, so product details only live in one place (the HTML)
    orderName.textContent = title;
    orderDesc.textContent = description ? description.textContent.trim() : '';
    orderUnitPill.textContent = `${formatRupiah(price)} / ${unit}`;
    orderImage.src = image ? image.getAttribute('src') : '';
    orderImage.alt = title;

    orderSpecs.textContent = '';
    if (specs.length) {
      const heading = document.createElement('h4');
      heading.textContent = 'Spesifikasi';
      orderSpecs.appendChild(heading);
      specs.forEach((spec) => {
        const p = document.createElement('p');
        p.textContent = spec.textContent.trim();
        orderSpecs.appendChild(p);
      });
    }

    // Match the card's color theme
    const theme = ['purple', 'green', 'yellow'].find((t) => card.classList.contains(`card-${t}`)) || 'yellow';
    orderDialog.dataset.theme = theme;

    orderQty.value = 1;
    clearErrors();
    updateTotals(false);

    lastTrigger = card;
    orderModal.hidden = false;
    document.body.classList.add('modal-open');
    orderDialog.setAttribute('tabindex', '-1');
    orderDialog.focus(); // focus the dialog itself so phones don't pop the keyboard open
  }

  function closeOrder() {
    if (orderModal.hidden) return;
    orderModal.hidden = true;
    document.body.classList.remove('modal-open');
    if (lastTrigger) lastTrigger.focus();
  }

  // Make every product card open the pop-up (mouse, touch and keyboard)
  document.querySelectorAll('.product-card').forEach((card) => {
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-haspopup', 'dialog');
    const title = card.querySelector('.card-title')?.textContent.trim() || 'produk';
    card.setAttribute('aria-label', `Pesan ${title}`);

    const hint = document.createElement('span');
    hint.className = 'order-hint';
    hint.textContent = 'Pesan sekarang →';
    card.appendChild(hint);

    card.addEventListener('click', () => openOrder(card));
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openOrder(card);
      }
    });
  });

  // Close: X button, backdrop click, Escape
  orderModal.querySelectorAll('[data-order-close]').forEach((el) => {
    el.addEventListener('click', closeOrder);
  });

  document.addEventListener('keydown', (event) => {
    if (orderModal.hidden) return;

    if (event.key === 'Escape') {
      closeOrder();
      return;
    }

    // Keep Tab inside the pop-up while it's open
    if (event.key === 'Tab') {
      const focusable = Array.from(
        orderDialog.querySelectorAll('button:not([disabled]), input:not([disabled]), textarea:not([disabled])')
      ).filter((el) => el.getClientRects().length > 0);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === orderDialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  // Quantity controls
  qtyMinus.addEventListener('click', () => {
    orderQty.value = Math.max(1, getQty() - 1);
    updateTotals(true);
  });
  qtyPlus.addEventListener('click', () => {
    orderQty.value = Math.min(maxQty, getQty() + 1);
    updateTotals(true);
  });
  orderQty.addEventListener('input', () => updateTotals(true));
  orderQty.addEventListener('blur', () => {
    orderQty.value = getQty(); // tidy up empty / out-of-range values
    updateTotals(false);
  });

  customerName.addEventListener('input', () => {
    customerName.classList.remove('is-invalid');
    nameError.textContent = '';
  });
  customerAddress.addEventListener('input', () => {
    customerAddress.classList.remove('is-invalid');
    addressError.textContent = '';
  });

  // Confirm order -> open WhatsApp with a ready-made message to the admin
  orderForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!currentProduct) return;
    clearErrors();

    const name = customerName.value.trim().replace(/\s+/g, ' ');
    const address = customerAddress.value
      .trim()
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n');

    const slots = getSlots();
    let firstInvalid = null;

    if (slots > 0 && picks.length < slots) {
      const missing = slots - picks.length;
      pickError.textContent = `Pilih ${slots} karakter dulu (kurang ${missing} lagi).`;
      firstInvalid = pickGrid.querySelector('.pick-main');
    }
    if (name.length < 2) {
      nameError.textContent = 'Mohon isi nama kamu.';
      customerName.classList.add('is-invalid');
      if (!firstInvalid) firstInvalid = customerName;
    }
    if (address.length < 10) {
      addressError.textContent = 'Mohon isi alamat lengkap (jalan, nomor, kota, kode pos).';
      customerAddress.classList.add('is-invalid');
      if (!firstInvalid) firstInvalid = customerAddress;
    }
    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    const adminNumber = String(ADMIN_WHATSAPP).replace(/\D/g, '');
    if (adminNumber.length < 8) {
      formError.textContent = 'Nomor WhatsApp admin belum diatur. Hubungi pemilik situs.';
      return;
    }

    const qty = getQty();
    const total = currentProduct.price * qty;

    // Group the picks: ['Jagung','Jagung','Sagu'] -> Jagung x2, Sagu
    const counts = new Map();
    picks.forEach((pick) => counts.set(pick, (counts.get(pick) || 0) + 1));
    const characterLines = slots > 0
      ? [
          `*Karakter pilihan (${picks.length}):*`,
          ...Array.from(counts, ([pick, n]) => `- ${pick}${n > 1 ? ` x${n}` : ''}`),
          ''
        ]
      : [];

    const message = [
      'Halo Admin Panganin, saya ingin memesan:',
      '',
      `*Produk:* ${currentProduct.name}`,
      `*Jumlah:* ${qty} ${currentProduct.unit}`,
      `*Harga per ${currentProduct.unit}:* ${formatRupiah(currentProduct.price)}`,
      `*Total harga:* ${formatRupiah(total)}`,
      '',
      ...characterLines,
      `*Nama:* ${name}`,
      `*Alamat:* ${address}`,
      '',
      'Terima kasih!'
    ].join('\n');

    const url = `https://wa.me/${adminNumber}?text=${encodeURIComponent(message)}`;

    if (!prefersReducedMotion) {
      const rect = orderSubmit.getBoundingClientRect();
      burstConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
    }

    // A temporary link click works as a user-initiated open, so pop-up blockers allow it
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();

    formError.classList.add('is-success');
    formError.textContent = 'WhatsApp dibuka. Tekan Kirim di WhatsApp untuk menyelesaikan pesanan.';
  });

  // ----- Character picker (inside the order pop-up) -----
  const pickField = document.getElementById('pickField');
  const pickLabel = document.getElementById('pickLabel');
  const pickCount = document.getElementById('pickCount');
  const pickHelp = document.getElementById('pickHelp');
  const pickGrid = document.getElementById('pickGrid');
  const pickReset = document.getElementById('pickReset');
  const pickError = document.getElementById('pickError');

  // The characters on offer come from the character cards, so new characters show up automatically
  const pickCharacters = Array.from(document.querySelectorAll('.mascot-card'))
    .map((card) => ({
      name: card.querySelector('.card-title')?.textContent.trim() || '',
      src: card.querySelector('.card-png-placeholder img')?.getAttribute('src') || ''
    }))
    .filter((character) => character.name);

  const pickTiles = new Map(); // name -> { tile, main, badge, minus }

  pickCharacters.forEach((character) => {
    const tile = document.createElement('div');
    tile.className = 'pick-tile';

    const main = document.createElement('button');
    main.type = 'button';
    main.className = 'pick-main';
    main.setAttribute('aria-pressed', 'false');

    const art = document.createElement('span');
    art.className = 'pick-art';
    const showInitial = () => {
      art.textContent = '';
      const initial = document.createElement('span');
      initial.className = 'pick-initial';
      initial.textContent = character.name.charAt(0).toUpperCase();
      art.appendChild(initial);
    };
    if (character.src) {
      const img = document.createElement('img');
      img.src = character.src;
      img.alt = '';
      img.addEventListener('error', showInitial); // picture not uploaded yet -> show the first letter
      art.appendChild(img);
    } else {
      showInitial();
    }

    const label = document.createElement('span');
    label.className = 'pick-name';
    label.textContent = character.name;

    const badge = document.createElement('span');
    badge.className = 'pick-badge';
    badge.setAttribute('aria-hidden', 'true');
    badge.hidden = true;

    const minus = document.createElement('button');
    minus.type = 'button';
    minus.className = 'pick-minus';
    minus.setAttribute('aria-label', `Kurangi ${character.name}`);
    minus.textContent = '\u2212';
    minus.hidden = true;

    main.append(art, label);
    tile.append(main, badge, minus);
    pickGrid.appendChild(tile);
    pickTiles.set(character.name, { tile, main, badge, minus });

    main.addEventListener('click', () => addPick(character.name));
    minus.addEventListener('click', () => removePick(character.name));
  });

  // How many characters the customer must choose: characters per item x quantity
  function getSlots() {
    if (!currentProduct || !pickCharacters.length) return 0;
    return currentProduct.perItem * getQty();
  }

  function addPick(name) {
    const slots = getSlots();
    pickError.textContent = '';
    if (picks.length >= slots) {
      if (slots === 1) {
        picks = [name]; // single choice: tapping another character swaps it
      } else {
        pickError.textContent = 'Pilihan sudah penuh. Kurangi salah satu karakter dulu.';
        if (!prefersReducedMotion) {
          pickGrid.classList.remove('is-shaking');
          void pickGrid.offsetWidth;
          pickGrid.classList.add('is-shaking');
        }
        return;
      }
    } else {
      picks.push(name);
    }
    renderPicker();
  }

  function removePick(name) {
    const index = picks.lastIndexOf(name);
    if (index !== -1) picks.splice(index, 1);
    pickError.textContent = '';
    renderPicker();
  }

  pickReset.addEventListener('click', () => {
    picks = [];
    pickError.textContent = '';
    renderPicker();
  });

  function renderPicker() {
    const slots = getSlots();
    pickField.hidden = slots === 0;
    if (slots === 0) return;

    // quantity went down? drop the extra picks from the end
    while (picks.length > slots) picks.pop();

    const counts = new Map();
    picks.forEach((pick) => counts.set(pick, (counts.get(pick) || 0) + 1));

    pickTiles.forEach(({ tile, main, badge, minus }, name) => {
      const n = counts.get(name) || 0;
      tile.classList.toggle('is-selected', n > 0);
      main.setAttribute('aria-pressed', n > 0 ? 'true' : 'false');
      main.setAttribute('aria-label', n > 0 ? `${name}, dipilih ${n} kali` : name);
      badge.hidden = n === 0;
      badge.textContent = `\u00D7${n}`;
      minus.hidden = n === 0;
    });

    const { perItem, unit } = currentProduct;
    const qty = getQty();
    pickLabel.textContent = `Pilih ${slots} karakter`;
    pickCount.textContent = `${picks.length} / ${slots}`;
    pickCount.classList.toggle('is-complete', picks.length === slots);
    pickHelp.textContent =
      (qty > 1 ? `${perItem} karakter per ${unit} \u00D7 ${qty} = ${slots} karakter.` : `${perItem} karakter per ${unit}.`) +
      (slots > 1 ? ' Ketuk karakter yang sama lagi untuk menambah.' : '');
    pickReset.hidden = picks.length === 0;
  }

  /*7. CHARACTER POP-UP (fun facts from the slides + nutrition from the card)*/
  const charModal = document.getElementById('charModal');
  const charDialog = document.getElementById('charDialog');
  const charImgBox = document.getElementById('charImgBox');
  const charImage = document.getElementById('charImage');
  const charName = document.getElementById('charName');
  const charDesc = document.getElementById('charDesc');
  const charFactsBox = document.getElementById('charFactsBox');
  const charFacts = document.getElementById('charFacts');
  const charNutriBox = document.getElementById('charNutriBox');
  const charBasis = document.getElementById('charBasis');
  const nutriKalori = document.getElementById('nutriKalori');
  const nutriProtein = document.getElementById('nutriProtein');
  const nutriKarbo = document.getElementById('nutriKarbo');

  let lastCharTrigger = null;
  let countToken = 0;

  const decimalsOf = (text) => (String(text).split('.')[1] || '').length;
  const formatNumber = (value, decimals) =>
    value.toLocaleString('id-ID', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  // Numbers count up from 0 when the pop-up opens (skipped for reduced motion)
  function countUp(el, target, decimals, token) {
    if (prefersReducedMotion) {
      el.textContent = formatNumber(target, decimals);
      return;
    }
    const duration = 700;
    const start = performance.now();
    function frame(now) {
      if (token !== countToken) return; // a newer pop-up took over
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = formatNumber(target * eased, decimals);
      if (progress < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // Facts come straight from the carousel slides: the slide whose badge matches the character's name
  function getFactsFor(name) {
    const slide = slides.find(
      (s) => s.querySelector('.slide-badge')?.textContent.trim().toUpperCase() === name.toUpperCase()
    );
    if (!slide) return [];
    return Array.from(slide.querySelectorAll('.slide-facts li')).map((li) => li.textContent.trim());
  }

  function openChar(card) {
    const name = card.querySelector('.card-title')?.textContent.trim() || '';
    const description = card.querySelector('.card-desc')?.textContent.trim() || '';
    const image = card.querySelector('.card-png-placeholder img');

    charName.textContent = name;
    charDesc.textContent = description;

    if (image && image.getAttribute('src')) {
      charImage.src = image.getAttribute('src');
      charImage.alt = name;
      charImgBox.classList.remove('is-empty');
    } else {
      charImage.removeAttribute('src');
      charImgBox.classList.add('is-empty'); // no picture yet (empty slot)
    }

    const theme = ['purple', 'green', 'yellow'].find((t) => card.classList.contains(`card-${t}`)) || 'yellow';
    charDialog.dataset.theme = theme;

    // Fun facts
    charFacts.textContent = '';
    const facts = getFactsFor(name);
    facts.forEach((fact) => {
      const li = document.createElement('li');
      li.textContent = fact;
      charFacts.appendChild(li);
    });
    charFactsBox.hidden = facts.length === 0;

    // Nutrition
    const { kalori, protein, karbohidrat, dasar } = card.dataset;
    const hasNutrition = kalori !== undefined && protein !== undefined && karbohidrat !== undefined;
    charNutriBox.hidden = !hasNutrition;
    if (hasNutrition) {
      charBasis.textContent = dasar || 'Per 100 g';
      countToken += 1;
      const token = countToken;
      countUp(nutriKalori, Number(kalori), decimalsOf(kalori), token);
      countUp(nutriProtein, Number(protein), decimalsOf(protein), token);
      countUp(nutriKarbo, Number(karbohidrat), decimalsOf(karbohidrat), token);

      document.getElementById('tileKalori').setAttribute('aria-label', `Kalori ${formatNumber(Number(kalori), decimalsOf(kalori))} kilokalori`);
      document.getElementById('tileProtein').setAttribute('aria-label', `Protein ${formatNumber(Number(protein), decimalsOf(protein))} gram`);
      document.getElementById('tileKarbo').setAttribute('aria-label', `Karbohidrat ${formatNumber(Number(karbohidrat), decimalsOf(karbohidrat))} gram`);
    }

    lastCharTrigger = card;
    charModal.hidden = false;
    document.body.classList.add('modal-open');
    charDialog.setAttribute('tabindex', '-1');
    charDialog.scrollTop = 0;
    charModal.querySelector('.order-scroll').scrollTop = 0;
    charDialog.focus();
  }

  function closeChar() {
    if (charModal.hidden) return;
    charModal.hidden = true;
    countToken += 1; // stop any running count-up
    document.body.classList.remove('modal-open');
    if (lastCharTrigger) lastCharTrigger.focus();
  }

  // Make every character card open the pop-up (mouse, touch and keyboard)
  document.querySelectorAll('.mascot-card').forEach((card) => {
    const name = card.querySelector('.card-title')?.textContent.trim() || 'karakter';
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-haspopup', 'dialog');
    card.setAttribute('aria-label', `Lihat info ${name}`);

    const hint = document.createElement('span');
    hint.className = 'order-hint char-hint';
    hint.textContent = 'Lihat info →';
    card.appendChild(hint);

    card.addEventListener('click', () => openChar(card));
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openChar(card);
      }
    });
  });

  charModal.querySelectorAll('[data-char-close]').forEach((el) => el.addEventListener('click', closeChar));

  document.addEventListener('keydown', (event) => {
    if (charModal.hidden) return;

    if (event.key === 'Escape') {
      closeChar();
      return;
    }

    if (event.key === 'Tab') {
      const focusable = Array.from(charDialog.querySelectorAll('button:not([disabled])'))
        .filter((el) => el.getClientRects().length > 0);
      if (!focusable.length) return;
      // Only one focusable control (the close button): keep focus on it
      event.preventDefault();
      focusable[0].focus();
    }
  });
});
