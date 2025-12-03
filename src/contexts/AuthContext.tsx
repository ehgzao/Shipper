import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  googleLoading: boolean;
  isEmailVerified: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [googleLoading, setGoogleLoading] = useState(false);

  const isEmailVerified = !!user?.email_confirmed_at;

  useEffect(() => {
    // Check for OAuth errors in URL
    const checkOAuthErrors = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));
      
      const error = urlParams.get('error') || hashParams.get('error');
      const errorCode = urlParams.get('error_code') || hashParams.get('error_code');
      const errorDescription = urlParams.get('error_description') || hashParams.get('error_description');
      
      if (error) {
        let message = "Erro ao fazer login com Google";
        
        // Map error codes to friendly messages in Portuguese
        if (errorCode === 'invalid_client' || errorDescription?.includes('invalid_client')) {
          message = "Configuração do Google incorreta. Entre em contato com o suporte.";
        } else if (errorCode === 'server_error' || errorCode === 'unexpected_failure') {
          message = "Erro no servidor de autenticação. Tente novamente.";
        } else if (errorDescription) {
          message = `Erro: ${decodeURIComponent(errorDescription)}`;
        }
        
        toast({
          variant: "destructive",
          title: "Falha na Autenticação",
          description: message,
        });
        
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname);
      }
    };
    
    checkOAuthErrors();
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/verify-email`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { error };
  };

  const signInWithGoogle = async (retryCount = 0): Promise<{ error: Error | null }> => {
    const MAX_RETRIES = 2;
    setGoogleLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      
      if (error && retryCount < MAX_RETRIES) {
        toast({
          title: "Tentando novamente...",
          description: `Tentativa ${retryCount + 2} de ${MAX_RETRIES + 1}`,
        });
        // Wait 1 second before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
        return signInWithGoogle(retryCount + 1);
      }
      
      if (error) {
        setGoogleLoading(false);
      }
      
      return { error };
    } catch (err) {
      setGoogleLoading(false);
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      googleLoading,
      isEmailVerified,
      signUp, 
      signIn, 
      signInWithGoogle, 
      signOut,
      resetPassword
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
