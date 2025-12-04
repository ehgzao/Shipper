import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TurnstileCaptchaProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: (error: string) => void;
}

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: {
        sitekey: string;
        callback: (token: string) => void;
        'expired-callback'?: () => void;
        'error-callback'?: (error: string) => void;
        theme?: 'light' | 'dark' | 'auto';
        size?: 'normal' | 'compact';
      }) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

export const TurnstileCaptcha = ({ onVerify, onExpire, onError }: TurnstileCaptchaProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [siteKey, setSiteKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Fetch site key from edge function
  useEffect(() => {
    const fetchSiteKey = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-turnstile-key');
        if (error) throw error;
        setSiteKey(data.siteKey);
      } catch (err) {
        console.error('Failed to fetch Turnstile site key:', err);
        onError?.('Failed to load CAPTCHA');
      } finally {
        setLoading(false);
      }
    };
    fetchSiteKey();
  }, [onError]);

  // Load Turnstile script
  useEffect(() => {
    if (!siteKey) return;

    // Check if script is already loaded
    if (window.turnstile) {
      setScriptLoaded(true);
      return;
    }

    // Check if script is already in DOM
    const existingScript = document.querySelector('script[src*="turnstile"]');
    if (existingScript) {
      window.onTurnstileLoad = () => setScriptLoaded(true);
      return;
    }

    // Load the script
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad';
    script.async = true;
    script.defer = true;
    
    window.onTurnstileLoad = () => {
      setScriptLoaded(true);
    };
    
    document.head.appendChild(script);

    return () => {
      // Cleanup
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    };
  }, [siteKey]);

  // Render widget when script is loaded
  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile || !siteKey) return;
    
    // Remove existing widget if any
    if (widgetIdRef.current) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch (e) {
        // Ignore
      }
    }

    // Clear container
    containerRef.current.innerHTML = '';

    // Render new widget
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: onVerify,
      'expired-callback': onExpire,
      'error-callback': onError,
      theme: 'auto',
      size: 'normal',
    });
  }, [siteKey, onVerify, onExpire, onError]);

  useEffect(() => {
    if (scriptLoaded && siteKey) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(renderWidget, 100);
      return () => clearTimeout(timer);
    }
  }, [scriptLoaded, siteKey, renderWidget]);

  if (loading) {
    return (
      <div className="h-[65px] flex items-center justify-center bg-muted/50 rounded-md">
        <span className="text-sm text-muted-foreground">Loading CAPTCHA...</span>
      </div>
    );
  }

  if (!siteKey) {
    return (
      <div className="h-[65px] flex items-center justify-center bg-destructive/10 rounded-md">
        <span className="text-sm text-destructive">CAPTCHA unavailable</span>
      </div>
    );
  }

  return <div ref={containerRef} className="flex justify-center" />;
};

// Hook to verify CAPTCHA token server-side
export const useVerifyCaptcha = () => {
  const [isVerifying, setIsVerifying] = useState(false);

  const verify = async (token: string): Promise<boolean> => {
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
  };

  return { verify, isVerifying };
};