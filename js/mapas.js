
window.Mapas = (() => {
  "use strict";

  const URL_MUNDO = "https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json";
  let mundo = null;         
  const cache = new Map();  

  const cargar = () => (mundo ??= fetch(URL_MUNDO).then(r => {
    if (!r.ok) throw new Error("mapa no disponible");
    return r.json();
  }));

  /* ---- TopoJSON → lista de polígonos [[lon,lat]...] por país ---- */
  function decodificarArcos(topo) {
    const [sx, sy] = topo.transform.scale, [tx, ty] = topo.transform.translate;
    return topo.arcs.map(arco => {
      let x = 0, y = 0;
      return arco.map(([dx, dy]) => [(x += dx) * sx + tx, (y += dy) * sy + ty]);
    });
  }

  function anillo(indices, arcos) {
    const pts = [];
    indices.forEach((i, k) => {
      let a = arcos[i < 0 ? ~i : i];
      if (i < 0) a = a.slice().reverse();
      pts.push(...(k ? a.slice(1) : a));  
    });
    return pts;
  }

  function poligonosDe(geom, arcos) {
    if (geom.type === "Polygon") return [geom.arcs.map(r => anillo(r, arcos))];
    if (geom.type === "MultiPolygon") return geom.arcs.map(p => p.map(r => anillo(r, arcos)));
    return [];
  }

  /* ---- Mercator y utilidades ---- */
  const merc = ([lon, lat]) => [lon * Math.PI / 180,
    -Math.log(Math.tan(Math.PI / 4 + Math.max(-85, Math.min(85, lat)) * Math.PI / 360))];

  const area = r => Math.abs(r.reduce((s, [x, y], i) => {
    const [x2, y2] = r[(i + 1) % r.length];
    return s + x * y2 - x2 * y;
  }, 0) / 2);

  const centro = r => r.reduce(([a, b], [x, y]) => [a + x / r.length, b + y / r.length], [0, 0]);

  /* Filtros especiales*/
  const FILTROS = {
    conus:  ([lon, lat]) => lon > -130 && lat < 50,
    hawaii: ([lon, lat]) => lon < -150 && lat < 25,
  };

  function calcularPath(topo, claves) {
    const arcos = decodificarArcos(topo);
    const geoms = topo.objects.countries.geometries;
    let partes = [];

    claves.forEach(clave => {
      const [id, filtro] = clave.split(":");
      const g = geoms.find(g => String(g.id).padStart(3, "0") === id);
      if (!g) return;
      let polis = poligonosDe(g, arcos);
      if (filtro) polis = polis.filter(p => FILTROS[filtro](centro(p[0])));
      const proy = polis.map(p => p.map(r => r.map(merc)));
      const max = Math.max(...proy.map(p => area(p[0])));
      const umbral = filtro === "hawaii" ? 0.04 : 0.08;
      partes.push(...proy.filter(p => area(p[0]) >= max * umbral));
    });
    if (!partes.length) return null;

    // encajar en un cuadro de 48×48 con margen
    const xs = partes.flat(2).map(p => p[0]), ys = partes.flat(2).map(p => p[1]);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const k = 44 / Math.max(x1 - x0, y1 - y0);
    const ox = (48 - (x1 - x0) * k) / 2, oy = (48 - (y1 - y0) * k) / 2;
    const f = n => n.toFixed(1);

    return partes.map(p => p.map(r =>
      "M" + r.map(([x, y]) => f((x - x0) * k + ox) + " " + f((y - y0) * k + oy)).join("L") + "Z"
    ).join("")).join("");
  }

  /* ---- API pública ---- */
  async function dibujar(svg, claves) {
    if (!claves || !claves.length) return;
    const clave = claves.join("+");
    try {
      if (!cache.has(clave)) cache.set(clave, calcularPath(await cargar(), claves));
      const d = cache.get(clave);
      if (!d) return;
      svg.innerHTML = `<path d="${d}" fill-rule="evenodd"/>`;
      svg.setAttribute("viewBox", "0 0 48 48");
      svg.classList.add("is-country");
    } catch (_) { /* sin conexión */ }
  }

  return { dibujar };
})();
