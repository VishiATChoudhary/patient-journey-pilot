
import React, { createContext, useContext, useState, ReactNode } from "react";

// Define app modes
export type AppMode = "standard" | "accessibility";

// Context type definition
type AppContextType = {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  uploadedDocuments: string[];
  addUploadedDocument: (documentUrl: string) => void;
  clearUploadedDocuments: () => void;
};

// Create the context with default values
const AppContext = createContext<AppContextType>({
  mode: "standard",
  setMode: () => {},
  isLoading: false,
  setIsLoading: () => {},
  uploadedDocuments: [],
  addUploadedDocument: () => {},
  clearUploadedDocuments: () => {},
});

// Hook for using the app context
export const useAppContext = () => useContext(AppContext);

// Provider component
export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setMode] = useState<AppMode>("standard");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState<string[]>([]);

  const addUploadedDocument = (documentUrl: string) => {
    setUploadedDocuments((prev) => [...prev, documentUrl]);
  };

  const clearUploadedDocuments = () => {
    setUploadedDocuments([]);
  };

  return (
    <AppContext.Provider
      value={{
        mode,
        setMode,
        isLoading,
        setIsLoading,
        uploadedDocuments,
        addUploadedDocument,
        clearUploadedDocuments,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
