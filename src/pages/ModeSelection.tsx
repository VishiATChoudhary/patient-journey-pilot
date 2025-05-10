
import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/context/AppContext";
import { PlusCircle, Upload } from "lucide-react";

const ModeSelection: React.FC = () => {
  const navigate = useNavigate();
  const { setMode } = useAppContext();
  
  const handleModeSelection = (mode: "standard" | "accessibility") => {
    setMode(mode);
    navigate("/upload");
  };
  
  return (
    <div className="min-h-screen bg-uber-white flex flex-col">
      <div className="flex-grow flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8 fade-in">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-uber-black mb-4">
              MediTake
            </h1>
            <p className="text-uber-gray-600">
              Your healthcare journey made simple
            </p>
          </div>
          
          <div className="space-y-4">
            <Button
              onClick={() => handleModeSelection("standard")}
              className="w-full bg-uber-black text-white rounded-md hover:bg-uber-gray-900 h-14 text-base flex items-center justify-center gap-3"
              size="lg"
            >
              <Upload size={20} />
              Continue in Standard Mode
            </Button>
            
            <Button
              onClick={() => handleModeSelection("accessibility")}
              className="w-full bg-uber-gray-100 text-uber-black rounded-md hover:bg-uber-gray-200 border border-uber-gray-300 h-14 text-base flex items-center justify-center gap-3 mt-2"
              variant="outline"
              size="lg"
            >
              Continue in Fine Wine Aged Mode
            </Button>
            
            <div className="relative py-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-uber-gray-200"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-background px-4 text-uber-gray-500 text-sm">or</span>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              onClick={() => navigate("/new-patient")}
              className="w-full border border-uber-gray-300 bg-white text-uber-black hover:bg-uber-gray-50 h-14 text-base flex items-center justify-center gap-3"
            >
              <PlusCircle size={20} />
              Create New Patient
            </Button>
          </div>
        </div>
      </div>
      
      <footer className="py-6 text-center text-uber-gray-500 text-sm border-t border-uber-gray-100">
        <p>© 2025 MediTake Healthcare</p>
      </footer>
    </div>
  );
};

export default ModeSelection;
