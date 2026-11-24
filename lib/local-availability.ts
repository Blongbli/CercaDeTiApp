// "Puente" gratis producto → tienda física: cadenas con tiendas en España.
// Para un producto/consulta damos un enlace a la búsqueda/stock de esa cadena,
// para comprobar disponibilidad en tienda sin necesidad de una API de inventario
// (que no existe pública). No confirma stock; lleva a la web de la cadena a verlo.
type Chain = { match: string[]; label: string; url: (q: string) => string };

const enc = (q: string) => encodeURIComponent(q.trim());

const CHAINS: Chain[] = [
  { match: ['mediamarkt', 'media markt'], label: 'MediaMarkt', url: (q) => `https://www.mediamarkt.es/es/search.html?query=${enc(q)}` },
  { match: ['pccomponentes', 'pc componentes'], label: 'PcComponentes', url: (q) => `https://www.pccomponentes.com/buscar/?query=${enc(q)}` },
  { match: ['worten'], label: 'Worten', url: (q) => `https://www.worten.es/search?query=${enc(q)}` },
  { match: ['fnac'], label: 'Fnac', url: (q) => `https://www.fnac.es/SearchResult/ResultList.aspx?Search=${enc(q)}` },
  { match: ['carrefour'], label: 'Carrefour', url: (q) => `https://www.carrefour.es/?q=${enc(q)}` },
  { match: ['corte inglés', 'corte ingles', 'elcorteingles', 'hipercor'], label: 'El Corte Inglés', url: (q) => `https://www.elcorteingles.es/search/?s=${enc(q)}` },
  { match: ['alcampo'], label: 'Alcampo', url: (q) => `https://www.alcampo.es/compra-online/search/?text=${enc(q)}` },
  { match: ['decathlon'], label: 'Decathlon', url: (q) => `https://www.decathlon.es/es/search?Ntt=${enc(q)}` },
  { match: ['leroy'], label: 'Leroy Merlin', url: (q) => `https://www.leroymerlin.es/productos?q=${enc(q)}` },
  { match: ['bricomart'], label: 'Bricomart', url: (q) => `https://www.bricomart.es/catalogsearch/result/?q=${enc(q)}` },
  { match: ['ikea'], label: 'IKEA', url: (q) => `https://www.ikea.com/es/es/search/?q=${enc(q)}` },
  { match: ['zara'], label: 'Zara', url: (q) => `https://www.zara.com/es/es/search?searchTerm=${enc(q)}` },
  { match: ['sprinter'], label: 'Sprinter', url: (q) => `https://www.sprinter.es/buscar?q=${enc(q)}` },
  { match: ['primor'], label: 'Primor', url: (q) => `https://www.primor.eu/es/buscar?s=${enc(q)}` },
  { match: ['druni'], label: 'Druni', url: (q) => `https://www.druni.es/catalogsearch/result/?q=${enc(q)}` },
  { match: ['juguettos', 'toys r us', 'toysrus'], label: 'Jugueterías', url: (q) => `https://www.google.com/search?q=${enc(q + ' comprar tienda')}` },
];

// Devuelve la cadena física y el enlace de disponibilidad, o null si el nombre
// no corresponde a una cadena con tiendas (p. ej. Amazon/AliExpress -> online puro).
export function chainAvailability(
  storeName?: string | null,
  query?: string | null
): { label: string; url: string } | null {
  if (!storeName || !query || !query.trim()) return null;
  const n = storeName.toLowerCase();
  const chain = CHAINS.find((c) => c.match.some((m) => n.includes(m)));
  if (!chain) return null;
  return { label: chain.label, url: chain.url(query) };
}
