import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, ShieldCheck, ShieldOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { createAuditLog, sendUserSecurityAlert } from "@/lib/auditLog";
import { useAuth } from "@/contexts/AuthContext";

interface TwoFactorSetupProps {
  onStatusChange?: (enabled: boolean) => void;
}

const TwoFactorSetup = ({ onStatusChange }: TwoFactorSetupProps) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    checkMFAStatus();
  }, []);

  const checkMFAStatus = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      
      const totpFactor = data.totp.find(f => f.status === 'verified');
      setIsEnabled(!!totpFactor);
      if (totpFactor) {
        setFactorId(totpFactor.id);
      }
    } catch (error) {
      console.error("Error checking MFA status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const startEnrollment = async () => {
    setIsEnrolling(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Shipper Authenticator'
      });

      if (error) throw error;

      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setFactorId(data.id);
    } catch (error: any) {
      toast({
        title: "Error setting up 2FA",
        description: error.message,
        variant: "destructive",
      });
      setIsEnrolling(false);
    }
  };

  const verifyAndEnable = async () => {
    if (!factorId || verifyCode.length !== 6) return;

    setIsVerifying(true);
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId
      });

      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: verifyCode
      });

      if (verifyError) throw verifyError;

      setIsEnabled(true);
      setIsEnrolling(false);
      setQrCode(null);
      setSecret(null);
      setVerifyCode("");
      onStatusChange?.(true);

      // Log the action
      await createAuditLog('2fa_enabled', {});
      
      // Send security alert to user
      if (user?.email) {
        sendUserSecurityAlert('2fa_enabled', user.email, undefined, {
          timestamp: new Date().toISOString(),
        });
      }

      toast({
        title: "2FA Enabled",
        description: "Two-factor authentication has been successfully enabled.",
      });
    } catch (error: any) {
      toast({
        title: "Verification failed",
        description: error.message || "Invalid code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const disable2FA = async () => {
    if (!factorId) return;

    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;

      setIsEnabled(false);
      setFactorId(null);
      onStatusChange?.(false);

      // Log the action
      await createAuditLog('2fa_disabled', {});
      
      // Send security alert to user
      if (user?.email) {
        sendUserSecurityAlert('2fa_disabled', user.email, undefined, {
          timestamp: new Date().toISOString(),
        });
      }

      toast({
        title: "2FA Disabled",
        description: "Two-factor authentication has been disabled.",
      });
    } catch (error: any) {
      toast({
        title: "Error disabling 2FA",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const cancelEnrollment = () => {
    setIsEnrolling(false);
    setQrCode(null);
    setSecret(null);
    setVerifyCode("");
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Two-Factor Authentication
        </CardTitle>
        <CardDescription>
          Add an extra layer of security to your account using an authenticator app.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEnabled ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <ShieldCheck className="h-5 w-5" />
              <span className="font-medium">2FA is enabled</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Your account is protected with two-factor authentication.
            </p>
            <Button variant="destructive" onClick={disable2FA}>
              <ShieldOff className="h-4 w-4 mr-2" />
              Disable 2FA
            </Button>
          </div>
        ) : isEnrolling && qrCode ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">1. Scan this QR code with your authenticator app:</p>
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <img src={qrCode} alt="QR Code" className="w-48 h-48" />
              </div>
            </div>
            
            {secret && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Or enter this code manually:</p>
                <code className="block p-2 bg-muted rounded text-xs break-all">
                  {secret}
                </code>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="verify-code">2. Enter the 6-digit code from your app:</Label>
              <Input
                id="verify-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="text-center text-lg tracking-widest"
              />
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={verifyAndEnable} 
                disabled={verifyCode.length !== 6 || isVerifying}
                className="flex-1"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify & Enable"
                )}
              </Button>
              <Button variant="outline" onClick={cancelEnrollment}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Protect your account by requiring a verification code from your authenticator app when signing in.
            </p>
            <Button onClick={startEnrollment}>
              <Shield className="h-4 w-4 mr-2" />
              Set up 2FA
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TwoFactorSetup;
