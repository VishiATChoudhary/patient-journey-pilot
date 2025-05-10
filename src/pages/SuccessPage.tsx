
import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/context/AppContext";
import Header from "@/components/Header";
import { Check, Home } from "lucide-react";

const SuccessPage: React.FC = () => {
  const { mode, uploadedDocuments, clearUploadedDocuments } = useAppContext();
  const navigate = useNavigate();
  
  const handleFinish = () => {
    clearUploadedDocuments();
    navigate("/");
  };
  
  return (
    <div className={`min-h-screen bg-uber-gray-50 flex flex-col ${mode === "accessibility" ? "accessibility-mode" : ""}`}>
      <Header title="Success" showBackButton />
      
      <main className="flex-grow p-6 flex flex-col items-center justify-center">
        <div className="w-full max-w-md bg-white rounded-lg shadow-sm p-8 text-center fade-in">
          <div className="w-20 h-20 bg-uber-green rounded-full flex items-center justify-center mx-auto mb-8">
            <Check className="h-10 w-10 text-white" />
          </div>
          
          <h2 className={`font-bold text-uber-black mb-3 ${mode === "accessibility" ? "text-3xl" : "text-2xl"}`}>
            Documents Uploaded
          </h2>
          
          <p className={`text-uber-gray-600 mb-6 ${mode === "accessibility" ? "text-xl" : ""}`}>
            Your medical documents have been securely uploaded to our system.
          </p>
          
          <p className="mb-8 text-uber-gray-500">
            {uploadedDocuments.length} document{uploadedDocuments.length !== 1 ? "s" : ""} submitted
          </p>
          
          <Button 
            onClick={handleFinish}
            className="w-full bg-uber-black text-white rounded-md hover:bg-uber-gray-900 h-14 text-base flex items-center justify-center gap-3"
          >
            <Home size={20} />
            Back to Home
          </Button>
        </div>
      </main>
    </div>
  );
};

export default SuccessPage;
