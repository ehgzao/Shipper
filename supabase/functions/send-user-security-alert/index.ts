import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Valid alert types
const VALID_ALERT_TYPES = ["account_locked", "suspicious_login", "new_device_login", "password_changed", "2fa_enabled", "2fa_disabled", "impossible_travel"] as const;
type AlertType = typeof VALID_ALERT_TYPES[number];

interface UserSecurityAlertRequest {
  alert_type: AlertType;
  user_email: string;
  user_name?: string;
  details?: Record<string, unknown>;
}

// Input validation
const validateInput = (body: unknown): { valid: true; data: UserSecurityAlertRequest } | { valid: false; error: string } => {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const { alert_type, user_email, user_name, details } = body as Record<string, unknown>;

  // Validate alert_type
  if (!alert_type || typeof alert_type !== 'string' || !VALID_ALERT_TYPES.includes(alert_type as AlertType)) {
    return { valid: false, error: `Invalid alert_type. Must be one of: ${VALID_ALERT_TYPES.join(', ')}` };
  }

  // Validate user_email
  if (!user_email || typeof user_email !== 'string') {
    return { valid: false, error: 'user_email is required' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(user_email) || user_email.length > 255) {
    return { valid: false, error: 'Invalid email format' };
  }

  // Validate user_name (optional)
  if (user_name !== undefined && (typeof user_name !== 'string' || user_name.length > 100)) {
    return { valid: false, error: 'user_name must be a string with max 100 characters' };
  }

  // Validate details (optional)
  if (details !== undefined && (typeof details !== 'object' || details === null)) {
    return { valid: false, error: 'details must be an object if provided' };
  }

  return {
    valid: true,
    data: {
      alert_type: alert_type as AlertType,
      user_email: user_email.toLowerCase().trim(),
      user_name: user_name as string | undefined,
      details: details as Record<string, unknown> | undefined
    }
  };
};

// HTML escape to prevent injection
const escapeHtml = (str: string): string => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const getAlertEmailContent = (
  alert_type: string, 
  user_name: string | undefined,
  details?: Record<string, unknown>
) => {
  const timestamp = new Date().toLocaleString();
  const displayName = escapeHtml(user_name || "User");
  
  // Sanitize details
  const safeDetails = details ? Object.fromEntries(
    Object.entries(details).map(([k, v]) => [k, typeof v === 'string' ? escapeHtml(v) : v])
  ) : {};
  
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
              ${safeDetails?.ip_address ? `<p style="margin: 8px 0 0 0;"><strong>IP Address:</strong> ${safeDetails.ip_address}</p>` : ""}
              ${safeDetails?.location ? `<p style="margin: 8px 0 0 0;"><strong>Location:</strong> ${safeDetails.location}</p>` : ""}
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
              ${safeDetails?.ip_address ? `<p style="margin: 8px 0 0 0;"><strong>IP Address:</strong> ${safeDetails.ip_address}</p>` : ""}
              ${safeDetails?.location ? `<p style="margin: 8px 0 0 0;"><strong>Location:</strong> ${safeDetails.location}</p>` : ""}
              ${safeDetails?.device ? `<p style="margin: 8px 0 0 0;"><strong>Device:</strong> ${safeDetails.device}</p>` : ""}
              ${safeDetails?.reason ? `<p style="margin: 8px 0 0 0;"><strong>Reason:</strong> ${safeDetails.reason}</p>` : ""}
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
              ${safeDetails?.device ? `<p style="margin: 8px 0 0 0;"><strong>Device:</strong> ${safeDetails.device}</p>` : ""}
              ${safeDetails?.ip_address ? `<p style="margin: 8px 0 0 0;"><strong>IP Address:</strong> ${safeDetails.ip_address}</p>` : ""}
              ${safeDetails?.location ? `<p style="margin: 8px 0 0 0;"><strong>Location:</strong> ${safeDetails.location}</p>` : ""}
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
              ${safeDetails?.ip_address ? `<p style="margin: 8px 0 0 0;"><strong>IP Address:</strong> ${safeDetails.ip_address}</p>` : ""}
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
    
    case "impossible_travel":
      return {
        subject: "🌍 Unusual Login Location Detected - Shipper",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #dc2626; margin-bottom: 20px;">Impossible Travel Detected</h1>
            <p>Hi ${displayName},</p>
            <p>We detected a login to your Shipper account from a location that appears to be geographically impossible given your recent login history.</p>
            <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Time:</strong> ${timestamp}</p>
              ${safeDetails?.current_location ? `<p style="margin: 8px 0 0 0;"><strong>Current Location:</strong> ${safeDetails.current_location}</p>` : ""}
              ${safeDetails?.last_location ? `<p style="margin: 8px 0 0 0;"><strong>Previous Location:</strong> ${safeDetails.last_location}</p>` : ""}
              ${safeDetails?.distance_km ? `<p style="margin: 8px 0 0 0;"><strong>Distance:</strong> ${safeDetails.distance_km} km</p>` : ""}
              ${safeDetails?.time_hours ? `<p style="margin: 8px 0 0 0;"><strong>Time Elapsed:</strong> ${safeDetails.time_hours} hours</p>` : ""}
            </div>
            <p style="color: #dc2626; font-weight: bold;">⚠️ This could indicate your account has been compromised.</p>
            <p><strong>What you should do:</strong></p>
            <ul>
              <li>Change your password immediately</li>
              <li>Enable two-factor authentication if not already enabled</li>
              <li>Review your recent account activity</li>
              <li>If you're using a VPN, this alert may be a false positive</li>
            </ul>
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              This is an automated security alert from Shipper. If you were traveling or using a VPN, you can ignore this message.
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
    const authHeader = req.headers.get("Authorization");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    // SECURITY: Require authentication
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Unauthorized - Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Check if this is a service role call (internal) or user call
    const isServiceRoleCall = authHeader.includes(supabaseServiceKey);
    
    // Parse and validate input first
    const body = await req.json();
    const validation = validateInput(body);
    
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { alert_type, user_email, user_name, details } = validation.data;
    
    // If not a service role call, verify user can only send alerts to their own email
    if (!isServiceRoleCall) {
      const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      
      const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
      if (userError || !user) {
        console.error("User verification failed:", userError);
        return new Response(
          JSON.stringify({ error: "Unauthorized - Invalid token" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Users can only send alerts to their own email
      if (user.email?.toLowerCase() !== user_email.toLowerCase()) {
        console.error("User attempted to send alert to different email:", user.email, "vs", user_email);
        return new Response(
          JSON.stringify({ error: "Forbidden - Can only send alerts to your own email" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
    
    console.log(`Processing user security alert: ${alert_type} for ${user_email}`);

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
    await supabaseAdmin.rpc('create_audit_log', {
      p_user_id: null,
      p_action: `user_security_alert_${alert_type}`,
      p_details: { user_email, ...details }
    });

    return new Response(
      JSON.stringify({ success: true, data: emailResponse }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in send-user-security-alert:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
