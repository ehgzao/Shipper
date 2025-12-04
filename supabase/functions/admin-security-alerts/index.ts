import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Valid alert types
const VALID_ALERT_TYPES = ["account_locked", "suspicious_activity", "multiple_failed_logins"] as const;
type AlertType = typeof VALID_ALERT_TYPES[number];

interface AdminAlertRequest {
  alert_type: AlertType;
  target_email: string;
  details?: Record<string, unknown>;
}

// Input validation
const validateInput = (body: unknown): { valid: true; data: AdminAlertRequest } | { valid: false; error: string } => {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const { alert_type, target_email, details } = body as Record<string, unknown>;

  // Validate alert_type
  if (!alert_type || typeof alert_type !== 'string' || !VALID_ALERT_TYPES.includes(alert_type as AlertType)) {
    return { valid: false, error: `Invalid alert_type. Must be one of: ${VALID_ALERT_TYPES.join(', ')}` };
  }

  // Validate target_email
  if (!target_email || typeof target_email !== 'string') {
    return { valid: false, error: 'target_email is required' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(target_email) || target_email.length > 255) {
    return { valid: false, error: 'Invalid email format' };
  }

  // Validate details (optional)
  if (details !== undefined && (typeof details !== 'object' || details === null)) {
    return { valid: false, error: 'details must be an object if provided' };
  }

  return {
    valid: true,
    data: {
      alert_type: alert_type as AlertType,
      target_email: target_email.toLowerCase().trim(),
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

const getAdminEmails = async (supabase: SupabaseClient): Promise<string[]> => {
  const { data, error } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'admin');
  
  if (error || !data || data.length === 0) {
    console.log("No admin users found or error:", error);
    return [];
  }

  const adminIds = (data as { user_id: string }[]).map((r) => r.user_id);
  const { data: profilesData } = await supabase
    .from('profiles')
    .select('email')
    .in('id', adminIds);
  
  const profiles = (profilesData ?? []) as { email: string | null }[];
  return profiles.map((p) => p.email).filter(Boolean) as string[];
};

const getAlertEmailContent = (alert_type: string, target_email: string, details?: Record<string, unknown>) => {
  const timestamp = new Date().toLocaleString();
  const safeEmail = escapeHtml(target_email);
  const safeDetails = details ? Object.fromEntries(
    Object.entries(details).map(([k, v]) => [k, typeof v === 'string' ? escapeHtml(v) : v])
  ) : {};
  
  switch (alert_type) {
    case "account_locked":
      return {
        subject: "🔒 Account Locked Alert - Shipper Admin",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #dc2626; margin-bottom: 20px;">⚠️ Account Locked</h1>
            <p>An account has been locked due to multiple failed login attempts.</p>
            <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Email:</strong> ${safeEmail}</p>
              <p style="margin: 8px 0 0 0;"><strong>Time:</strong> ${timestamp}</p>
              ${safeDetails?.failed_attempts ? `<p style="margin: 8px 0 0 0;"><strong>Failed Attempts:</strong> ${safeDetails.failed_attempts}</p>` : ""}
              ${safeDetails?.ip_address ? `<p style="margin: 8px 0 0 0;"><strong>IP Address:</strong> ${safeDetails.ip_address}</p>` : ""}
            </div>
            <p>You can unlock this account from the Admin Dashboard → Security tab.</p>
            <p style="color: #6b7280; font-size: 14px;">This is an automated security alert from Shipper.</p>
          </div>
        `,
      };
    
    case "suspicious_activity":
      return {
        subject: "🚨 Suspicious Activity Detected - Shipper Admin",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #d97706; margin-bottom: 20px;">🚨 Suspicious Activity Detected</h1>
            <p>Unusual login activity has been detected for an account.</p>
            <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Email:</strong> ${safeEmail}</p>
              <p style="margin: 8px 0 0 0;"><strong>Time:</strong> ${timestamp}</p>
              ${safeDetails?.reason ? `<p style="margin: 8px 0 0 0;"><strong>Reason:</strong> ${safeDetails.reason}</p>` : ""}
              ${safeDetails?.ip_address ? `<p style="margin: 8px 0 0 0;"><strong>IP Address:</strong> ${safeDetails.ip_address}</p>` : ""}
            </div>
            <p>Please review this activity in the Admin Dashboard.</p>
            <p style="color: #6b7280; font-size: 14px;">This is an automated security alert from Shipper.</p>
          </div>
        `,
      };
    
    case "multiple_failed_logins":
      return {
        subject: "⚠️ Multiple Failed Logins - Shipper Admin",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #d97706; margin-bottom: 20px;">⚠️ Multiple Failed Login Attempts</h1>
            <p>Multiple failed login attempts have been detected for an account.</p>
            <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Email:</strong> ${safeEmail}</p>
              <p style="margin: 8px 0 0 0;"><strong>Time:</strong> ${timestamp}</p>
              ${safeDetails?.attempt_count ? `<p style="margin: 8px 0 0 0;"><strong>Attempt Count:</strong> ${safeDetails.attempt_count}</p>` : ""}
              ${safeDetails?.ip_address ? `<p style="margin: 8px 0 0 0;"><strong>IP Address:</strong> ${safeDetails.ip_address}</p>` : ""}
            </div>
            <p>The account may be locked if attempts continue.</p>
            <p style="color: #6b7280; font-size: 14px;">This is an automated security alert from Shipper.</p>
          </div>
        `,
      };
    
    default:
      return {
        subject: "Security Alert - Shipper Admin",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1e40af; margin-bottom: 20px;">Security Alert</h1>
            <p>A security event has occurred for: ${safeEmail}</p>
            <p>Time: ${timestamp}</p>
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
    
    // SECURITY: Require authentication - either service role key or admin JWT
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Unauthorized - Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // If not using service role key, verify user is admin
    const isServiceRoleCall = authHeader.includes(supabaseServiceKey);
    
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
      
      // Check if user is admin
      const { data: roleData } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();
      
      if (!roleData) {
        console.error("Non-admin attempted to send admin alerts");
        return new Response(
          JSON.stringify({ error: "Unauthorized - Admin only" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Parse and validate input
    const body = await req.json();
    const validation = validateInput(body);
    
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { alert_type, target_email, details } = validation.data;
    
    console.log(`Processing admin alert: ${alert_type} for ${target_email}`);

    const adminEmails = await getAdminEmails(supabaseAdmin);
    
    if (adminEmails.length === 0) {
      console.log("No admin emails found, skipping notification");
      return new Response(
        JSON.stringify({ success: true, message: "No admin emails configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailContent = getAlertEmailContent(alert_type, target_email, details);

    console.log(`Sending admin alert to: ${adminEmails.join(", ")}`);

    const emailResponse = await resend.emails.send({
      from: "Shipper Security <noreply@shipper.works>",
      to: adminEmails,
      subject: emailContent.subject,
      html: emailContent.html,
    });

    console.log("Admin alert email sent:", emailResponse);

    await supabaseAdmin.rpc('create_audit_log', {
      p_user_id: null,
      p_action: `security_alert_${alert_type}`,
      p_details: { target_email, ...details }
    });

    return new Response(
      JSON.stringify({ success: true, data: emailResponse }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in admin-security-alerts:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
