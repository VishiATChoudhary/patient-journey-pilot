
import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/context/AppContext";
import Header from "@/components/Header";
import { Check, FileText, Home, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const SuccessPage: React.FC = () => {
  const { mode, uploadedDocuments, clearUploadedDocuments } = useAppContext();
  const navigate = useNavigate();
  
  const handleFinish = () => {
    clearUploadedDocuments();
    navigate("/");
  };
  
  const handleViewDocuments = () => {
    // Future implementation for document viewing
    console.log("View documents clicked");
  };
  
  return (
    <div className={`min-h-screen bg-uber-gray-50 flex flex-col ${mode === "accessibility" ? "accessibility-mode" : ""}`}>
      <Header title="Upload Complete" showBackButton />
      
      <main className="flex-grow p-6 flex flex-col items-center justify-center">
        <div className="w-full max-w-md bg-white rounded-xl shadow-sm p-8 fade-in">
          <div className="w-20 h-20 bg-uber-green rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="h-10 w-10 text-white" strokeWidth={3} />
          </div>
          
          <h2 className={`font-bold text-uber-black text-center mb-2 ${mode === "accessibility" ? "text-3xl" : "text-2xl"}`}>
            Documents Uploaded Successfully
          </h2>
          
          <p className={`text-uber-gray-600 text-center mb-6 ${mode === "accessibility" ? "text-xl" : "text-base"}`}>
            Your medical documents have been securely uploaded to our system.
          </p>
          
          {uploadedDocuments.length > 0 && (
            <Card className="bg-uber-gray-50 border-0 mb-6">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-uber-gray-700 font-medium">
                    {uploadedDocuments.length} {uploadedDocuments.length === 1 ? "Document" : "Documents"}
                  </span>
                  <span className="text-uber-green font-medium">Complete</span>
                </div>
                
                <div className="space-y-2 max-h-[150px] overflow-auto">
                  {uploadedDocuments.map((doc, index) => (
                    <div key={doc.id} className="flex items-center gap-3 py-2 border-t border-uber-gray-100">
                      <FileText size={18} className="text-uber-gray-500 flex-shrink-0" />
                      <span className="text-uber-gray-700 text-sm truncate flex-grow">
                        {doc.name || `Document ${index + 1}`}
                      </span>
                      <Check size={16} className="text-uber-green flex-shrink-0" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          <div className="space-y-4">
            <Button 
              onClick={handleViewDocuments}
              className="w-full bg-white text-uber-black border border-uber-gray-300 rounded-md hover:bg-uber-gray-100 h-14 text-base flex items-center justify-center gap-3"
            >
              View Documents
              <ArrowRight size={18} />
            </Button>
            
            <Button 
              onClick={handleFinish}
              className="w-full bg-uber-black text-white rounded-md hover:bg-uber-gray-900 h-14 text-base flex items-center justify-center gap-3"
            >
              Back to Home
              <Home size={18} />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SuccessPage;
