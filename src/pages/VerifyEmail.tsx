import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Mail, Rocket, RefreshCw, LogOut } from "lucide-react";

const VerifyEmail = () => {
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already verified
    const checkVerification = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser?.email_confirmed_at) {
        navigate("/dashboard");
      }
    };

    checkVerification();

    // Listen for auth changes (user might verify in another tab)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "USER_UPDATED" && session?.user?.email_confirmed_at) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleResendEmail = async () => {
    if (!user?.email || countdown > 0) return;

    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: user.email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) throw error;

      setCountdown(60);
      toast({
        title: "Email resent",
        description: "Check your inbox.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error resending email",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Rocket className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold text-foreground">Shipper</span>
        </div>

        <div className="bg-card rounded-lg border p-8">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <Mail className="h-8 w-8 text-primary" />
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-2">
            Verify your email
          </h1>

          <p className="text-muted-foreground mb-6">
            We sent a verification link to{" "}
            <span className="font-medium text-foreground">{user?.email}</span>.
            Click the link to activate your account.
          </p>

          <div className="space-y-4">
            <Button
              onClick={handleResendEmail}
              disabled={isResending || countdown > 0}
              variant="outline"
              className="w-full"
            >
              {isResending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Resending...
                </>
              ) : countdown > 0 ? (
                `Resend in ${countdown}s`
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Resend verification email
                </>
              )}
            </Button>

            <Button
              onClick={handleSignOut}
              variant="ghost"
              className="w-full text-muted-foreground"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out and use another email
            </Button>
          </div>

          <div className="mt-6 pt-6 border-t">
            <p className="text-sm text-muted-foreground">
              Didn't receive the email? Check your spam folder or{" "}
              <button
                onClick={handleResendEmail}
                disabled={isResending || countdown > 0}
                className="text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                request a new one
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;