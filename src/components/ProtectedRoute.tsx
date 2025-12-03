import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireEmailVerification?: boolean;
}

const ProtectedRoute = ({ children, requireEmailVerification = true }: ProtectedRouteProps) => {
  const { user, loading, isEmailVerified } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check email verification if required
  if (requireEmailVerification && !isEmailVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
