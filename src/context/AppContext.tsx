
import React, { createContext, useContext, useState, ReactNode } from "react";

// Define app modes
export type AppMode = "standard" | "accessibility";

// Document type definition
export type Document = {
  id: string;
  url: string;
  name: string;
};

// Context type definition
type AppContextType = {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  uploadedDocuments: Document[];
  addUploadedDocument: (document: Document) => void;
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
  const [uploadedDocuments, setUploadedDocuments] = useState<Document[]>([]);

  const addUploadedDocument = (document: Document) => {
    setUploadedDocuments((prev) => [...prev, document]);
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
