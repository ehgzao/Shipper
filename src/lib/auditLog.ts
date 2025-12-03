import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type AuditAction = 
  | 'login_success'
  | 'login_failed'
  | 'logout'
  | 'password_changed'
  | 'password_reset_requested'
  | '2fa_enabled'
  | '2fa_disabled'
  | 'session_revoked'
  | 'session_revoked_all'
  | 'profile_updated'
  | 'admin_role_granted'
  | 'admin_role_revoked'
  | 'admin_account_unlocked'
  | 'admin_viewed_user_data'
  | 'admin_rate_limit_reset'
  | 'admin_rate_limit_set'
  | 'backup_codes_generated'
  | 'recovery_email_updated';

export const createAuditLog = async (
  action: AuditAction,
  details: Record<string, unknown> = {}
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.rpc('create_audit_log', {
      p_user_id: user.id,
      p_action: action,
      p_details: details as Json
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
};

export const checkAccountLockout = async (email: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('is_account_locked', {
      p_email: email
    });
    
    if (error) throw error;
    return data as boolean;
  } catch (error) {
    console.error('Failed to check account lockout:', error);
    return false;
  }
};

export interface LoginAttemptResult {
  locked: boolean;
  locked_until?: string;
  attempts_remaining?: number;
  message: string;
  should_alert?: boolean;
  alert_type?: string;
  alert_details?: {
    email: string;
    failed_attempts?: number;
    attempt_count?: number;
    ip_address?: string;
  };
}

// Send security alert to admins (requires authentication)
const sendSecurityAlert = async (
  alertType: string,
  targetEmail: string,
  details?: Record<string, unknown>
) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Add auth header if user is authenticated
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-security-alerts`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          alert_type: alertType,
          target_email: targetEmail,
          details: details
        })
      }
    );
    
    if (!response.ok) {
      console.error('Failed to send security alert:', await response.text());
    }
  } catch (error) {
    console.error('Error sending security alert:', error);
  }
};

// Send security alert to user (requires authentication)
export const sendUserSecurityAlert = async (
  alertType: 'account_locked' | 'suspicious_login' | 'new_device_login' | 'password_changed' | '2fa_enabled' | '2fa_disabled',
  userEmail: string,
  userName?: string,
  details?: Record<string, unknown>
) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Add auth header if user is authenticated
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-user-security-alert`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          alert_type: alertType,
          user_email: userEmail,
          user_name: userName,
          details: details
        })
      }
    );
    
    if (!response.ok) {
      console.error('Failed to send user security alert:', await response.text());
    }
  } catch (error) {
    console.error('Error sending user security alert:', error);
  }
};

export const recordLoginAttempt = async (
  email: string,
  success: boolean
): Promise<LoginAttemptResult> => {
  try {
    const { data, error } = await supabase.rpc('record_login_attempt', {
      p_email: email,
      p_success: success
    });
    
    if (error) throw error;
    
    const result = data as unknown as LoginAttemptResult;
    
    // Send security alert to admins if needed
    if (result.should_alert && result.alert_type && result.alert_details) {
      sendSecurityAlert(result.alert_type, email, result.alert_details);
      
      // Also send alert to user if account was locked
      if (result.locked && result.alert_type === 'account_locked') {
        sendUserSecurityAlert('account_locked', email, undefined, result.alert_details);
      }
    }
    
    return result;
  } catch (error) {
    console.error('Failed to record login attempt:', error);
    return { locked: false, message: 'Failed to record attempt' };
  }
};