// supabase/functions/meta-capi/index.ts
// SRX Tech - Meta Conversions API (servidor)
//
// Recibe eventos de dos orígenes y los reenvía a Meta (Graph API):
//   1) Navegador (frontend): PageView, ViewContent, AddToCart, InitiateCheckout, ...
//      -> POST { action: "event", event_name, event_id, ... }
//      -> POST { action: "order_context", order_id, fbp, fbc, event_source_url }
//   2) Webhook de base de datos (tabla orders, UPDATE): cuando el pago se aprueba
//      -> Purchase (el valor y los productos se leen de la BD, nunca del navegador)
//
// Secretos requeridos (Supabase > Edge Functions > Secrets):
//   META_CAPI_TOKEN       Token de acceso de la API de Conversiones (NUNCA en el frontend)
//   META_WEBHOOK_SECRET   Cadena aleatoria larga; se envía en la cabecera x-webhook-secret
// Opcionales:
//   META_PIXEL_ID (por defecto 1341230694784299), META_GRAPH_VERSION (v26.0),
//   META_TEST_EVENT_CODE (SOLO para pruebas: quitar en producción),
//   META_ALLOWED_ORIGINS (lista separada por comas), META_SITE_URL.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildUserData, sanitizeFbc, sanitizeFbp } from "./normalize.ts";

// ─── Configuración ───────────────────────────────────────────────────────────
const PIXEL_ID = Deno.env.get("META_PIXEL_ID") ?? "1341230694784299";
const ACCESS_TOKEN = Deno.env.get("META_CAPI_TOKEN") ?? "";
const GRAPH_VERSION = Deno.env.get("META_GRAPH_VERSION") ?? "v26.0";
const TEST_EVENT_CODE = Deno.env.get("META_TEST_EVENT_CODE") ?? "";
const WEBHOOK_SECRET = Deno.env.get("META_WEBHOOK_SECRET") ?? "";
const SITE_URL = Deno.env.get("META_SITE_URL") ?? "https://srxtech.net";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const ALLOWED_ORIGINS = (
  Deno.env.get("META_ALLOWED_ORIGINS") ??
    "https://srxtech.net,https://www.srxtech.net,https://theyafar.github.io,http://localhost:5173,http://127.0.0.1:5173"
)
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

// Eventos que el navegador puede pedir. "Purchase" NO está: solo se envía desde el
// servidor leyendo la orden real, para que nadie pueda inventar compras.
const BROWSER_EVENTS = new Set([
  "PageView",
  "ViewContent",
  "AddToCart",
  "AddToWishlist",
  "InitiateCheckout",
  "AddPaymentInfo",
  "CompleteRegistration",
  "Search",
  "Lead",
]);

// Una orden cuenta como "compra confirmada" al pasar de pendiente a estos estados:
//  - 'paid'       -> pedido al contado con pago aprobado (AdminOrders.handleApproveOrder)
//  - 'processing' -> encargo con pago aprobado (AdminOrders.handleApproveEncargo)
const PAID_STATUSES = ["paid", "processing"];

const ORDER_CONTEXT_MAX_AGE_MS = 30 * 60 * 1000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EVENT_ID_RE = /^[A-Za-z0-9._:-]{8,100}$/;

// ─── Utilidades HTTP ─────────────────────────────────────────────────────────
function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin)
      ? origin
      : ALLOWED_ORIGINS[0] ?? "",
    "Vary": "Origin",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function json(
  body: unknown,
  status: number,
  cors: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function getClientIp(req: Request): string | null {
  const candidate = req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null;
  return candidate && /^[0-9a-fA-F:.]{3,45}$/.test(candidate) ? candidate : null;
}

function getUserAgent(req: Request): string | null {
  const ua = req.headers.get("user-agent");
  return ua ? ua.slice(0, 500) : null;
}

/** Solo acepta URLs de los orígenes permitidos; si no, usa el origen de la petición. */
function safeSourceUrl(url: unknown, origin: string): string {
  try {
    const u = new URL(String(url));
    if (ALLOWED_ORIGINS.includes(u.origin.toLowerCase())) {
      return u.toString().slice(0, 1000);
    }
  } catch {
    // ignorar: se usa el respaldo
  }
  return ALLOWED_ORIGINS.includes(origin) ? origin : SITE_URL;
}

// ─── Saneamiento de custom_data ──────────────────────────────────────────────
const isNum = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

function sanitizeCustomData(input: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!input || typeof input !== "object") return out;
  const cd = input as Record<string, unknown>;

  if (isNum(cd.value)) out.value = Math.round(cd.value * 100) / 100;
  if (typeof cd.currency === "string" && /^[A-Za-z]{3}$/.test(cd.currency)) {
    out.currency = cd.currency.toUpperCase();
  }
  if (out.value !== undefined && out.currency === undefined) out.currency = "USD";

  for (const k of ["content_name", "content_category", "content_type", "status", "search_string"]) {
    if (typeof cd[k] === "string") out[k] = (cd[k] as string).slice(0, 200);
  }
  if (Array.isArray(cd.content_ids)) {
    out.content_ids = cd.content_ids.slice(0, 50).map((x) => String(x).slice(0, 100));
  }
  if (Array.isArray(cd.contents)) {
    out.contents = cd.contents
      .slice(0, 50)
      .map((c) => {
        const item = (c ?? {}) as Record<string, unknown>;
        return {
          id: String(item.id ?? "").slice(0, 100),
          quantity: isNum(item.quantity) ? Math.max(1, Math.trunc(item.quantity)) : 1,
          item_price: isNum(item.item_price) ? Math.round(item.item_price * 100) / 100 : 0,
        };
      })
      .filter((c) => c.id);
  }
  if (isNum(cd.num_items)) out.num_items = Math.max(0, Math.trunc(cd.num_items));
  return out;
}

// ─── Envío a Meta ────────────────────────────────────────────────────────────
class MetaError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function sendToMeta(events: unknown[]): Promise<Record<string, unknown>> {
  if (!ACCESS_TOKEN) {
    throw new MetaError("META_CAPI_TOKEN no está configurado en los secretos.", 500);
  }

  const payload: Record<string, unknown> = {
    data: events,
    access_token: ACCESS_TOKEN,
  };
  if (TEST_EVENT_CODE) payload.test_event_code = TEST_EVENT_CODE;

  const res = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${PIXEL_ID}/events`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );

  const text = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(text);
  } catch {
    // respuesta no JSON
  }

  if (!res.ok) {
    console.error(
      "[meta-capi] Meta rechazó la petición",
      res.status,
      JSON.stringify(data.error ?? text).slice(0, 500),
    );
    throw new MetaError("Meta rechazó la petición.", 502);
  }

  console.log("[meta-capi] OK", {
    events: events.length,
    events_received: data.events_received,
    fbtrace_id: data.fbtrace_id,
    test_mode: Boolean(TEST_EVENT_CODE),
  });
  return data;
}

// ─── Acceso a la base de datos (service role) ────────────────────────────────
function getSupabase() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new MetaError("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.", 500);
  }
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

interface OrderItemRow {
  product_id: string;
  quantity: number | string | null;
  price_at_purchase_usd: number | string | null;
}

interface PurchaseContent {
  id: string;
  quantity: number;
  item_price: number;
}

interface OrderContext {
  fbp?: string | null;
  fbc?: string | null;
  ip?: string | null;
  ua?: string | null;
  url?: string | null;
  at?: string;
}

/**
 * Envía el Purchase de una orden. Es idempotente: reclama la orden de forma atómica
 * poniendo meta_purchase_sent_at; si otra ejecución ya la reclamó, no hace nada.
 */
async function sendPurchaseForOrder(orderId: string): Promise<Record<string, unknown>> {
  const sb = getSupabase();

  const { data: order, error } = await sb
    .from("orders")
    .update({ meta_purchase_sent_at: new Date().toISOString() })
    .eq("id", orderId)
    .is("meta_purchase_sent_at", null)
    .select("id, user_id, user_email, user_phone, user_name, total_amount_usd, meta_context")
    .maybeSingle();

  if (error) throw new MetaError(`No se pudo reclamar la orden: ${error.message}`, 500);
  if (!order) return { skipped: "purchase_already_sent_or_order_not_found" };

  try {
    const { data: items, error: itemsError } = await sb
      .from("order_items")
      .select("product_id, quantity, price_at_purchase_usd")
      .eq("order_id", orderId);
    if (itemsError) throw new MetaError(`No se pudieron leer los productos: ${itemsError.message}`, 500);

    const rows: OrderItemRow[] = items ?? [];
    const contents: PurchaseContent[] = rows.map((it: OrderItemRow) => ({
      id: String(it.product_id),
      quantity: Number(it.quantity) || 1,
      item_price: Number(it.price_at_purchase_usd) || 0,
    }));

    const ctx = (order.meta_context ?? {}) as OrderContext;
    const userData = await buildUserData(
      {
        email: order.user_email,
        phone: order.user_phone,
        name: order.user_name,
        external_id: order.user_id,
        fbp: ctx.fbp,
        fbc: ctx.fbc,
      },
      { ip: ctx.ip, userAgent: ctx.ua },
    );

    // Para eventos "website" Meta exige client_user_agent. Si la orden no tiene
    // contexto del navegador (p. ej. pedidos anteriores a esta integración), se
    // envía como "other" para que no sea rechazado.
    const isWeb = Boolean(ctx.ua);

    const event: Record<string, unknown> = {
      event_name: "Purchase",
      event_time: Math.floor(Date.now() / 1000),
      event_id: `purchase_${orderId}`, // igual que el del Pixel del navegador -> deduplicación
      action_source: isWeb ? "website" : "other",
      user_data: userData,
      custom_data: {
        currency: "USD",
        value: Number(order.total_amount_usd) || 0,
        content_type: "product",
        content_ids: contents.map((c: PurchaseContent) => c.id),
        contents,
        num_items: contents.reduce((n: number, c: PurchaseContent) => n + c.quantity, 0),
        order_id: orderId,
      },
    };
    if (isWeb) event.event_source_url = ctx.url || SITE_URL;

    const result = await sendToMeta([event]);
    return { sent: true, events_received: result.events_received };
  } catch (err) {
    // Liberar la reclamación para poder reintentar (p. ej. re-guardando el estado).
    await sb.from("orders").update({ meta_purchase_sent_at: null }).eq("id", orderId);
    throw err;
  }
}

// ─── Manejadores ─────────────────────────────────────────────────────────────
// deno-lint-ignore no-explicit-any
async function handleWebhook(req: Request, body: any, cors: Record<string, string>) {
  if (!WEBHOOK_SECRET) {
    return json({ error: "META_WEBHOOK_SECRET no configurado." }, 500, cors);
  }
  const provided = req.headers.get("x-webhook-secret") ?? "";
  if (!timingSafeEqual(provided, WEBHOOK_SECRET)) {
    return json({ error: "No autorizado." }, 401, cors);
  }

  if (body.table !== "orders" || body.type !== "UPDATE") {
    return json({ skipped: "not_an_orders_update" }, 200, cors);
  }

  const record = body.record ?? {};
  const previous = body.old_record ?? {};
  const becamePaid = PAID_STATUSES.includes(record.status) &&
    !PAID_STATUSES.includes(previous.status);

  if (!becamePaid || !UUID_RE.test(String(record.id))) {
    return json({ skipped: "status_not_confirmed_payment" }, 200, cors);
  }

  const result = await sendPurchaseForOrder(record.id);
  return json({ ok: true, ...result }, 200, cors);
}

// deno-lint-ignore no-explicit-any
async function handleBrowserEvent(req: Request, body: any, origin: string, cors: Record<string, string>) {
  const eventName = String(body.event_name ?? "");
  if (!BROWSER_EVENTS.has(eventName)) {
    return json({ error: "event_name no permitido." }, 400, cors);
  }
  const eventId = String(body.event_id ?? "");
  if (!EVENT_ID_RE.test(eventId)) {
    return json({ error: "event_id inválido (8-100 caracteres: letras, números . _ : -)." }, 400, cors);
  }

  const userData = await buildUserData(body.user_data ?? {}, {
    ip: getClientIp(req),
    userAgent: getUserAgent(req),
  });

  const event = {
    event_name: eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    action_source: "website",
    event_source_url: safeSourceUrl(body.event_source_url, origin),
    user_data: userData,
    custom_data: sanitizeCustomData(body.custom_data),
  };

  const result = await sendToMeta([event]);
  return json({ ok: true, events_received: result.events_received }, 200, cors);
}

// deno-lint-ignore no-explicit-any
async function handleOrderContext(req: Request, body: any, origin: string, cors: Record<string, string>) {
  const orderId = String(body.order_id ?? "");
  if (!UUID_RE.test(orderId)) {
    return json({ error: "order_id inválido." }, 400, cors);
  }

  const sb = getSupabase();
  const { data: order, error } = await sb
    .from("orders")
    .select("id, status, created_at, meta_context")
    .eq("id", orderId)
    .maybeSingle();

  if (error) return json({ error: "No se pudo leer la orden." }, 500, cors);
  if (!order) return json({ error: "Orden no encontrada." }, 404, cors);

  // Escritura única y solo poco después de crear la orden.
  if (order.meta_context) return json({ ok: true, skipped: "context_exists" }, 200, cors);
  const age = Date.now() - new Date(order.created_at).getTime();
  if (!(age >= 0 && age <= ORDER_CONTEXT_MAX_AGE_MS)) {
    return json({ error: "La orden es demasiado antigua para guardar contexto." }, 403, cors);
  }

  const context: OrderContext = {
    fbp: sanitizeFbp(body.fbp),
    fbc: sanitizeFbc(body.fbc),
    ip: getClientIp(req),
    ua: getUserAgent(req),
    url: safeSourceUrl(body.event_source_url, origin),
    at: new Date().toISOString(),
  };

  const { error: updateError } = await sb
    .from("orders")
    .update({ meta_context: context })
    .eq("id", orderId)
    .is("meta_context", null);
  if (updateError) return json({ error: "No se pudo guardar el contexto." }, 500, cors);

  // Pedidos que nacen ya pagados (p. ej. tarjeta): el Purchase sale aquí, cuando ya
  // tenemos el contexto. Los demás lo enviará el webhook al aprobarse el pago.
  if (PAID_STATUSES.includes(order.status)) {
    const result = await sendPurchaseForOrder(orderId);
    return json({ ok: true, context_saved: true, purchase: result }, 200, cors);
  }
  return json({ ok: true, context_saved: true }, 200, cors);
}

// ─── Servidor ────────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  const origin = (req.headers.get("origin") ?? "").toLowerCase();
  const cors = corsHeaders(origin);

  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método no permitido." }, 405, cors);

  try {
    const raw = await req.text();
    if (raw.length > 20_000) return json({ error: "Cuerpo demasiado grande." }, 413, cors);

    // deno-lint-ignore no-explicit-any
    let body: any;
    try {
      body = JSON.parse(raw);
    } catch {
      return json({ error: "JSON inválido." }, 400, cors);
    }
    if (!body || typeof body !== "object") {
      return json({ error: "Cuerpo inválido." }, 400, cors);
    }

    // Webhook de base de datos (servidor a servidor, protegido con secreto).
    if ("table" in body && "record" in body) return await handleWebhook(req, body, cors);

    // A partir de aquí solo se aceptan peticiones desde el sitio web.
    if (!ALLOWED_ORIGINS.includes(origin)) {
      return json({ error: "Origen no permitido." }, 403, cors);
    }

    switch (body.action) {
      case "event":
        return await handleBrowserEvent(req, body, origin, cors);
      case "order_context":
        return await handleOrderContext(req, body, origin, cors);
      default:
        return json({ error: "action no reconocida." }, 400, cors);
    }
  } catch (err) {
    const status = err instanceof MetaError ? err.status : 500;
    const message = err instanceof Error ? err.message : "Error interno.";
    console.error("[meta-capi] Error:", message);
    return json({ error: message }, status, cors);
  }
});
