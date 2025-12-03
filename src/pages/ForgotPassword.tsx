import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Mail, Rocket, CheckCircle } from "lucide-react";
import { z } from "zod";
import { getValidationError } from "@/lib/validations";

const emailSchema = z.object({
  email: z.string().email("Email inválido").max(255, "Email deve ter no máximo 255 caracteres"),
});

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = getValidationError(emailSchema, { email });
    if (validationError) {
      toast({
        title: "Erro de validação",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw error;
      }

      setEmailSent(true);
      toast({
        title: "Email enviado",
        description: "Verifique sua caixa de entrada para redefinir sua senha.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao enviar email",
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
              Voltar para login
            </Link>

            <div className="text-center">
              <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
              <h2 className="text-2xl font-bold text-foreground">Email enviado!</h2>
              <p className="mt-4 text-muted-foreground">
                Enviamos um link para <span className="font-medium text-foreground">{email}</span>. 
                Clique no link para redefinir sua senha.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Não recebeu? Verifique a pasta de spam ou{" "}
                <button
                  onClick={() => setEmailSent(false)}
                  className="text-primary hover:underline"
                >
                  tente novamente
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
            Voltar para login
          </Link>

          <div className="flex items-center gap-2 mb-6">
            <Rocket className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-foreground">Shipper</span>
          </div>

          <h2 className="text-2xl font-bold text-foreground">Esqueceu sua senha?</h2>
          <p className="mt-2 text-muted-foreground">
            Informe seu email e enviaremos um link para redefinir sua senha.
          </p>

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
                  placeholder="seu@email.com"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Enviando..." : "Enviar link de redefinição"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Lembrou sua senha?{" "}
            <Link to="/login" className="text-primary hover:underline">
              Faça login
            </Link>
          </p>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 items-center justify-center bg-primary/5">
        <div className="max-w-md text-center p-8">
          <Mail className="mx-auto h-24 w-24 text-primary/20 mb-6" />
          <h3 className="text-xl font-semibold text-foreground mb-2">
            Recupere o acesso
          </h3>
          <p className="text-muted-foreground">
            Enviaremos um email seguro para você redefinir sua senha.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
