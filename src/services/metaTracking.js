// src/services/metaTracking.js
// Seguimiento de Meta: Pixel (navegador) + API de Conversiones (servidor) con deduplicación.
//
// Cada evento se envía dos veces con el MISMO event_id:
//   1) al Pixel:            fbq('track', nombre, datos, { eventID })
//   2) a la Edge Function:  supabase.functions.invoke('meta-capi', ...) -> Graph API de Meta
// Meta descarta el duplicado (mismo event_name + event_id dentro de 48 h).
//
// Importante: aquí NO hay ningún token. El token de Meta vive solo como secreto de la
// Edge Function. Nada de este archivo puede romper la tienda: todo va en try/catch.

import { supabase } from '../utils/supabaseClient';

// El servidor solo se contacta en producción. En desarrollo local se evita ensuciar el
// Pixel con eventos de localhost; para probar en local: VITE_META_CAPI_DEV=true.
const SERVER_ENABLED =
  !import.meta.env.DEV || import.meta.env.VITE_META_CAPI_DEV === 'true';

// Datos del cliente conocidos (los actualiza App.jsx cuando cambia la sesión).
let currentUser = null;

export function setMetaUser(user) {
  currentUser = user
    ? {
        email: user.email || undefined,
        name: user.name || user.user_metadata?.full_name || undefined,
        external_id: user.id || undefined,
      }
    : null;
}

// ── Identificadores ──────────────────────────────────────────────────────────
export function newEventId(prefix = 'evt') {
  const rand =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}${Math.random().toString(36).slice(2, 12)}`;
  return `${prefix}_${rand}`;
}

function readCookie(name) {
  try {
    const match = document.cookie.match(
      new RegExp('(?:^|; )' + name.replace(/[.$?*|{}()[\]\\/+^]/g, '\\$&') + '=([^;]*)')
    );
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

export function getFbp() {
  return readCookie('_fbp') || undefined;
}

// La tienda usa HashRouter, así que fbclid llega en la query normal (?fbclid=...) antes
// del "#". El Pixel ya guarda la cookie _fbc; si no existe, se reconstruye desde fbclid.
export function getFbc() {
  const cookie = readCookie('_fbc');
  if (cookie) return cookie;
  try {
    const fromSearch = new URLSearchParams(window.location.search).get('fbclid');
    const hashQuery = window.location.hash.includes('?')
      ? window.location.hash.split('?')[1]
      : '';
    const fbclid = fromSearch || new URLSearchParams(hashQuery).get('fbclid');
    return fbclid ? `fb.1.${Date.now()}.${fbclid}` : undefined;
  } catch {
    return undefined;
  }
}

// ── Pixel ────────────────────────────────────────────────────────────────────
function firePixel(eventName, customData, eventId) {
  try {
    window.fbq =
      window.fbq ||
      function () {
        (window.fbq.q = window.fbq.q || []).push(arguments);
      };
    window.fbq('track', eventName, customData, { eventID: eventId });
    console.log('[Meta Pixel]', eventName, { eventID: eventId, ...customData });
  } catch (err) {
    console.warn('[Meta Pixel] No se pudo disparar', eventName, err);
  }
}

// ── Servidor (Edge Function) ─────────────────────────────────────────────────
function callServer(body) {
  if (!SERVER_ENABLED) return;
  supabase.functions
    .invoke('meta-capi', { body })
    .then(({ error }) => {
      if (error) console.warn('[Meta CAPI] Respuesta con error:', error.message || error);
    })
    .catch((err) => console.warn('[Meta CAPI] No se pudo contactar la función:', err));
}

/**
 * Registra un evento en el Pixel y en la API de Conversiones con el mismo event_id.
 * @param {string} eventName  PageView | ViewContent | AddToCart | InitiateCheckout | CompleteRegistration ...
 * @param {object} customData value, currency, content_ids, contents, content_name, content_type, num_items
 * @param {object} [options]  { eventId, userData: { email, phone, name, external_id } }
 * @returns {string} el event_id usado
 */
export function trackMetaEvent(eventName, customData = {}, options = {}) {
  const eventId = options.eventId || newEventId(eventName.toLowerCase());
  try {
    firePixel(eventName, customData, eventId);
    callServer({
      action: 'event',
      event_name: eventName,
      event_id: eventId,
      event_source_url: window.location.href,
      user_data: {
        ...(currentUser || {}),
        ...(options.userData || {}),
        fbp: getFbp(),
        fbc: getFbc(),
      },
      custom_data: customData,
    });
  } catch (err) {
    console.warn('[Meta] Error inesperado registrando', eventName, err);
  }
  return eventId;
}

/**
 * Guarda el contexto del navegador (IP, user agent, fbp, fbc) en la orden recién creada.
 * Así, cuando el pago se apruebe, el servidor puede enviar el Purchase con datos completos.
 */
export function registerOrderContext(orderId) {
  try {
    callServer({
      action: 'order_context',
      order_id: orderId,
      event_source_url: window.location.href,
      fbp: getFbp(),
      fbc: getFbc(),
    });
  } catch (err) {
    console.warn('[Meta] No se pudo registrar el contexto de la orden', err);
  }
}

/**
 * Purchase del Pixel (solo navegador). Se usa únicamente cuando el pago ya está
 * confirmado al crear la orden (pago directo con tarjeta). El servidor envía el mismo
 * evento con event_id `purchase_<orderId>`, así que Meta lo deduplica.
 * Para Zelle / Pago Móvil / Binance el Purchase sale SOLO desde el servidor, al aprobar el pago.
 */
export function trackPixelPurchase({ orderId, value, items = [] }) {
  const contents = items.map((it) => ({
    id: String(it.id),
    quantity: it.quantity || 1,
    item_price: Number(it.price) || 0,
  }));
  firePixel(
    'Purchase',
    {
      value: Number(value) || 0,
      currency: 'USD',
      content_type: 'product',
      content_ids: contents.map((c) => c.id),
      contents,
      num_items: contents.reduce((n, c) => n + c.quantity, 0),
    },
    `purchase_${orderId}`
  );
}
