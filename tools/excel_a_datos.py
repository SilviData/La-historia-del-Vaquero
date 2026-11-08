"""
Excel → data/vaqueros.js
------------------------------------------------------------------
"""
import json, re, sys, unicodedata
from pathlib import Path
import openpyxl

EXCEL = Path(sys.argv[1] if len(sys.argv) > 1 else "Dataset_Completo_Vaqueros.xlsx")
SALIDA = Path(__file__).resolve().parent.parent / "data" / "vaqueros.js"

COLUMNAS = {
    "#": "n",
    "Nombre Tradicional": "nombre",
    "Arquetipo": "arquetipo",
    "Raíz / Etnicidad": "etnicidad",
    "Detalle del Mestizaje y Origen": "origen",
    "Presencia Femenina Regional": "presencia_femenina",
    "País": "pais",
    "Región": "region",
    "Bioma / Entorno": "bioma",
    "Actividad Principal": "actividad",
    "Periodo de Consolidación": "epoca",
    "Año / Hito Clave": "anio_hito",
    "¿Qué documento o hecho histórico fija su posición aquí?": "documento",
    "Sombrero": "sombrero",
    "Camisa": "camisa",
    "Chaqueta / Chaleco": "chaqueta",
    "Pantalón": "pantalon",
    "Calzado / Botas": "calzado",
    "Chaparreras": "chaparreras",
    "Guantes": "guantes",
    "Cinturon / Faja": "faja",
    "Espuelas": "espuelas",
    "Lazo": "lazo",
    "Montura": "montura",
    "Raza de Caballo": "caballo",
    "Corbata (Bolo/Moño)": "corbata",
    "Caballo Histórico": "caballo_historico",
    "Indumentaria Femenina": "indumentaria_femenina",
    "Hito Técnico / Aporte Documentado": "hito_tecnico",
    "Fuente Documental Clave": "fuente",
    "Resumenes de textos": "resumen",
    "Tooltip": "tooltip",
}


MAPAS = {
    "Península Ibérica": ["724", "620"],
    "España": ["724"],
    "Portugal": ["620"],
    "Rep. Dominicana": ["214"],
    "Cuba / P. Rico": ["192", "630"],
    "México": ["484"],
    "Brasil": ["076"],
    "Costa Rica / Nicaragua / Honduras": ["188", "558", "340"],
    "Perú": ["604"],
    "Ecuador": ["218"],
    "Colombia / Venezuela": ["170", "862"],
    "Argentina": ["032"],
    "Chile": ["152"],
    "EE.UU": ["840:conus"],
    "Hawai": ["840:hawaii"],
}

VACIOS = {"no usa", "ninguna", "ninguno", "opcional", ""}


def limpio(v):
    return re.sub(r"\s+", " ", str(v)).strip() if v is not None else ""


def slug(texto):
    t = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", t.lower()).strip("-")


def sin_parentesis(t):
    return re.sub(r"\s*\([^)]*\)", "", t).strip()


def enumerar(partes):
    """['a','b','c'] → 'a, b y c.' (con la primera en mayúscula)."""
    partes = [p for p in partes if p]
    if not partes:
        return ""
    partes = [partes[0]] + [p[0].lower() + p[1:] for p in partes[1:]]
    txt = partes[0] if len(partes) == 1 else ", ".join(partes[:-1]) + " y " + partes[-1]
    return txt[0].upper() + txt[1:] + "."


def main():
    ws = openpyxl.load_workbook(EXCEL, data_only=True)["Data"]
    filas = list(ws.iter_rows(values_only=True))
    cab = [limpio(c) for c in filas[0]]

    registros = []
    for fila in filas[1:]:
        if not any(fila):
            continue
        crudo = {cab[i]: limpio(v) for i, v in enumerate(fila)}
        r = {campo: crudo.get(col, "") for col, campo in COLUMNAS.items()}
        r["n"] = int(float(r["n"])) if r["n"] else len(registros) + 1
        r["id"] = slug(r["nombre"])

        prendas = [r[k] for k in ("sombrero", "chaqueta", "camisa", "pantalon",
                                   "chaparreras", "calzado", "faja")
                   if r[k].lower() not in VACIOS]
        r["indumentaria"] = enumerar(prendas)                                # completa (ventana)
        r["indumentaria_corta"] = enumerar([sin_parentesis(p) for p in prendas])  # tarjeta
        r["caballo_corto"] = sin_parentesis(r["caballo"]) + "."
        r["region_corta"] = r["region"] + ("" if r["region"].endswith(".") else ".")
        r["uso"] = " · ".join(f"{k}: {v[0].lower() + v[1:]}" for k, v in
                              (("Montura", r["montura"]), ("Lazo", r["lazo"]), ("Espuelas", r["espuelas"]))
                              if v.lower() not in VACIOS)
        r["mapa"] = MAPAS.get(r["pais"], [])
        if not r["mapa"]:
            print(f"  ⚠ Sin mapa para el país «{r['pais']}» (fila {r['n']}). Agrégalo en MAPAS.")
        registros.append(r)

    js = ("/* Archivo GENERADO por tools/excel_a_datos.py — no editar a mano:\n"
          "   cambia el Excel y vuelve a correr el script. */\n"
          "window.VAQUEROS = " + json.dumps(registros, ensure_ascii=False, indent=2) + ";\n")
    SALIDA.write_text(js, encoding="utf-8")
    print(f"✓ {len(registros)} vaqueros → {SALIDA}")


if __name__ == "__main__":
    main()
