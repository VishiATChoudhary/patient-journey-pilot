
import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/context/AppContext";
import { Card } from "@/components/ui/card";

const ModeSelection: React.FC = () => {
  const navigate = useNavigate();
  const { setMode } = useAppContext();
  
  const handleModeSelection = (mode: "standard" | "accessibility") => {
    setMode(mode);
    navigate("/upload");
  };
  
  return (
    <div className="min-h-screen bg-healthcare-lightGray flex flex-col">
      <div className="flex-grow flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-healthcare-darkGray mb-2">
              Welcome to MediTake
            </h1>
            <p className="text-gray-600">
              Your healthcare journey made simple
            </p>
          </div>
          
          <div className="space-y-6">
            <Card className="p-6 hover:shadow-lg transition-shadow duration-300">
              <h2 className="text-xl font-semibold mb-3">Choose Your Experience</h2>
              <p className="text-gray-600 mb-6">
                Select the mode that best suits your needs. You can change this later in settings.
              </p>
              
              <div className="space-y-4">
                <Button
                  onClick={() => handleModeSelection("standard")}
                  className="w-full bg-healthcare-blue hover:bg-blue-700 text-white py-6"
                  size="lg"
                >
                  Standard Mode
                </Button>
                
                <Button
                  onClick={() => handleModeSelection("accessibility")}
                  className="w-full bg-healthcare-green hover:bg-green-600 text-white py-6"
                  size="lg"
                >
                  Fine Wine Aged Mode
                </Button>
              </div>
            </Card>
            
            <div className="mt-8 text-center">
              <Button 
                variant="outline" 
                onClick={() => navigate("/new-patient")}
                className="text-healthcare-blue border-healthcare-blue hover:bg-healthcare-blue hover:text-white"
              >
                Create New Patient
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <footer className="py-4 text-center text-gray-500 text-sm">
        <p>© 2025 MediTake Healthcare. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default ModeSelection;
