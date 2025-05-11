import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const FinalPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="max-w-4xl w-full space-y-8 text-center">
        <h1 className="text-4xl font-bold text-black mb-4">
          You are all set 🚀
        </h1>
        
        <Button 
          onClick={() => navigate("/")}
          className="bg-black hover:bg-gray-800 text-white rounded-full px-8 py-6 text-lg"
          size="lg"
        >
          Return Home
        </Button>
      </div>
    </div>
  );
};

export default FinalPage; 