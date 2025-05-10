
import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAppContext } from "@/context/AppContext";
import Header from "@/components/Header";

const SuccessPage: React.FC = () => {
  const { mode, uploadedDocuments, clearUploadedDocuments } = useAppContext();
  const navigate = useNavigate();
  
  const handleFinish = () => {
    clearUploadedDocuments();
    navigate("/");
  };
  
  return (
    <div className={`min-h-screen bg-healthcare-lightGray flex flex-col ${mode === "accessibility" ? "accessibility-mode" : ""}`}>
      <Header title="Success" showBackButton />
      
      <main className="flex-grow p-6 flex flex-col items-center justify-center">
        <Card className="p-8 w-full max-w-md text-center">
          <div className="w-24 h-24 bg-healthcare-green rounded-full flex items-center justify-center mx-auto mb-6">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-12 w-12 text-white" 
              viewBox="0 0 20 20" 
              fill="currentColor"
            >
              <path 
                fillRule="evenodd" 
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                clipRule="evenodd" 
              />
            </svg>
          </div>
          
          <h2 className={`font-bold mb-3 ${mode === "accessibility" ? "text-3xl" : "text-2xl"}`}>
            Documents Uploaded Successfully!
          </h2>
          
          <p className={`text-gray-600 mb-6 ${mode === "accessibility" ? "text-xl" : ""}`}>
            Your medical documents have been securely uploaded to our system.
          </p>
          
          <p className="mb-8">
            {uploadedDocuments.length} document{uploadedDocuments.length !== 1 ? "s" : ""} submitted
          </p>
          
          <div className="space-y-4">
            <Button 
              onClick={handleFinish}
              className={`w-full bg-healthcare-blue hover:bg-blue-700 ${mode === "accessibility" ? "text-xl py-6" : ""}`}
            >
              Back to Home
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default SuccessPage;
