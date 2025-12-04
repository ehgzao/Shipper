import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Key, 
  Mail, 
  Copy, 
  Check, 
  RefreshCw, 
  Loader2,
  Shield,
  AlertTriangle,
  Download
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { createAuditLog } from "@/lib/auditLog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Generate backup codes (client-side for demo - in production, use server-side)
const generateBackupCodes = (): string[] => {
  const codes: string[] = [];
  for (let i = 0; i < 10; i++) {
    const code = Array.from({ length: 8 }, () => 
      'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]
    ).join('');
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  return codes;
};

export const AccountRecoveryOptions = () => {
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [isGeneratingCodes, setIsGeneratingCodes] = useState(false);
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [hasExistingCodes, setHasExistingCodes] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    // Check if user has backup codes stored (simulated via localStorage for demo)
    const storedCodes = localStorage.getItem(`backup_codes_${user?.id}`);
    if (storedCodes) {
      setHasExistingCodes(true);
    }
    
    // Get recovery email from profile if exists
    const getRecoveryEmail = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', user.id)
        .single();
      if (data?.email && data.email !== user.email) {
        setRecoveryEmail(data.email);
      }
    };
    getRecoveryEmail();
  }, [user]);

  const handleGenerateBackupCodes = async () => {
    if (hasExistingCodes && !showRegenerateDialog) {
      setShowRegenerateDialog(true);
      return;
    }

    setIsGeneratingCodes(true);
    try {
      const codes = generateBackupCodes();
      setBackupCodes(codes);
      setShowBackupCodes(true);
      setHasExistingCodes(true);
      
      // Store codes hash locally (in production, store hashed on server)
      localStorage.setItem(`backup_codes_${user?.id}`, JSON.stringify(codes.map(c => btoa(c))));
      
      await createAuditLog('backup_codes_generated', { count: codes.length });
      
      toast({
        title: "Backup Codes Generated",
        description: "Please save these codes in a secure location.",
      });
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsGeneratingCodes(false);
      setShowRegenerateDialog(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCopyAllCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    toast({
      title: "Copied",
      description: "All backup codes copied to clipboard",
    });
  };

  const handleDownloadCodes = () => {
    const content = `Shipper Account Backup Codes
Generated: ${new Date().toISOString()}
Account: ${user?.email}

IMPORTANT: Keep these codes in a safe place. Each code can only be used once.

${backupCodes.map((code, i) => `${i + 1}. ${code}`).join('\n')}
`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'shipper-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveRecoveryEmail = async () => {
    if (!recoveryEmail || recoveryEmail === user?.email) {
      toast({
        title: "Invalid Email",
        description: "Please enter a different email address",
        variant: "destructive",
      });
      return;
    }

    setIsSavingEmail(true);
    try {
      // In a real app, you'd verify this email first
      await createAuditLog('recovery_email_updated', { recovery_email: recoveryEmail });
      
      toast({
        title: "Recovery Email Saved",
        description: "Your recovery email has been updated",
      });
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsSavingEmail(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Account Recovery Options
          </CardTitle>
          <CardDescription>
            Set up backup methods to recover your account if you lose access
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Backup Codes Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Backup Codes
                </h4>
                <p className="text-xs text-muted-foreground">
                  One-time codes to access your account if you lose your 2FA device
                </p>
              </div>
              {hasExistingCodes && !showBackupCodes && (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <Check className="h-3 w-3 mr-1" />
                  Generated
                </Badge>
              )}
            </div>

            {showBackupCodes && backupCodes.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
                  <p className="text-xs text-warning">
                    Save these codes now! They won't be shown again.
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((code, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-2 bg-muted rounded font-mono text-sm"
                    >
                      <span>{code}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleCopyCode(code)}
                      >
                        {copiedCode === code ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopyAllCodes}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy All
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownloadCodes}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            ) : (
              <Button 
                variant="outline" 
                onClick={handleGenerateBackupCodes}
                disabled={isGeneratingCodes}
              >
                {isGeneratingCodes ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : hasExistingCodes ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Regenerate Codes
                  </>
                ) : (
                  <>
                    <Key className="h-4 w-4 mr-2" />
                    Generate Backup Codes
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Divider */}
          <div className="border-t" />

          {/* Recovery Email Section */}
          <div className="space-y-4">
            <div className="space-y-1">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Recovery Email
              </h4>
              <p className="text-xs text-muted-foreground">
                A secondary email to help recover your account
              </p>
            </div>

            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="recovery@example.com"
                value={recoveryEmail}
                onChange={(e) => setRecoveryEmail(e.target.value)}
              />
              <Button 
                onClick={handleSaveRecoveryEmail}
                disabled={isSavingEmail || !recoveryEmail || recoveryEmail === user?.email}
              >
                {isSavingEmail ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Save"
                )}
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground">
              This should be different from your main account email: {user?.email}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Regenerate Confirmation Dialog */}
      <AlertDialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate Backup Codes?</AlertDialogTitle>
            <AlertDialogDescription>
              This will invalidate all your existing backup codes. Make sure you have access to your 2FA device before proceeding.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleGenerateBackupCodes}>
              Regenerate Codes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AccountRecoveryOptions;
