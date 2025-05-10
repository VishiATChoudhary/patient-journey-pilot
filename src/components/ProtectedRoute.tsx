
import React from "react";
import LoadingSpinner from "@/components/LoadingSpinner";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  // We're completely removing auth checks, so we just render children directly
  return <>{children}</>;
};

export default ProtectedRoute;
