import { useEffect, useRef, useState, useCallback, memo } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;

interface TurnstileCaptchaProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: (error: string) => void;
}

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: object) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

export const TurnstileCaptcha = memo(function TurnstileCaptcha({ 
  onVerify, 
  onExpire, 
  onError 
}: TurnstileCaptchaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const renderedRef = useRef(false);

  useEffect(() => {
    console.log('[Turnstile] Component mounted');
    console.log('[Turnstile] Site Key:', SITE_KEY);
    console.log('[Turnstile] window.turnstile:', !!window.turnstile);

    const renderWidget = () => {
      if (!SITE_KEY) {
        console.error('[Turnstile] Missing VITE_TURNSTILE_SITE_KEY');
        onError?.('CAPTCHA not configured');
        return;
      }

      if (renderedRef.current) {
        console.log('[Turnstile] Already rendered, skipping');
        return;
      }
      if (!containerRef.current) {
        console.log('[Turnstile] Container not ready');
        return;
      }
      if (!window.turnstile) {
        console.log('[Turnstile] Script not loaded yet, retrying in 500ms...');
        setTimeout(renderWidget, 500);
        return;
      }

      console.log('[Turnstile] Rendering widget...');
      renderedRef.current = true;

      try {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: SITE_KEY,
          callback: (token: string) => {
            console.log('[Turnstile] Success! Token received');
            onVerify(token);
          },
          'error-callback': () => {
            console.error('[Turnstile] Error callback triggered');
            onError?.('Verification failed');
          },
          'expired-callback': () => {
            console.log('[Turnstile] Token expired');
            onExpire?.();
          },
          theme: 'auto',
          size: 'normal',
        });
        console.log('[Turnstile] Widget rendered successfully');
      } catch (e) {
        console.error('[Turnstile] Render error:', e);
        renderedRef.current = false;
      }
    };

    // Try to render immediately or wait for script
    if (window.turnstile) {
      renderWidget();
    } else {
      // Set callback for when script loads
      window.onTurnstileLoad = () => {
        console.log('[Turnstile] Script loaded via onTurnstileLoad callback');
        renderWidget();
      };
      // Also try polling in case callback doesn't fire
      setTimeout(renderWidget, 1000);
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (e) {
          // Widget might already be removed
        }
      }
      renderedRef.current = false;
      widgetIdRef.current = null;
    };
  }, [onVerify, onExpire, onError]);

  return (
    <div 
      ref={containerRef} 
      className="flex justify-center min-h-[65px]" 
      id="turnstile-container"
    />
  );
});

// Hook to verify CAPTCHA token server-side
export const useVerifyCaptcha = () => {
  const [isVerifying, setIsVerifying] = useState(false);

  const verify = useCallback(async (token: string): Promise<boolean> => {
    if (!token) return false;
    
    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-captcha', {
        body: { token },
      });
      
      if (error) {
        console.error('CAPTCHA verification error:', error);
        return false;
      }
      
      return data.success === true;
    } catch (err) {
      console.error('CAPTCHA verification failed:', err);
      return false;
    } finally {
      setIsVerifying(false);
    }
  }, []);

  return { verify, isVerifying };
};