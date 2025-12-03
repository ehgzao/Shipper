import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UserSecurityAlertRequest {
  alert_type: "account_locked" | "suspicious_login" | "new_device_login" | "password_changed" | "2fa_enabled" | "2fa_disabled";
  user_email: string;
  user_name?: string;
  details?: Record<string, unknown>;
}

const getAlertEmailContent = (
  alert_type: string, 
  user_name: string | undefined,
  details?: Record<string, unknown>
) => {
  const timestamp = new Date().toLocaleString();
  const displayName = user_name || "User";
  
  switch (alert_type) {
    case "account_locked":
      return {
        subject: "🔒 Your Shipper Account Has Been Locked",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #dc2626; margin-bottom: 20px;">Account Temporarily Locked</h1>
            <p>Hi ${displayName},</p>
            <p>Your Shipper account has been temporarily locked due to multiple failed login attempts.</p>
            <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Time:</strong> ${timestamp}</p>
              ${details?.ip_address ? `<p style="margin: 8px 0 0 0;"><strong>IP Address:</strong> ${details.ip_address}</p>` : ""}
              ${details?.location ? `<p style="margin: 8px 0 0 0;"><strong>Location:</strong> ${details.location}</p>` : ""}
            </div>
            <p><strong>What to do:</strong></p>
            <ul>
              <li>Wait 15 minutes and try logging in again</li>
              <li>If you didn't attempt these logins, consider changing your password</li>
              <li>Contact support if you continue having issues</li>
            </ul>
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              If you didn't attempt these logins, someone may be trying to access your account. 
              We recommend enabling two-factor authentication for additional security.
            </p>
          </div>
        `,
      };
    
    case "suspicious_login":
      return {
        subject: "⚠️ Suspicious Login Attempt on Your Shipper Account",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #d97706; margin-bottom: 20px;">Suspicious Login Attempt Detected</h1>
            <p>Hi ${displayName},</p>
            <p>We detected a suspicious login attempt on your Shipper account.</p>
            <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Time:</strong> ${timestamp}</p>
              ${details?.ip_address ? `<p style="margin: 8px 0 0 0;"><strong>IP Address:</strong> ${details.ip_address}</p>` : ""}
              ${details?.location ? `<p style="margin: 8px 0 0 0;"><strong>Location:</strong> ${details.location}</p>` : ""}
              ${details?.device ? `<p style="margin: 8px 0 0 0;"><strong>Device:</strong> ${details.device}</p>` : ""}
              ${details?.reason ? `<p style="margin: 8px 0 0 0;"><strong>Reason:</strong> ${details.reason}</p>` : ""}
            </div>
            <p><strong>If this was you:</strong> No action needed.</p>
            <p><strong>If this wasn't you:</strong></p>
            <ul>
              <li>Change your password immediately</li>
              <li>Enable two-factor authentication</li>
              <li>Review your account activity</li>
            </ul>
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              This is an automated security alert from Shipper.
            </p>
          </div>
        `,
      };
    
    case "new_device_login":
      return {
        subject: "🔔 New Device Login to Your Shipper Account",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1e40af; margin-bottom: 20px;">New Device Login Detected</h1>
            <p>Hi ${displayName},</p>
            <p>Your Shipper account was just accessed from a new device.</p>
            <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Time:</strong> ${timestamp}</p>
              ${details?.device ? `<p style="margin: 8px 0 0 0;"><strong>Device:</strong> ${details.device}</p>` : ""}
              ${details?.ip_address ? `<p style="margin: 8px 0 0 0;"><strong>IP Address:</strong> ${details.ip_address}</p>` : ""}
              ${details?.location ? `<p style="margin: 8px 0 0 0;"><strong>Location:</strong> ${details.location}</p>` : ""}
            </div>
            <p><strong>If this was you:</strong> You can safely ignore this email.</p>
            <p><strong>If this wasn't you:</strong> Change your password immediately and contact support.</p>
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              This is an automated security alert from Shipper.
            </p>
          </div>
        `,
      };
    
    case "password_changed":
      return {
        subject: "✅ Your Shipper Password Was Changed",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #16a34a; margin-bottom: 20px;">Password Changed Successfully</h1>
            <p>Hi ${displayName},</p>
            <p>Your Shipper account password was successfully changed.</p>
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Time:</strong> ${timestamp}</p>
              ${details?.ip_address ? `<p style="margin: 8px 0 0 0;"><strong>IP Address:</strong> ${details.ip_address}</p>` : ""}
            </div>
            <p><strong>If you didn't make this change:</strong></p>
            <ul>
              <li>Contact support immediately</li>
              <li>Try to reset your password</li>
              <li>Check your email account for unauthorized access</li>
            </ul>
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              This is an automated security alert from Shipper.
            </p>
          </div>
        `,
      };
    
    case "2fa_enabled":
      return {
        subject: "🔐 Two-Factor Authentication Enabled on Your Shipper Account",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #16a34a; margin-bottom: 20px;">2FA Successfully Enabled</h1>
            <p>Hi ${displayName},</p>
            <p>Two-factor authentication has been successfully enabled on your Shipper account.</p>
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Time:</strong> ${timestamp}</p>
            </div>
            <p>Your account is now more secure! You'll need to enter a verification code from your authenticator app when signing in.</p>
            <p><strong>Important:</strong> Make sure to save your backup codes in a safe place.</p>
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              If you didn't make this change, contact support immediately.
            </p>
          </div>
        `,
      };
    
    case "2fa_disabled":
      return {
        subject: "⚠️ Two-Factor Authentication Disabled on Your Shipper Account",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #d97706; margin-bottom: 20px;">2FA Has Been Disabled</h1>
            <p>Hi ${displayName},</p>
            <p>Two-factor authentication has been disabled on your Shipper account.</p>
            <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Time:</strong> ${timestamp}</p>
            </div>
            <p><strong>Your account is now less secure.</strong> We recommend keeping 2FA enabled to protect your account.</p>
            <p><strong>If you didn't make this change:</strong></p>
            <ul>
              <li>Change your password immediately</li>
              <li>Re-enable two-factor authentication</li>
              <li>Contact support if you need assistance</li>
            </ul>
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              This is an automated security alert from Shipper.
            </p>
          </div>
        `,
      };
    
    default:
      return {
        subject: "Security Alert - Shipper",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1e40af; margin-bottom: 20px;">Security Alert</h1>
            <p>Hi ${displayName},</p>
            <p>A security event occurred on your Shipper account at ${timestamp}.</p>
            <p style="color: #6b7280; font-size: 14px;">This is an automated security alert from Shipper.</p>
          </div>
        `,
      };
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { alert_type, user_email, user_name, details }: UserSecurityAlertRequest = await req.json();
    
    console.log(`Processing user security alert: ${alert_type} for ${user_email}`);

    if (!user_email) {
      throw new Error("User email is required");
    }

    const emailContent = getAlertEmailContent(alert_type, user_name, details);

    console.log(`Sending security alert to user: ${user_email}`);

    const emailResponse = await resend.emails.send({
      from: "Shipper Security <onboarding@resend.dev>",
      to: [user_email],
      subject: emailContent.subject,
      html: emailContent.html,
    });

    console.log("User security alert email sent:", emailResponse);

    // Log the alert
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    await supabaseAdmin.rpc('create_audit_log', {
      p_user_id: null,
      p_action: `user_security_alert_${alert_type}`,
      p_details: { user_email, ...details }
    });

    return new Response(
      JSON.stringify({ success: true, data: emailResponse }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-user-security-alert:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
