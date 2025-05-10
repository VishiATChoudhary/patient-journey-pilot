
import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/context/AppContext";
import { PlusCircle, Upload, Wine } from "lucide-react";
import { toast } from "sonner";

const ModeSelection: React.FC = () => {
  const navigate = useNavigate();
  const { setMode } = useAppContext();
  
  const handleModeSelection = (mode: "standard" | "accessibility") => {
    setMode(mode);
    
    if (mode === "accessibility") {
      toast.info("Fine Wine Aged Mode activated.");
      navigate("/accessibility-mode");
    } else {
      navigate("/upload");
    }
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
            
            <div className="wine-button-container w-full h-14 relative mt-2">
              <button
                onClick={() => handleModeSelection("accessibility")}
                className="wine-button group w-full h-full border border-uber-gray-300 bg-white text-uber-black rounded-md flex items-center justify-center gap-3 overflow-hidden relative z-10"
              >
                <div className="wine-fill absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#8e0c25] to-[#bf1a36] h-0 group-hover:h-full transition-all duration-[1.5s] ease-out z-0"></div>
                <div className="wine-contents flex items-center justify-center gap-3 relative z-10 w-full h-full group-hover:text-white transition-colors duration-1000">
                  <Wine size={20} className="wine-icon" />
                  <span className="font-medium">Continue in Fine Wine Aged Mode</span>
                </div>
              </button>
            </div>
            
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

      {/* Add CSS for the wine glass animation */}
      <style jsx>{`
        @keyframes wine-slosh {
          0% { transform: translateX(0); }
          25% { transform: translateX(2px); }
          50% { transform: translateX(-2px); }
          75% { transform: translateX(1px); }
          100% { transform: translateX(0); }
        }
        
        .wine-button-container:hover .wine-fill {
          animation: wine-slosh 0.5s ease-in-out forwards;
          animation-delay: 1.5s;
        }
        
        .wine-button:focus-visible {
          outline: 2px solid #276EF1;
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
};

export default ModeSelection;
