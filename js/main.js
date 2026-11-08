/*=============== DEL VAQUERO AL CHALÁN ===============*/
(() => {
  "use strict";

  const data  = window.VAQUEROS || [];
  const rail  = document.getElementById("rail");
  const tpl   = document.getElementById("card-tpl");
  const prev  = document.querySelector(".rail-btn--prev");
  const next  = document.querySelector(".rail-btn--next");
  const modal = document.getElementById("modal");

  const EXTENSIONES = ["png", "webp", "jpg"];   // Accepted image formats

  /*=============== HELPERS ===============*/
  function rellenar(raiz, v) {
    raiz.querySelectorAll("[data-field]").forEach(el => {
      const valor = v[el.dataset.field] ?? "";
      el.textContent = valor;
      const fila = el.closest(".facts > div") || el;
      fila.hidden = !valor;
    });
  }

  /* Rider image or "pending" box */
  function ponerJinete(contenedor, v) {
    contenedor.innerHTML = "";
    contenedor.classList.remove("is-missing");
    const img = new Image();
    img.className = "ink";
    img.alt = `Ilustración: ${v.nombre} (${v.pais})`;
    img.decoding = "async";
    let intento = 0;
    img.onerror = () => {
      if (++intento < EXTENSIONES.length) { img.src = `assets/riders/${v.id}.${EXTENSIONES[intento]}`; return; }
      contenedor.classList.add("is-missing");
      contenedor.innerHTML = `
        <img class="ink" src="assets/ic-horse.webp" alt="" width="64" height="64">
        <span>Ilustración pendiente</span>
        <code>assets/riders/${v.id}.png</code>`;
    };
    img.src = window.JINETES_EMBEBIDOS?.[v.id] || `assets/riders/${v.id}.${EXTENSIONES[0]}`;
    contenedor.appendChild(img);
  }

  /* Country silhouette */
  const ponerMapa = (raiz, v) => raiz.querySelectorAll("[data-mapa]").forEach(svg => {
    svg.classList.remove("is-country");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.innerHTML = '<use href="#i-mapa"/>';
    window.Mapas?.dibujar(svg, v.mapa);
  });

  /*=============== CARDS ===============*/
  function renderCard(v, index) {
    const node = tpl.content.firstElementChild.cloneNode(true);
    node.dataset.id = v.id;
    rellenar(node, v);
    ponerJinete(node.querySelector("[data-rider]"), v);
    ponerMapa(node, v);

    /* Open detail on click */
    const hit = node.querySelector(".card__hit");
    hit.setAttribute("aria-label", `Ver ficha: ${v.nombre}, ${v.pais}`);
    hit.addEventListener("click", () => abrirFicha(index));
    return node;
  }

  const frag = document.createDocumentFragment();
  data.forEach((v, i) => frag.appendChild(renderCard(v, i)));
  rail.appendChild(frag);

  /*=============== HORIZONTAL RAIL ===============*/
  const paso = () => (rail.querySelector(".card")?.offsetWidth || 220) + 15;

  /* Show / hide rail arrows */
  function actualizarFlechas() {
    const desborda = rail.scrollWidth > rail.clientWidth + 2;
    prev.hidden = !desborda || rail.scrollLeft <= 2;
    next.hidden = !desborda || rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 2;
  }

  /* Move one page of cards */
  const avanzar = dir => {
    const n = Math.max(1, Math.floor(rail.clientWidth / paso()) - 1);
    rail.scrollBy({ left: dir * n * paso(), behavior: "smooth" });
  };

  prev.addEventListener("click", () => avanzar(-1));
  next.addEventListener("click", () => avanzar(1));
  rail.addEventListener("scroll", actualizarFlechas, { passive: true });
  window.addEventListener("resize", actualizarFlechas);
  window.addEventListener("load", actualizarFlechas);

  rail.addEventListener("keydown", e => {
    if (e.key === "ArrowRight") { avanzar(1);  e.preventDefault(); }
    if (e.key === "ArrowLeft")  { avanzar(-1); e.preventDefault(); }
  });

  actualizarFlechas();

  /*=============== DETAIL MODAL ===============*/
  let actual = 0;   // Cowboy shown in modal
  const contador = modal.querySelector(".modal__count");
  const texto    = modal.querySelector(".modal__text");
  const cuerpo   = modal.querySelector(".modal__body");

  function abrirFicha(i) {
    actual = (i + data.length) % data.length;   // Loop: last → first
    const v = data[actual];
    rellenar(modal, v);
    ponerJinete(modal.querySelector("[data-rider]"), v);
    ponerMapa(modal, v);

    /* Counter and scroll to top */
    if (contador) contador.textContent = `${actual + 1} / ${data.length}`;
    if (texto)  texto.scrollTop = 0;
    if (cuerpo) cuerpo.scrollTop = 0;

    if (!modal.open) modal.showModal();
  }

  /*===== PREVIOUS / NEXT =====*/
  modal.querySelectorAll(".modal__arrow").forEach(btn =>
    btn.addEventListener("click", () => abrirFicha(actual + Number(btn.dataset.dir)))
  );

  /* Keyboard arrows in modal */
  modal.addEventListener("keydown", e => {
    if (e.key === "ArrowRight") abrirFicha(actual + 1);
    if (e.key === "ArrowLeft")  abrirFicha(actual - 1);
  });

  /*===== CLOSE MODAL =====*/
  modal.querySelector(".modal__close").addEventListener("click", () => modal.close());
  modal.addEventListener("click", e => { if (e.target === modal) modal.close(); });   // Click outside

  modal.addEventListener("close", () => {
    rail.children[actual]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  });
})();
