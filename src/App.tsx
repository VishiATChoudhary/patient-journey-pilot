
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider } from "@/context/AppContext";
import { AuthProvider } from "@/context/AuthContext";
import ModeSelection from "./pages/ModeSelection";
import DocumentUpload from "./pages/DocumentUpload";
import SuccessPage from "./pages/SuccessPage";
import NewPatient from "./pages/NewPatient";
import Patients from "./pages/Patients";
import PatientDetail from "./pages/PatientDetail";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={<Navigate to="/patients" replace />} />
              <Route path="/upload" element={<DocumentUpload />} />
              <Route path="/success" element={<SuccessPage />} />
              <Route path="/new-patient" element={<NewPatient />} />
              <Route path="/patients" element={<Patients />} />
              <Route path="/patients/:id" element={<PatientDetail />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </AppProvider>
  </QueryClientProvider>
);

export default App;
