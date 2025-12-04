import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SecurityNotificationRequest {
  event_type: "password_changed" | "profile_updated" | "2fa_enabled" | "2fa_disabled" | "session_revoked";
  user_email: string;
  user_name?: string;
  details?: Record<string, unknown>;
}

const getEmailContent = (event_type: string, user_name: string, details?: Record<string, unknown>) => {
  const name = user_name || "User";
  
  switch (event_type) {
    case "password_changed":
      return {
        subject: "🔐 Password Changed - Shipper Security Alert",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1e40af; margin-bottom: 20px;">Password Changed</h1>
            <p>Hello ${name},</p>
            <p>Your password was successfully changed on ${new Date().toLocaleString()}.</p>
            <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 12px; margin: 20px 0;">
              <strong style="color: #dc2626;">⚠️ Not you?</strong>
              <p style="margin: 8px 0 0 0; color: #7f1d1d;">If you didn't make this change, please contact support immediately and reset your password.</p>
            </div>
            <p>Best regards,<br>The Shipper Team</p>
          </div>
        `,
      };
    
    case "profile_updated":
      return {
        subject: "✅ Profile Updated - Shipper",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1e40af; margin-bottom: 20px;">Profile Updated</h1>
            <p>Hello ${name},</p>
            <p>Your profile was updated on ${new Date().toLocaleString()}.</p>
            ${details?.updated_fields ? `<p><strong>Updated fields:</strong> ${(details.updated_fields as string[]).join(", ")}</p>` : ""}
            <p>If you didn't make this change, please review your account settings.</p>
            <p>Best regards,<br>The Shipper Team</p>
          </div>
        `,
      };
    
    case "2fa_enabled":
      return {
        subject: "🛡️ Two-Factor Authentication Enabled - Shipper Security",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #16a34a; margin-bottom: 20px;">2FA Enabled</h1>
            <p>Hello ${name},</p>
            <p>Two-factor authentication has been enabled on your account. Your account is now more secure!</p>
            <p>From now on, you'll need both your password and a code from your authenticator app to log in.</p>
            <p>Best regards,<br>The Shipper Team</p>
          </div>
        `,
      };
    
    case "2fa_disabled":
      return {
        subject: "⚠️ Two-Factor Authentication Disabled - Shipper Security Alert",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #d97706; margin-bottom: 20px;">2FA Disabled</h1>
            <p>Hello ${name},</p>
            <p>Two-factor authentication has been disabled on your account on ${new Date().toLocaleString()}.</p>
            <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 12px; margin: 20px 0;">
              <strong style="color: #dc2626;">⚠️ Not you?</strong>
              <p style="margin: 8px 0 0 0; color: #7f1d1d;">If you didn't make this change, please secure your account immediately.</p>
            </div>
            <p>Best regards,<br>The Shipper Team</p>
          </div>
        `,
      };
    
    case "session_revoked":
      return {
        subject: "🔒 Session Revoked - Shipper Security",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1e40af; margin-bottom: 20px;">Session Revoked</h1>
            <p>Hello ${name},</p>
            <p>A session was revoked from your account on ${new Date().toLocaleString()}.</p>
            <p>If you didn't make this change, please review your active sessions and change your password.</p>
            <p>Best regards,<br>The Shipper Team</p>
          </div>
        `,
      };
    
    default:
      return {
        subject: "Security Notification - Shipper",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1e40af; margin-bottom: 20px;">Security Notification</h1>
            <p>Hello ${name},</p>
            <p>A security-related action was performed on your account.</p>
            <p>Best regards,<br>The Shipper Team</p>
          </div>
        `,
      };
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("Missing authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client to verify user
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("User verification failed:", userError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { event_type, user_email, user_name, details }: SecurityNotificationRequest = await req.json();

    // Validate that the email matches the authenticated user
    if (user_email !== user.email) {
      console.error("Email mismatch - attempted to send to different user");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending security notification: ${event_type} to ${user_email}`);

    const emailContent = getEmailContent(event_type, user_name || "", details);

    const emailResponse = await resend.emails.send({
      from: "Shipper Security <onboarding@resend.dev>",
      to: [user_email],
      subject: emailContent.subject,
      html: emailContent.html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, data: emailResponse }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in send-security-notification:", error);
    const err = error as { message?: string };
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
