import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AdminAlertRequest {
  alert_type: "account_locked" | "suspicious_activity" | "multiple_failed_logins";
  target_email: string;
  details?: Record<string, unknown>;
}

const getAdminEmails = async (supabase: any): Promise<string[]> => {
  // Get all admin users' emails
  const { data, error } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'admin');
  
  if (error || !data || data.length === 0) {
    console.log("No admin users found or error:", error);
    return [];
  }

  // Get emails from auth.users for admin user_ids
  const adminIds = data.map((r: any) => r.user_id);
  const { data: profilesData } = await supabase
    .from('profiles')
    .select('email')
    .in('id', adminIds);
  
  return profilesData?.map((p: any) => p.email).filter(Boolean) || [];
};

const getAlertEmailContent = (alert_type: string, target_email: string, details?: Record<string, unknown>) => {
  const timestamp = new Date().toLocaleString();
  
  switch (alert_type) {
    case "account_locked":
      return {
        subject: "🔒 Account Locked Alert - Shipper Admin",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #dc2626; margin-bottom: 20px;">⚠️ Account Locked</h1>
            <p>An account has been locked due to multiple failed login attempts.</p>
            <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Email:</strong> ${target_email}</p>
              <p style="margin: 8px 0 0 0;"><strong>Time:</strong> ${timestamp}</p>
              ${details?.failed_attempts ? `<p style="margin: 8px 0 0 0;"><strong>Failed Attempts:</strong> ${details.failed_attempts}</p>` : ""}
              ${details?.ip_address ? `<p style="margin: 8px 0 0 0;"><strong>IP Address:</strong> ${details.ip_address}</p>` : ""}
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
              <p style="margin: 0;"><strong>Email:</strong> ${target_email}</p>
              <p style="margin: 8px 0 0 0;"><strong>Time:</strong> ${timestamp}</p>
              ${details?.reason ? `<p style="margin: 8px 0 0 0;"><strong>Reason:</strong> ${details.reason}</p>` : ""}
              ${details?.ip_address ? `<p style="margin: 8px 0 0 0;"><strong>IP Address:</strong> ${details.ip_address}</p>` : ""}
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
              <p style="margin: 0;"><strong>Email:</strong> ${target_email}</p>
              <p style="margin: 8px 0 0 0;"><strong>Time:</strong> ${timestamp}</p>
              ${details?.attempt_count ? `<p style="margin: 8px 0 0 0;"><strong>Attempt Count:</strong> ${details.attempt_count}</p>` : ""}
              ${details?.ip_address ? `<p style="margin: 8px 0 0 0;"><strong>IP Address:</strong> ${details.ip_address}</p>` : ""}
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
            <p>A security event has occurred for: ${target_email}</p>
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
    // This function can be called internally (from database triggers) or by admins
    // Check for internal call via service role key or admin JWT
    const authHeader = req.headers.get("Authorization");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    // Create service client for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify caller is admin if JWT provided
    if (authHeader && !authHeader.includes(supabaseServiceKey)) {
      const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      
      const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
      if (userError || !user) {
        console.error("User verification failed");
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
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

    const { alert_type, target_email, details }: AdminAlertRequest = await req.json();
    
    console.log(`Processing admin alert: ${alert_type} for ${target_email}`);

    // Get admin emails to notify
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
      from: "Shipper Security <onboarding@resend.dev>",
      to: adminEmails,
      subject: emailContent.subject,
      html: emailContent.html,
    });

    console.log("Admin alert email sent:", emailResponse);

    // Log the alert in audit logs
    await supabaseAdmin.rpc('create_audit_log', {
      p_user_id: null,
      p_action: `security_alert_${alert_type}`,
      p_details: { target_email, ...details }
    });

    return new Response(
      JSON.stringify({ success: true, data: emailResponse }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in admin-security-alerts:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});