// supabase/functions/send-mass-coupon/index.ts
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { Resend } from "https://esm.sh/resend";

/**
 * Sanitiza texto para prevenir inyecciones de código HTML/JS dentro del correo.
 */
function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (match) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;'
    };
    return entities[match];
  });
}

export default {
  fetch: withSupabase({ auth: ["publishable", "secret"] }, async (req, ctx) => {
    // Definimos las cabeceras para permitir CORS preflight
    const CORS_HEADERS = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    };

    // Si es una petición OPTIONS (preflight), retornamos 204 inmediatamente
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    try {
      const { listaCorreos, codigo, porcentaje } = await req.json();

      // 1. Validar que la lista de correos no venga vacía y sea un arreglo válido
      if (!listaCorreos || !Array.isArray(listaCorreos) || listaCorreos.length === 0) {
        return new Response(
          JSON.stringify({ error: "La lista de destinatarios (listaCorreos) no puede estar vacía y debe ser un arreglo válido." }),
          { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
      }

      // 2. Validar que el código del cupón sea una cadena de texto válida
      if (!codigo || typeof codigo !== "string" || codigo.trim() === "") {
        return new Response(
          JSON.stringify({ error: "Falta el código del cupón o es inválido." }),
          { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
      }

      // 3. Validar que el porcentaje sea un número entero comprendido estrictamente entre 1 y 100
      const percentNum = Number(porcentaje);
      if (isNaN(percentNum) || !Number.isInteger(percentNum) || percentNum < 1 || percentNum > 100) {
        return new Response(
          JSON.stringify({ error: "El porcentaje de descuento debe ser un número entero estrictamente entre 1 y 100." }),
          { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
      }

      // 4. Sanitizar entradas para prevenir inyecciones HTML en el correo
      const sanitizedCodigo = escapeHtml(codigo.trim().toUpperCase());
      const sanitizedPorcentaje = String(percentNum);

      // Obtener de forma dinámica y segura el API Key de Resend desde el entorno global de Deno
      const apiKey = Deno.env.get("VITE_RESEND_API_KEY");
      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: "Falta la variable de entorno VITE_RESEND_API_KEY en la nube de Supabase." }),
          { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
      }

      // Inicialización de la librería de Resend
      const resend = new Resend(apiKey);
      console.log(`📧 [send-mass-coupon] Enviando cupón ${sanitizedCodigo} (${sanitizedPorcentaje}%) a ${listaCorreos.length} destinatarios...`);

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      // Enviar correos de forma individual y asíncrona a todos los destinatarios
      const sendPromises = listaCorreos.map(async (email: string) => {
        try {
          const cleanEmail = email.trim();
          if (!emailRegex.test(cleanEmail)) {
            return { email, success: false, error: "Formato de correo inválido." };
          }

          const { data, error } = await resend.emails.send({
            from: "SRX Tech <diego@srxtech.com>",
            to: [cleanEmail],
            subject: "¡Tu código de descuento exclusivo en SRX Tech está listo! 🎉",
            html: `
              <div style="background-color: #0f172a; color: #ffffff; padding: 30px; font-family: sans-serif; border-radius: 8px; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #38bdf8; text-align: center;">¡Gracias por ser parte de SRX Tech!</h2>
                <p style="font-size: 16px; line-height: 1.6; text-align: center;">Aquí tienes tu cupón exclusivo para que expandas tu set de herramientas audiovisuales.</p>
                <div style="background-color: #1e293b; border: 2px dashed #38bdf8; padding: 20px; text-align: center; margin: 25px 0; border-radius: 6px;">
                  <span style="font-size: 28px; font-weight: bold; letter-spacing: 2px; color: #fbbf24;">${sanitizedCodigo}</span>
                  <br/>
                  <span style="font-size: 14px; color: #94a3b8;">Obtén un ${sanitizedPorcentaje}% de descuento en tu próxima compra</span>
                </div>
                <p style="font-size: 12px; color: #64748b; text-align: center;">Este cupón es de uso único y temporal. No acumulable con otras promociones.</p>
              </div>
            `,
          });
          
          if (error) {
            console.error(`❌ Error al enviar correo a ${cleanEmail}:`, error);
            return { email, success: false, error };
          }
          return { email, success: true, id: data?.id };
        } catch (err) {
          console.error(`❌ Excepción al enviar correo a ${email}:`, err);
          let itemError = err.message || String(err);
          if (
            itemError.includes("net::") ||
            itemError.includes("DNS") ||
            itemError.includes("fetch") ||
            itemError.includes("network") ||
            itemError.includes("connection")
          ) {
            itemError = "Error de red al conectar con el servidor de correo.";
          }
          return { email, success: false, error: itemError };
        }
      });

      const results = await Promise.all(sendPromises);
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      return new Response(
        JSON.stringify({
          success: true,
          message: `Procesamiento completado. Exitosos: ${successful}, Fallidos: ${failed}`,
          results,
        }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );

    } catch (error) {
      console.error("❌ Error en Edge Function send-mass-coupon:", error);
      let errorMessage = error.message || String(error);
      
      // Detección de problemas de red en Deno Deploy
      if (
        errorMessage.includes("net::") ||
        errorMessage.includes("DNS") ||
        errorMessage.includes("fetch") ||
        errorMessage.includes("network") ||
        errorMessage.includes("connect")
      ) {
        errorMessage = "Error de conectividad de red en el servidor. Por favor, intente de nuevo en unos momentos.";
      }

      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }
  }),
};
