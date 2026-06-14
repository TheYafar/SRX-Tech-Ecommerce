// supabase/functions/send-notification/index.ts
// SRX Tech - Automated Email Notification Service
// Powered by Resend API + Supabase Edge Functions (Deno)

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── CORS Headers ────────────────────────────────────────────────────────────
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: Record<string, unknown>;
  old_record: Record<string, unknown> | null;
}

interface CustomerProfile {
  email: string;
  full_name: string;
}

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

// ─── Email Template Builder ───────────────────────────────────────────────────
function buildEmailHTML(params: {
  fullName: string;
  title: string;
  subtitle: string;
  bodyText: string;
  ctaLabel: string;
  ctaHref: string;
  accentColor: string;
  iconEmoji: string;
}): string {
  const {
    fullName,
    title,
    subtitle,
    bodyText,
    ctaLabel,
    ctaHref,
    accentColor,
    iconEmoji,
  } = params;

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="
  margin: 0;
  padding: 0;
  background-color: #0a0f1e;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
">

  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0"
    style="background-color: #0a0f1e; padding: 48px 16px;">
    <tr>
      <td align="center">

        <!-- Card -->
        <table width="600" cellpadding="0" cellspacing="0" border="0"
          style="
            max-width: 600px;
            width: 100%;
            background: linear-gradient(145deg, #1e293b 0%, #0f172a 100%);
            border-radius: 20px;
            border: 1px solid rgba(148, 163, 184, 0.12);
            overflow: hidden;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
          ">

          <!-- Header accent bar -->
          <tr>
            <td style="
              height: 4px;
              background: linear-gradient(90deg, ${accentColor} 0%, #818cf8 50%, ${accentColor} 100%);
            "></td>
          </tr>

          <!-- Logo & Brand -->
          <tr>
            <td align="center" style="padding: 40px 48px 24px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <div style="
                      display: inline-block;
                      background: linear-gradient(135deg, ${accentColor}22, #818cf822);
                      border: 1px solid ${accentColor}44;
                      border-radius: 16px;
                      padding: 14px 28px;
                    ">
                      <span style="
                        font-size: 22px;
                        font-weight: 800;
                        letter-spacing: -0.5px;
                        color: #f1f5f9;
                      ">
                        ⚡ SRX <span style="color: ${accentColor};">Tech</span>
                      </span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Icon Badge -->
          <tr>
            <td align="center" style="padding: 0 48px 24px;">
              <div style="
                width: 72px;
                height: 72px;
                border-radius: 50%;
                background: linear-gradient(135deg, ${accentColor}33, #818cf833);
                border: 2px solid ${accentColor}55;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto;
                font-size: 36px;
                line-height: 72px;
                text-align: center;
              ">${iconEmoji}</div>
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td align="center" style="padding: 0 48px 8px;">
              <h1 style="
                margin: 0;
                font-size: 28px;
                font-weight: 700;
                color: #f1f5f9;
                letter-spacing: -0.5px;
                line-height: 1.3;
                text-align: center;
              ">${title}</h1>
            </td>
          </tr>

          <!-- Subtitle -->
          <tr>
            <td align="center" style="padding: 0 48px 32px;">
              <p style="
                margin: 8px 0 0;
                font-size: 15px;
                color: ${accentColor};
                font-weight: 500;
                text-align: center;
                letter-spacing: 0.3px;
              ">${subtitle}</p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 48px;">
              <div style="
                height: 1px;
                background: linear-gradient(90deg, transparent, rgba(148,163,184,0.2), transparent);
              "></div>
            </td>
          </tr>

          <!-- Greeting & Body -->
          <tr>
            <td style="padding: 32px 48px;">
              <p style="
                margin: 0 0 16px;
                font-size: 16px;
                color: #94a3b8;
                line-height: 1.7;
              ">
                Hola, <strong style="color: #e2e8f0;">${fullName}</strong> 👋
              </p>
              <p style="
                margin: 0;
                font-size: 15px;
                color: #94a3b8;
                line-height: 1.8;
              ">${bodyText}</p>
            </td>
          </tr>

          <!-- Info Box -->
          <tr>
            <td style="padding: 0 48px 32px;">
              <div style="
                background: rgba(148, 163, 184, 0.06);
                border: 1px solid rgba(148, 163, 184, 0.1);
                border-left: 3px solid ${accentColor};
                border-radius: 10px;
                padding: 16px 20px;
              ">
                <p style="
                  margin: 0;
                  font-size: 13px;
                  color: #64748b;
                  line-height: 1.6;
                ">
                  Este mensaje fue generado automáticamente por el sistema de SRX Tech.
                  Si tienes dudas, contáctanos en
                  <a href="mailto:soporte@srxtech.com"
                    style="color: ${accentColor}; text-decoration: none;">soporte@srxtech.com</a>
                </p>
              </div>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding: 0 48px 48px;">
              <a href="${ctaHref}"
                style="
                  display: inline-block;
                  background: linear-gradient(135deg, ${accentColor}, #818cf8);
                  color: #ffffff;
                  text-decoration: none;
                  font-size: 15px;
                  font-weight: 600;
                  letter-spacing: 0.3px;
                  padding: 14px 36px;
                  border-radius: 50px;
                  box-shadow: 0 8px 24px ${accentColor}44;
                  transition: opacity 0.2s;
                ">
                ${ctaLabel} →
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="
              background: rgba(0, 0, 0, 0.3);
              padding: 20px 48px;
              border-top: 1px solid rgba(148, 163, 184, 0.08);
            ">
              <p style="
                margin: 0;
                font-size: 12px;
                color: #334155;
                text-align: center;
                line-height: 1.6;
              ">
                © ${new Date().getFullYear()} SRX Tech. Todos los derechos reservados.<br/>
                Recibes este correo porque tienes una cuenta activa en
                <a href="https://srxtech.com" style="color: #475569; text-decoration: none;">srxtech.com</a>
              </p>
            </td>
          </tr>

          <!-- Bottom accent bar -->
          <tr>
            <td style="
              height: 3px;
              background: linear-gradient(90deg, transparent, ${accentColor}66, transparent);
            "></td>
          </tr>

        </table>
        <!-- /Card -->

      </td>
    </tr>
  </table>

</body>
</html>
  `.trim();
}

// ─── Build Email for Payment Completed ───────────────────────────────────────
function buildPaymentEmail(fullName: string): EmailPayload {
  return {
    to: "", // filled by caller
    subject: "✓ ¡Tu pago ha sido verificado con éxito! - SRX Tech",
    html: buildEmailHTML({
      fullName,
      title: "¡Pago Verificado!",
      subtitle: "Tu transacción fue procesada exitosamente",
      bodyText: `Tu pago ha sido <strong style="color: #4ade80;">verificado y confirmado</strong> por nuestro equipo.
        Tu pedido está siendo preparado y pronto recibirás una notificación con el seguimiento de tu envío.
        Gracias por confiar en <strong style="color: #e2e8f0;">SRX Tech</strong> para tu compra.`,
      ctaLabel: "Ver mis pedidos",
      ctaHref: "https://srxtech.com/profile",
      accentColor: "#4ade80",
      iconEmoji: "✅",
    }),
  };
}

// ─── Build Email for Order Shipped ───────────────────────────────────────────
function buildShippingEmail(fullName: string): EmailPayload {
  return {
    to: "", // filled by caller
    subject: "🚚 ¡Tu pedido va en camino! - SRX Tech",
    html: buildEmailHTML({
      fullName,
      title: "¡Tu pedido está en camino!",
      subtitle: "El paquete fue despachado y está viajando hacia ti",
      bodyText: `Excelente noticia, tu pedido ha sido <strong style="color: #60a5fa;">despachado</strong> y ya está en manos del servicio de mensajería.
        En los próximos días recibirás tu compra en la dirección registrada.
        Puedes rastrear el estado en tiempo real desde tu perfil en <strong style="color: #e2e8f0;">SRX Tech</strong>.`,
      ctaLabel: "Rastrear pedido",
      ctaHref: "https://srxtech.com/profile",
      accentColor: "#60a5fa",
      iconEmoji: "🚚",
    }),
  };
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    // ── 1. Validate environment secrets ──────────────────────────────────────
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("Missing environment variable: RESEND_API_KEY");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error(
        "Missing environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
      );
    }

    // ── 2. Parse webhook payload ──────────────────────────────────────────────
    const payload: WebhookPayload = await req.json();

    const { type, table, schema, record, old_record } = payload;

    // Only process UPDATE events in the public schema
    if (type !== "UPDATE" || schema !== "public") {
      return new Response(
        JSON.stringify({ message: "Event ignored: not a public schema UPDATE" }),
        {
          status: 200,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // ── 3. Determine which table triggered the event and validate state ───────
    let emailBuilder: ((fullName: string) => EmailPayload) | null = null;
    let userId: string | null = null;

    const newStatus = record["status"] as string | undefined;
    const oldStatus = old_record?.["status"] as string | undefined;

    if (table === "payments") {
      // Only fire on transition → 'completed'
      if (newStatus === "completed" && oldStatus !== "completed") {
        emailBuilder = buildPaymentEmail;
        userId = record["user_id"] as string;
      }
    } else if (table === "orders") {
      // Only fire on transition → 'shipped'
      if (newStatus === "shipped" && oldStatus !== "shipped") {
        emailBuilder = buildShippingEmail;
        userId = record["user_id"] as string;
      }
    }

    // No relevant state transition – exit cleanly
    if (!emailBuilder || !userId) {
      return new Response(
        JSON.stringify({
          message: `No action needed for table '${table}' with status '${newStatus}'`,
        }),
        {
          status: 200,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    // ── 4. Determine customer name and email (with guest fallback) ────────────
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let customerEmail: string | null = null;
    let customerName = "Cliente";

    if (userId) {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", userId)
        .maybeSingle();

      if (!profileError && profileData) {
        customerEmail = profileData.email;
        customerName = profileData.full_name || "Cliente";
      }
    }

    // Si no obtuvimos email del perfil (invitado o profile inexistente), obtener de la orden
    if (!customerEmail) {
      if (table === "orders") {
        customerEmail = record["user_email"] as string | null;
        customerName = (record["user_name"] as string | null) || "Cliente";
      } else if (table === "payments") {
        const orderId = record["order_id"] as string | null;
        if (orderId) {
          const { data: orderData } = await supabase
            .from("orders")
            .select("user_email, user_name")
            .eq("id", orderId)
            .maybeSingle();
          if (orderData) {
            customerEmail = orderData.user_email;
            customerName = orderData.user_name || "Cliente";
          }
        }
      }
    }

    if (!customerEmail) {
      throw new Error(
        `Failed to resolve customer email for table '${table}' and user_id '${userId}'`
      );
    }

    // ── 5. Build the email payload ─────────────────────────────────────────────
    const emailPayload = emailBuilder(customerName);
    emailPayload.to = customerEmail;

    // ── 6. Send via Resend API ─────────────────────────────────────────────────
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "SRX Tech <notificaciones@srxtech.com>",
        to: [emailPayload.to],
        subject: emailPayload.subject,
        html: emailPayload.html,
      }),
    });

    if (!resendResponse.ok) {
      const resendError = await resendResponse.text();
      throw new Error(
        `Resend API error (${resendResponse.status}): ${resendError}`
      );
    }

    const resendData = await resendResponse.json();

    console.log(
      `[send-notification] ✅ Email sent to ${customer.email} | Resend ID: ${resendData.id}`
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: `Email sent to ${customer.email}`,
        resend_id: resendData.id,
        table,
        trigger_status: newStatus,
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    console.error(`[send-notification] ❌ Error: ${errorMessage}`);

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
});
