(() => {
  "use strict";

  const data  = window.VAQUEROS || [];
  const rail  = document.getElementById("rail");
  const tpl   = document.getElementById("card-tpl");
  const prev  = document.querySelector(".rail-btn--prev");
  const next  = document.querySelector(".rail-btn--next");
  const modal = document.getElementById("modal");

  const EXTENSIONES = ["webp", "png", "jpg"];   


  function rellenar(raiz, v) {
    raiz.querySelectorAll("[data-field]").forEach(el => {
      const valor = v[el.dataset.field] ?? "";
      el.textContent = valor;
      const fila = el.closest(".facts > div") || el;
      fila.hidden = !valor;
    });
  }


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
        <code>assets/riders/${v.id}.webp</code>`;
    };
    img.src = window.JINETES_EMBEBIDOS?.[v.id] || `assets/riders/${v.id}.${EXTENSIONES[0]}`;
    contenedor.appendChild(img);
  }

  const ponerMapa = (raiz, v) => raiz.querySelectorAll("[data-mapa]").forEach(svg => {
    svg.classList.remove("is-country");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.innerHTML = '<use href="#i-mapa"/>';
    window.Mapas?.dibujar(svg, v.mapa);
  });

  /* ---------- tarjetas ---------- */
  function renderCard(v, index) {
    const node = tpl.content.firstElementChild.cloneNode(true);
    node.dataset.id = v.id;
    rellenar(node, v);
    if (v.nombre.length > 14) node.querySelector(".card__name").classList.add("is-long");
    ponerJinete(node.querySelector("[data-rider]"), v);
    ponerMapa(node, v);

    const hit = node.querySelector(".card__hit");
    hit.setAttribute("aria-label", `Ver ficha: ${v.nombre}, ${v.pais}`);
    hit.addEventListener("click", () => abrirFicha(index));
    return node;
  }

  const frag = document.createDocumentFragment();
  data.forEach((v, i) => frag.appendChild(renderCard(v, i)));
  rail.appendChild(frag);

  /* ---------- Carril horizontal ---------- */
  const paso = () => (rail.querySelector(".card")?.offsetWidth || 220) + 15;

  function actualizarFlechas() {
    const desborda = rail.scrollWidth > rail.clientWidth + 2;
    prev.hidden = !desborda || rail.scrollLeft <= 2;
    next.hidden = !desborda || rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 2;
  }

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

  /* ---------- Ventana emergente ---------- */
  let actual = 0;   
  const contador = modal.querySelector(".modal__count");

  function abrirFicha(i) {
    actual = (i + data.length) % data.length;   // Loop: last → first
    const v = data[actual];
    rellenar(modal, v);
    ponerJinete(modal.querySelector("[data-rider]"), v);
    ponerMapa(modal, v);
    contador.textContent = `${actual + 1} / ${data.length}`;
    modal.querySelector(".modal__text").scrollTop = 0;
    modal.querySelector(".modal__body").scrollTop = 0;
    if (!modal.open) modal.showModal();
  }

  /*=============== PREVIOUS / NEXT ===============*/
  modal.querySelectorAll(".modal__arrow").forEach(btn =>
    btn.addEventListener("click", () => abrirFicha(actual + Number(btn.dataset.dir)))
  );

  modal.addEventListener("keydown", e => {
    if (e.key === "ArrowRight") abrirFicha(actual + 1);
    if (e.key === "ArrowLeft")  abrirFicha(actual - 1);
  });

  modal.addEventListener("close", () => {
    rail.children[actual]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  });
