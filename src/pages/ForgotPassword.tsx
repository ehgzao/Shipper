import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Mail, Rocket, CheckCircle, Clock } from "lucide-react";
import { z } from "zod";
import { getValidationError } from "@/lib/validations";

const emailSchema = z.object({
  email: z.string().email("Invalid email").max(255, "Email must be at most 255 characters"),
});

interface RateLimitResult {
  allowed: boolean;
  retry_after_seconds: number;
  message: string;
}

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [retryAfter, setRetryAfter] = useState(0);
  const { toast } = useToast();

  const formatRetryTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds} seconds`;
    const minutes = Math.ceil(seconds / 60);
    return minutes === 1 ? "1 minute" : `${minutes} minutes`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = getValidationError(emailSchema, { email });
    if (validationError) {
      toast({
        title: "Validation Error",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setRateLimited(false);

    try {
      // Check rate limit first
      const { data: rateLimitData, error: rateLimitError } = await supabase.rpc(
        'check_password_reset_rate_limit',
        { p_email: email.toLowerCase() }
      );

      if (rateLimitError) {
        console.error('Rate limit check error:', rateLimitError);
        // Continue anyway if rate limit check fails - don't block legitimate users
      } else if (rateLimitData) {
        const result = rateLimitData as unknown as RateLimitResult;
        if (!result.allowed) {
          setRateLimited(true);
          setRetryAfter(result.retry_after_seconds);
          toast({
            title: "Rate Limited",
            description: result.message,
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
      }

      // Proceed with password reset
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw error;
      }

      setEmailSent(true);
      toast({
        title: "Email sent",
        description: "Check your inbox to reset your password.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error sending email",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex">
        <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-8 bg-background">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <Link
              to="/login"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to login
            </Link>

            <div className="text-center">
              <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
              <h2 className="text-2xl font-bold text-foreground">Email sent!</h2>
              <p className="mt-4 text-muted-foreground">
                We sent a link to <span className="font-medium text-foreground">{email}</span>. 
                Click the link to reset your password.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Didn't receive it? Check your spam folder or{" "}
                <button
                  onClick={() => setEmailSent(false)}
                  className="text-primary hover:underline"
                >
                  try again
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-8 bg-background">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <Link
            to="/login"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to login
          </Link>

          <div className="flex items-center gap-2 mb-6">
            <Rocket className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-foreground">Shipper</span>
          </div>

          <h2 className="text-2xl font-bold text-foreground">Forgot your password?</h2>
          <p className="mt-2 text-muted-foreground">
            Enter your email and we'll send you a link to reset your password.
          </p>

          {rateLimited && (
            <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <Clock className="h-5 w-5" />
                <span className="font-medium">Too many requests</span>
              </div>
              <p className="mt-1 text-sm text-amber-600 dark:text-amber-500">
                Please wait {formatRetryTime(retryAfter)} before trying again.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Sending..." : "Send reset link"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Remember your password?{" "}
            <Link to="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 items-center justify-center bg-primary/5">
        <div className="max-w-md text-center p-8">
          <Mail className="mx-auto h-24 w-24 text-primary/20 mb-6" />
          <h3 className="text-xl font-semibold text-foreground mb-2">
            Recover access
          </h3>
          <p className="text-muted-foreground">
            We'll send you a secure email to reset your password.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;