import { generateSlug } from './slugify';

export const WHATSAPP_PHONE = '584244244184';

/**
 * Generates WhatsApp direct order URL for a specific product
 * @param {Object} product - Product data object
 * @param {string|number} formattedPrice - Formatted USD or VES price string
 * @param {number} quantity - Chosen quantity
 * @returns {string} WhatsApp URL with prefilled text
 */
export function getProductWhatsAppUrl(product, formattedPrice, quantity = 1) {
  if (!product) return `https://wa.me/${WHATSAPP_PHONE}`;

  const slug = product.slug || generateSlug(product.name || '') || String(product.id || '');
  const productUrl = `${window.location.origin}/#/tienda/${slug}`;
  const priceText = formattedPrice ? formattedPrice : `$${product.price_usd || product.price || 0}`;

  const lines = [
    `¡Hola! 👋 Me gustaría pedir el siguiente producto en *SRX Tech*:`,
    ``,
    `📌 *Producto:* ${product.name}`,
    `💵 *Precio:* ${priceText}`,
    `🔢 *Cantidad:* ${quantity}`,
    `🔗 *Enlace:* ${productUrl}`,
    ``,
    `¿Tienen disponibilidad para coordinar el pedido y método de pago? ¡Muchas gracias!`
  ];

  const message = lines.join('\n');
  return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`;
}

/**
 * Generates WhatsApp general inquiry URL for the store
 * @param {string} customMessage - Optional customized inquiry message
 * @returns {string} WhatsApp URL
 */
export function getGeneralWhatsAppUrl(customMessage) {
  const defaultMessage = '¡Hola! 👋 Tengo una consulta sobre la tienda online de SRX Tech.';
  const message = customMessage || defaultMessage;
  return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`;
}
