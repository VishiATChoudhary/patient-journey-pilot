
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import LoadingSpinner from "@/components/LoadingSpinner";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-uber-gray-50">
        <LoadingSpinner />
      </div>
    );
  }

  // Since we've set public access, we always render children regardless of auth status
  return <>{children}</>;
};

export default ProtectedRoute;
