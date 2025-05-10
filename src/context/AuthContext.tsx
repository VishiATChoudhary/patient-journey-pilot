
import React, { createContext, useContext } from "react";

type AuthContextType = {
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  loading: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Simplified context with no auth functionality
  return (
    <AuthContext.Provider value={{ loading: false }}>
      {children}
    </AuthContext.Provider>
  );
};
