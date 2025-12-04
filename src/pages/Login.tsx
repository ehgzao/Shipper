import { useState, useEffect } from "react";

import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Ship, Mail, Lock, ArrowLeft, AlertTriangle, Loader2, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { loginSchema, getValidationError } from "@/lib/validations";
import { checkAccountLockout, recordLoginAttemptWithGeo, createAuditLog, sendUserSecurityAlert } from "@/lib/auditLog";
import { getLoginContext, isNewDevice, storeDeviceFingerprint } from "@/lib/deviceFingerprint";

const REMEMBER_CREDENTIALS_KEY = 'shipper_remember_credentials';

// Simple encoding/decoding for credentials (not encryption, just obfuscation)
const encodeCredentials = (email: string, password: string): string => {
  return btoa(JSON.stringify({ email, password }));
};

const decodeCredentials = (encoded: string): { email: string; password: string } | null => {
  try {
    return JSON.parse(atob(encoded));
  } catch {
    return null;
  }
};

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberCredentials, setRememberCredentials] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockMessage, setLockMessage] = useState("");
  const [impossibleTravelWarning, setImpossibleTravelWarning] = useState<string | null>(null);
  const { toast } = useToast();
  const { signIn, signInWithGoogle, googleLoading, user } = useAuth();
  const navigate = useNavigate();

  // Load remembered credentials on mount
  useEffect(() => {
    const savedCredentials = localStorage.getItem(REMEMBER_CREDENTIALS_KEY);
    if (savedCredentials) {
      const credentials = decodeCredentials(savedCredentials);
      if (credentials) {
        setEmail(credentials.email);
        setPassword(credentials.password);
        setRememberCredentials(true);
      }
    }
  }, []);

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate with Zod schema
    const validationError = getValidationError(loginSchema, { email, password });
    if (validationError) {
      toast({
        title: "Validation Error",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    // Handle remember credentials
    if (rememberCredentials) {
      localStorage.setItem(REMEMBER_CREDENTIALS_KEY, encodeCredentials(email, password));
    } else {
      localStorage.removeItem(REMEMBER_CREDENTIALS_KEY);
    }

    // Check if account is locked before doing heavier context work
    const locked = await checkAccountLockout(email);
    if (locked) {
      setIsLocked(true);
      setLockMessage("Account temporarily locked. Please try again in 15 minutes.");
      toast({
        title: "Account Locked",
        description: "Too many failed login attempts. Please try again later.",
        variant: "destructive",
      });
      return;
    }
    
    // Get device and location context
    const { deviceInfo, geoLocation, readableDevice } = await getLoginContext();

    setIsLoading(true);
    
    const { error } = await signIn(email, password);
    
    if (error) {
      // Record failed attempt with full geo data
      const result = await recordLoginAttemptWithGeo(email, false, geoLocation, {
        userAgent: deviceInfo.userAgent,
        fingerprint: deviceInfo.fingerprint
      });
      
      if (result.locked) {
        setIsLocked(true);
        setLockMessage("Account temporarily locked due to too many failed attempts.");
      } else if (result.attempts_remaining !== undefined) {
        setLockMessage(`${result.attempts_remaining} attempts remaining before lockout.`);
      }

      toast({
        title: "Sign in error",
        description: error.message === "Invalid login credentials" 
          ? "Incorrect email or password" 
          : error.message,
        variant: "destructive",
      });
    } else {
      // Record successful attempt with full geo data
      const result = await recordLoginAttemptWithGeo(email, true, geoLocation, {
        userAgent: deviceInfo.userAgent,
        fingerprint: deviceInfo.fingerprint
      });
      
      await createAuditLog('login_success', { 
        email,
        device: readableDevice,
        ip_address: geoLocation.ip,
        country: geoLocation.country,
        city: geoLocation.city,
        latitude: geoLocation.latitude,
        longitude: geoLocation.longitude,
      });
      
      // Check for impossible travel
      if (result.impossible_travel?.suspicious) {
        setImpossibleTravelWarning(
          `Unusual login detected: Your account was accessed from ${result.impossible_travel.details?.last_location || 'another location'} ` +
          `approximately ${result.impossible_travel.details?.time_hours?.toFixed(1) || '?'} hours ago, ` +
          `which is ${result.impossible_travel.details?.distance_km?.toFixed(0) || '?'} km away.`
        );
        
        await createAuditLog('impossible_travel_detected', {
          email,
          ...result.impossible_travel.details,
          current_location: geoLocation.city && geoLocation.country 
            ? `${geoLocation.city}, ${geoLocation.country}` 
            : 'Unknown'
        });
      }
      
      // Check if this is a new device and send alert
      if (isNewDevice(deviceInfo.fingerprint)) {
        await sendUserSecurityAlert('new_device_login', email, undefined, {
          ip_address: geoLocation.ip,
          location: geoLocation.city && geoLocation.country 
            ? `${geoLocation.city}, ${geoLocation.country}` 
            : undefined,
          device: readableDevice,
        });
      }
      
      // Store device fingerprint for future reference
      storeDeviceFingerprint(deviceInfo.fingerprint);
      
      toast({
        title: "Welcome back!",
        description: "Successfully signed in.",
      });
      navigate("/dashboard");
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
          
          <div className="flex items-center gap-2 mb-2">
            <Ship className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">Shipper</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
          <p className="mt-2 text-muted-foreground">
            Sign in to continue tracking your opportunities
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          {impossibleTravelWarning && (
            <div className="mb-6 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-2">
                <MapPin className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-amber-700 dark:text-amber-300">Unusual Location Detected</p>
                  <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">{impossibleTravelWarning}</p>
                  <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
                    If this wasn't you, please change your password immediately.
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="email">Email</Label>
              <div className="mt-2 relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/forgot-password" className="text-sm text-primary hover:text-primary/80 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="mt-2 relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberCredentials}
                onCheckedChange={(checked) => setRememberCredentials(checked as boolean)}
              />
              <Label 
                htmlFor="remember" 
                className="text-sm font-normal text-muted-foreground cursor-pointer"
              >
                Remember my credentials
              </Label>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isLoading || isLocked}>
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>

            {lockMessage && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {lockMessage}
              </div>
            )}

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">or</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              size="lg"
              onClick={() => signInWithGoogle()}
              disabled={googleLoading}
            >
              {googleLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              {googleLoading ? "Connecting..." : "Continue with Google"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/signup" className="font-medium text-primary hover:text-primary/80 transition-colors">
              Sign up free
            </Link>
          </p>
        </div>
      </div>

      {/* Right side - Decorative */}
      <div className="hidden lg:flex flex-1 bg-primary items-center justify-center p-12">
        <div className="text-center text-primary-foreground max-w-md">
          <Ship className="h-20 w-20 mx-auto mb-8 opacity-80" />
          <h2 className="text-3xl font-bold mb-4">Ship opportunities, not applications.</h2>
          <p className="text-primary-foreground/80">
            Quality over quantity. Track your job search with intention.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;