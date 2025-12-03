import { supabase } from "@/integrations/supabase/client";

export type SecurityEventType = 
  | "password_changed" 
  | "profile_updated" 
  | "2fa_enabled" 
  | "2fa_disabled" 
  | "session_revoked";

interface SendSecurityNotificationParams {
  event_type: SecurityEventType;
  user_email: string;
  user_name?: string;
  details?: Record<string, unknown>;
}

export const sendSecurityNotification = async (params: SendSecurityNotificationParams): Promise<void> => {
  try {
    const { data, error } = await supabase.functions.invoke('send-security-notification', {
      body: params,
    });

    if (error) {
      console.error('Failed to send security notification:', error);
      // Don't throw - email failures shouldn't break the main operation
    } else {
      console.log('Security notification sent:', data);
    }
  } catch (error) {
    console.error('Error sending security notification:', error);
    // Don't throw - email failures shouldn't break the main operation
  }
};
