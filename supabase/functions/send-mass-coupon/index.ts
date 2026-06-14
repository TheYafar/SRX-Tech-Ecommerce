// supabase/functions/send-mass-coupon/index.ts
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import { Resend } from "https://esm.sh/resend";

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

      if (!listaCorreos || !Array.isArray(listaCorreos) || listaCorreos.length === 0) {
        return new Response(
          JSON.stringify({ error: "Falta la lista de correos o es inválida." }),
          { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
      }

      if (!codigo || !porcentaje) {
        return new Response(
          JSON.stringify({ error: "Faltan datos del cupón (codigo o porcentaje)." }),
          { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
      }

      // Obtener de forma dinámica y segura el API Key de Resend desde el entorno global de Deno
      const apiKey = Deno.env.get("VITE_RESEND_API_KEY");
      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: "Falta la variable de entorno VITE_RESEND_API_KEY en la nube de Supabase." }),
          { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
      }

      // Inicialización de la librería de Resend llamando a la variable de entorno de forma dinámica
      const resend = new Resend(Deno.env.get("VITE_RESEND_API_KEY"));
      console.log(`📧 [send-mass-coupon] Enviando cupón ${codigo} (${porcentaje}%) a ${listaCorreos.length} destinatarios...`);

      // Enviar correos de forma individual y asíncrona a todos los destinatarios
      const sendPromises = listaCorreos.map(async (email: string) => {
        try {
          const { data, error } = await resend.emails.send({
            from: "SRX Tech <diego@srxtech.com>",
            to: [email],
            subject: "¡Tu código de descuento exclusivo en SRX Tech está listo! 🎉",
            html: `
              <div style="background-color: #0f172a; color: #ffffff; padding: 30px; font-family: sans-serif; border-radius: 8px; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #38bdf8; text-align: center;">¡Gracias por ser parte de SRX Tech!</h2>
                <p style="font-size: 16px; line-height: 1.6; text-align: center;">Aquí tienes tu cupón exclusivo para que expandas tu set de herramientas audiovisuales.</p>
                <div style="background-color: #1e293b; border: 2px dashed #38bdf8; padding: 20px; text-align: center; margin: 25px 0; border-radius: 6px;">
                  <span style="font-size: 28px; font-weight: bold; letter-spacing: 2px; color: #fbbf24;">${codigo}</span>
                  <br/>
                  <span style="font-size: 14px; color: #94a3b8;">Obtén un ${porcentaje}% de descuento en tu próxima compra</span>
                </div>
                <p style="font-size: 12px; color: #64748b; text-align: center;">Este cupón es de uso único y temporal. No acumulable con otras promociones.</p>
              </div>
            `,
          });
          
          if (error) {
            console.error(`❌ Error al enviar correo a ${email}:`, error);
            return { email, success: false, error };
          }
          return { email, success: true, id: data?.id };
        } catch (err) {
          console.error(`❌ Excepción al enviar correo a ${email}:`, err);
          return { email, success: false, error: err.message || err };
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
      return new Response(
        JSON.stringify({ error: error.message || error }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }
  }),
};
