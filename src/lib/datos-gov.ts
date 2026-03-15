/**
 * datos.gov.co SODA API client — expanded to 40+ datasets.
 */

const DATOS_GOV_BASE = "https://www.datos.gov.co/resource";

export async function fetchDatosGov(
  datasetId: string,
  params: Record<string, string> = {}
) {
  const searchParams = new URLSearchParams(params);
  const url = `${DATOS_GOV_BASE}/${datasetId}.json?${searchParams.toString()}`;
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  // Note: X-App-Token skipped — current token is invalid and datos.gov.co
  // returns 403 with it. Without token, API works fine (throttled >1k req/hr).
  const res = await fetch(url, { headers, cache: "no-store" });
  if (!res.ok) throw new Error(`datos.gov.co API error: ${res.status}`);
  return res.json();
}

// =====================================================================
// Dataset IDs — 40+ organized by category
// =====================================================================

export const DATASETS = {
  // --- Referencia ---
  divipola: "gdxc-w37w",

  // --- Educación ---
  educacionMunicipio: "nudc-7mev",    // MEN 2011-2024 por municipio
  educacionDepartamento: "ji8i-4anb",  // MEN por departamento
  educacionSuperior: "5wck-szir",      // Matrícula ed. superior

  // --- Salud ---
  ipsPorNivel: "ugc5-acjp",           // IPS por nivel complejidad
  repsProviders: "c36g-9fc2",         // Registro Especial Prestadores
  bduaContributivo: "tq4m-hmg2",      // Población asegurada contributiva
  bduaSubsidiado: "d7a5-cnra",        // Población asegurada subsidiada

  // --- Seguridad ---
  homicidios: "vtub-3de2",            // Presuntos homicidios 2015-2024
  delitosSexuales: "fpe5-yrmw",       // Delitos sexuales 2010-2025
  violenciaIntrafamiliar: "vuyt-mqpw", // Violencia intrafamiliar
  hurtoModalidades: "9vha-vh9n",       // Hurto (motos, vehículos)
  hurtoResidencial: "6sqw-8cg5",       // Hurto residencias/comercio
  lesionesPersonales: "72sg-cybi",     // Lesiones personales
  suicidios: "f75u-mirk",             // Suicidios 2015-2024

  // --- Agricultura ---
  eva2019: "uejq-wxrr",               // EVA 2019-2024
  evaHistorico: "2pnw-mmge",          // EVA Histórico 2007-2018

  // --- Economía / Fiscal ---
  desempenoMunicipal: "nkjx-rsq7",    // DNP MDM
  futIngresos: "a6ia-xzgy",           // FUT Ingresos municipales
  proyectosSGR: "mzgh-shtp",          // Proyectos SGR Regalías
  pibDepartamental: "kgyi-qc7j",      // PIB departamental
  secopContratos: "jbjy-vk9h",        // SECOP II

  // --- Infraestructura ---
  redVialInvias: "ie7y-asdn",         // Red vial nacional (geometría)
  puentesInvias: "nsdj-ep2p",         // Puentes red vial
  peajesInvias: "68qj-5xux",          // Peajes
  aeropuertosSatena: "dk2k-eg94",     // Aeropuertos
  operacionesAereas: "jh8x-n6h6",    // Operaciones aéreas

  // --- Telecomunicaciones ---
  coberturaMovil: "9mey-c8s8",        // 2G/3G/4G/LTE/5G por municipio
  gobiernoDigital: "rtai-k9uh",       // Índice Gobierno Digital

  // --- Ambiente / Riesgo ---
  emergenciasUNGRD: "wwkg-r6te",      // Emergencias UNGRD (79 campos)
  areasProtegidas: "n9kx-xwgg",       // RUNAP
  amenazaInundacionTR100: "u8t2-ja2c",

  // --- Turismo ---
  rnt: "thwd-ivmp",                   // Registro Nacional Turismo

  // --- Minería ---
  titulosMineros: "si2v-pbq5",        // ANM títulos
  produccionMinera: "r85m-vv6c",      // Producción + regalías

  // --- Conflicto (SIEVCAC) ---
  victimasMAP: "52eu-ic7d",           // Minas antipersonal
  ataquesTerrroristas: "yfd7-8c9d",
  desaparicionForzada: "c59y-p4sz",
  masacres: "d78j-f66e",

  // --- IDEAM ---
  precipitacion: "s54a-sgyg",
  temperatura: "sbwg-7ju4",
  normalesClimatologicas: "nsz2-kzcq",
  calidadAire: "kekd-7v7h",
} as const;

// =====================================================================
// Typed fetch functions by category
// =====================================================================

export async function fetchDIVIPOLA() {
  return fetchDatosGov(DATASETS.divipola, { $limit: "1200" });
}

/** Education stats for a municipality (latest year) */
export async function fetchEducacion(codigoMunicipio: string) {
  return fetchDatosGov(DATASETS.educacionMunicipio, {
    $where: `c_digo_municipio='${codigoMunicipio}'`,
    $order: "a_o DESC",
    $limit: "1",
  });
}

/** All education stats for a municipality (time series) */
export async function fetchEducacionHistorico(codigoMunicipio: string) {
  return fetchDatosGov(DATASETS.educacionMunicipio, {
    $where: `c_digo_municipio='${codigoMunicipio}'`,
    $order: "a_o DESC",
    $limit: "20",
  });
}

/** Health facilities in a municipality */
export async function fetchIPS(municipio: string, departamento: string) {
  return fetchDatosGov(DATASETS.ipsPorNivel, {
    $where: `upper(muni_nombre)='${municipio.toUpperCase()}' AND upper(depa_nombre)='${departamento.toUpperCase()}'`,
    $limit: "200",
  });
}

/** Homicide counts for a municipality (DANE code without leading zeros) */
export async function fetchHomicidios(codigoMunicipio: string) {
  const codeNoLeadingZeros = String(parseInt(codigoMunicipio));
  return fetchDatosGov(DATASETS.homicidios, {
    $where: `codigo_dane_municipio='${codeNoLeadingZeros}'`,
    $select: "a_o_del_hecho,count(*) as cantidad",
    $group: "a_o_del_hecho",
    $order: "a_o_del_hecho DESC",
    $limit: "10",
  });
}

/** Agricultural production (EVA) for a municipality */
export async function fetchAgricultura(codigoMunicipio: string) {
  return fetchDatosGov(DATASETS.eva2019, {
    $where: `c_digo_dane_municipio='${codigoMunicipio}'`,
    $order: "a_o DESC",
    $limit: "50",
  });
}

/** Mobile coverage for a municipality */
export async function fetchCoberturaTelco(codigoMunicipio: string) {
  return fetchDatosGov(DATASETS.coberturaMovil, {
    $where: `cod_municipio='${codigoMunicipio}'`,
    $limit: "20",
  });
}

/** UNGRD emergencies for a municipality (uses divipola code) */
export async function fetchEmergencias(codigoMunicipio: string) {
  return fetchDatosGov(DATASETS.emergenciasUNGRD, {
    $where: `divipola='${codigoMunicipio}'`,
    $order: "fecha DESC",
    $limit: "50",
  });
}

/** DNP Municipal Performance */
export async function fetchDesempenoMunicipal(codigoEntidad: string) {
  return fetchDatosGov(DATASETS.desempenoMunicipal, {
    $where: `codigo_entidad='${codigoEntidad}'`,
    $order: "anio DESC",
    $limit: "50",
  });
}

/** Tourism prestadores for a municipality */
export async function fetchTurismo(codigoMunicipio: string) {
  return fetchDatosGov(DATASETS.rnt, {
    $where: `cod_mun='${codigoMunicipio}'`,
    $limit: "200",
  });
}

/** Mining production for a municipality */
export async function fetchMineria(municipio: string) {
  return fetchDatosGov(DATASETS.produccionMinera, {
    $where: `upper(municipio)='${municipio.toUpperCase()}'`,
    $order: "anio DESC",
    $limit: "50",
  });
}

/** FUT municipal income — FUT uses hierarchical codes, filter by TI (total ingresos) */
export async function fetchFUT(codigoMunicipio: string) {
  return fetchDatosGov(DATASETS.futIngresos, {
    $where: `codigo='TI'`,
    $limit: "1",
  });
}

/** Víctimas MAP/MUSE (minas antipersonal) */
export async function fetchVictimasMAP(codigoMunicipio: string) {
  return fetchDatosGov(DATASETS.victimasMAP, {
    $where: `c_digo_dane_de_municipio='${codigoMunicipio}'`,
    $select: "a_o,count(*) as cantidad",
    $group: "a_o",
    $order: "a_o DESC",
    $limit: "20",
  });
}

/** Masacres by municipality */
export async function fetchMasacres(codigoMunicipio: string) {
  return fetchDatosGov(DATASETS.masacres, {
    $where: `c_digo_dane_de_municipio='${codigoMunicipio}'`,
    $select: "a_o,count(*) as casos,sum(total_de_v_ctimas_del_caso) as victimas",
    $group: "a_o",
    $order: "a_o DESC",
    $limit: "20",
  });
}

/** IDEAM precipitation normals for a municipality */
export async function fetchClimaPrecipitacion(municipio: string) {
  return fetchDatosGov(DATASETS.normalesClimatologicas, {
    $where: `municipio='${municipio}' AND par_metro='PRECIPITACIÓN'`,
    $limit: "5",
  });
}

/** IDEAM temperature normals for a municipality */
export async function fetchClimaTemperatura(municipio: string) {
  return fetchDatosGov(DATASETS.normalesClimatologicas, {
    $where: `municipio='${municipio}' AND par_metro='TEMPERATURA MEDIA'`,
    $limit: "5",
  });
}

// =====================================================================
// NEW: Expanded fetch functions (Phase 1a)
// =====================================================================

/** Delitos sexuales by municipality (codigo_dane is 8 digits, match first 5) */
export async function fetchDelitosSexuales(codigoMunicipio: string) {
  return fetchDatosGov(DATASETS.delitosSexuales, {
    $where: `starts_with(codigo_dane,'${codigoMunicipio}')`,
    $select: "count(*) as total",
  });
}

/** Violencia intrafamiliar by municipality */
export async function fetchViolenciaIntrafamiliar(codigoMunicipio: string) {
  return fetchDatosGov(DATASETS.violenciaIntrafamiliar, {
    $where: `starts_with(codigo_dane,'${codigoMunicipio}')`,
    $select: "count(*) as total",
  });
}

/** Hurtos by municipality */
export async function fetchHurtos(codigoMunicipio: string) {
  return fetchDatosGov(DATASETS.hurtoModalidades, {
    $where: `starts_with(codigo_dane,'${codigoMunicipio}')`,
    $select: "count(*) as total",
  });
}

/** Suicidios by municipality (uses codigo_dane_municipio without leading zeros) */
export async function fetchSuicidios(codigoMunicipio: string) {
  const code = String(parseInt(codigoMunicipio));
  return fetchDatosGov(DATASETS.suicidios, {
    $where: `codigo_dane_municipio='${code}'`,
    $select: "a_o_del_hecho as anio,count(*) as cantidad",
    $group: "a_o_del_hecho",
    $order: "a_o_del_hecho DESC",
    $limit: "20",
  });
}

/** Ataques terroristas by municipality */
export async function fetchAtaquesTerroristas(codigoMunicipio: string) {
  return fetchDatosGov(DATASETS.ataquesTerrroristas, {
    $where: `c_digo_dane_de_municipio='${codigoMunicipio}'`,
    $select: "a_o,count(*) as cantidad",
    $group: "a_o",
    $order: "a_o DESC",
    $limit: "20",
  });
}

/** Desaparición forzada by municipality */
export async function fetchDesaparicionForzada(codigoMunicipio: string) {
  return fetchDatosGov(DATASETS.desaparicionForzada, {
    $where: `c_digo_dane_de_municipio='${codigoMunicipio}'`,
    $select: "a_o,count(*) as cantidad",
    $group: "a_o",
    $order: "a_o DESC",
    $limit: "20",
  });
}

/** SGR projects by municipality executor code */
export async function fetchProyectosSGR(codigoMunicipio: string) {
  const code = String(parseInt(codigoMunicipio));
  return fetchDatosGov(DATASETS.proyectosSGR, {
    $where: `codejecutor='${code}'`,
    $order: "valortotal DESC",
    $limit: "50",
  });
}

/** BDUA contributivo population by municipality */
export async function fetchBDUAContributivo(municipio: string) {
  return fetchDatosGov(DATASETS.bduaContributivo, {
    $where: `upper(mnc_nombre)='${municipio.toUpperCase()}'`,
    $select: "ent_nombre,sum(cantidad) as total",
    $group: "ent_nombre",
    $order: "total DESC",
    $limit: "20",
  });
}

/** BDUA subsidiado population by municipality */
export async function fetchBDUASubsidiado(municipio: string) {
  return fetchDatosGov(DATASETS.bduaSubsidiado, {
    $where: `upper(mnc_nombre)='${municipio.toUpperCase()}'`,
    $select: "ent_nombre,sum(cantidad) as total",
    $group: "ent_nombre",
    $order: "total DESC",
    $limit: "20",
  });
}

/** Aeropuertos by municipality */
export async function fetchAeropuertos(municipio: string) {
  return fetchDatosGov(DATASETS.aeropuertosSatena, {
    $where: `upper(ciudad)='${municipio.toUpperCase()}'`,
    $limit: "10",
  });
}

/** Education stats by department */
export async function fetchEducacionDepartamento(departamento: string) {
  return fetchDatosGov(DATASETS.educacionDepartamento, {
    $where: `upper(departamento)='${departamento.toUpperCase()}'`,
    $order: "ano DESC",
    $limit: "5",
  });
}

/** PIB departamental */
export async function fetchPIBDepartamental(departamento: string) {
  return fetchDatosGov(DATASETS.pibDepartamental, {
    $where: `upper(departamento)='${departamento.toUpperCase()}'`,
    $select: "a_o,actividad,valor_miles_de_millones_de,tipo_de_precios",
    $order: "a_o DESC",
    $limit: "50",
  });
}

/** Educación superior by municipality */
export async function fetchEducacionSuperior(codigoMunicipio: string) {
  const code = String(parseInt(codigoMunicipio));
  return fetchDatosGov(DATASETS.educacionSuperior, {
    $where: `c_digo_del_municipio_programa='${codigoMunicipio}' OR c_digo_del_municipio_programa='${code}'`,
    $select: "programa_acad_mico,instituci_n_de_educaci_n_superior_ies,a_o,semestre,sum(matriculados_2015) as matriculados",
    $group: "programa_acad_mico,instituci_n_de_educaci_n_superior_ies,a_o,semestre",
    $order: "a_o DESC,semestre DESC",
    $limit: "50",
  });
}
