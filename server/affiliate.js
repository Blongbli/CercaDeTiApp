import { config } from './config.js';

// Prepara un enlace de producto para monetización con afiliados.
// Hoy soporta Amazon (etiqueta vía AMAZON_AFFILIATE_TAG en .env). Si el enlace
// no es de una tienda soportada o no hay etiqueta configurada, se devuelve igual.
// Pensado para crecer (otras redes de afiliados) sin tocar el resto del código.
export function withAffiliate(link) {
  if (!link) return link;
  try {
    const u = new URL(link);
    if (config.amazonAffiliateTag && /(^|\.)amazon\./i.test(u.hostname)) {
      u.searchParams.set('tag', config.amazonAffiliateTag);
      return u.toString();
    }
  } catch {
    // Enlace no parseable (p.ej. redirección de Google Shopping): se deja igual.
  }
  return link;
}
