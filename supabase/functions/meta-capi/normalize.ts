// supabase/functions/meta-capi/normalize.ts
// Funciones puras de normalización y hash para la API de Conversiones de Meta.
// Reglas oficiales: https://developers.facebook.com/documentation/ads-commerce/conversions-api/parameters/customer-information-parameters
//
//  - Se hashean con SHA-256 (hex en minúsculas): em, ph, fn, ln, external_id (recomendado).
//  - NO se hashean: client_ip_address, client_user_agent, fbc, fbp.

const DEFAULT_COUNTRY_CODE = "58"; // Venezuela

/** SHA-256 en hexadecimal minúsculas (Web Crypto: disponible en Deno y Node 20+). */
export async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Email: recortar espacios y pasar a minúsculas. Devuelve null si no parece un email. */
export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  if (!v || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return null;
  return v;
}

/**
 * Teléfono: solo dígitos, sin ceros a la izquierda, con código de país.
 *  - "0412-1234567"   -> "584121234567"  (formato local venezolano: empieza en 0)
 *  - "+58 412 1234567" -> "584121234567"
 *  - "4121234567"     -> "584121234567"  (10 dígitos que empiezan por prefijo móvil VE)
 *  - "+1 (305) 555-0100" -> "13055550100" (se respeta si ya trae código de país)
 */
export function normalizePhone(
  value: unknown,
  defaultCountryCode = DEFAULT_COUNTRY_CODE,
): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw) return null;

  const hadPlusOr00 = raw.startsWith("+") || raw.startsWith("00");
  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  if (raw.startsWith("00")) digits = digits.replace(/^00/, "");

  if (!hadPlusOr00 && digits.startsWith("0")) {
    // Formato local (0412..., 0212...): quitar ceros y anteponer el país por defecto.
    digits = defaultCountryCode + digits.replace(/^0+/, "");
  } else if (
    !hadPlusOr00 &&
    digits.length === 10 &&
    /^(41[2246]|42[46]|2\d\d)/.test(digits)
  ) {
    // 10 dígitos con prefijo móvil/fijo venezolano y sin país.
    digits = defaultCountryCode + digits;
  }

  digits = digits.replace(/^0+/, "");
  // Longitud plausible E.164 (con código de país): 8 a 15 dígitos.
  if (digits.length < 8 || digits.length > 15) return null;
  return digits;
}

/** Nombre/apellido: minúsculas, sin puntuación ni espacios (UTF-8 conservado). */
export function normalizeNamePart(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
  return v || null;
}

/** Separa "Juan Carlos Pérez Gómez" -> { fn: "juan", ln: "gomez" } (primer y último token). */
export function splitFullName(
  full: unknown,
): { fn: string | null; ln: string | null } {
  if (typeof full !== "string") return { fn: null, ln: null };
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { fn: null, ln: null };
  const fn = normalizeNamePart(parts[0]);
  const ln = parts.length > 1 ? normalizeNamePart(parts[parts.length - 1]) : null;
  return { fn, ln };
}

/** fbp válido: fb.<subdominio 0-2>.<timestamp>.<aleatorio> (no se hashea). */
export function sanitizeFbp(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return /^fb\.[0-2]\.\d{10,15}\.\d{1,20}$/.test(value) ? value : null;
}

/** fbc válido: fb.<subdominio 0-2>.<timestamp>.<fbclid> (no se hashea; distingue mayúsculas). */
export function sanitizeFbc(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return /^fb\.[0-2]\.\d{10,15}\.[A-Za-z0-9_-]{4,300}$/.test(value) ? value : null;
}

export interface RawUserData {
  email?: unknown;
  phone?: unknown;
  name?: unknown;
  external_id?: unknown;
  fbp?: unknown;
  fbc?: unknown;
}

export interface MetaUserData {
  em?: string[];
  ph?: string[];
  fn?: string[];
  ln?: string[];
  external_id?: string[];
  fbp?: string;
  fbc?: string;
  client_ip_address?: string;
  client_user_agent?: string;
}

/** Construye el objeto user_data final: hashea lo que corresponde y deja intacto el resto. */
export async function buildUserData(
  raw: RawUserData,
  net: { ip?: string | null; userAgent?: string | null },
): Promise<MetaUserData> {
  const out: MetaUserData = {};

  const email = normalizeEmail(raw.email);
  if (email) out.em = [await sha256Hex(email)];

  const phone = normalizePhone(raw.phone);
  if (phone) out.ph = [await sha256Hex(phone)];

  const { fn, ln } = splitFullName(raw.name);
  if (fn) out.fn = [await sha256Hex(fn)];
  if (ln) out.ln = [await sha256Hex(ln)];

  if (typeof raw.external_id === "string" && raw.external_id.trim()) {
    out.external_id = [await sha256Hex(raw.external_id.trim().toLowerCase())];
  }

  const fbp = sanitizeFbp(raw.fbp);
  if (fbp) out.fbp = fbp;
  const fbc = sanitizeFbc(raw.fbc);
  if (fbc) out.fbc = fbc;

  if (net.ip) out.client_ip_address = net.ip;
  if (net.userAgent) out.client_user_agent = net.userAgent;

  return out;
}
