
import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/context/AppContext";
import Header from "@/components/Header";
import { Check, FileText, Home, ArrowRight, File } from "lucide-react";
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
        <Card className="w-full max-w-md bg-white rounded-xl shadow-sm overflow-hidden border-0">
          {/* Header with gradient */}
          <div className="bg-uber-black p-8 flex flex-col items-center">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4">
              <Check className="h-10 w-10 text-uber-black" strokeWidth={3} />
            </div>
            
            <h2 className={`font-bold text-white text-center ${mode === "accessibility" ? "text-3xl" : "text-2xl"}`}>
              Documents Uploaded Successfully
            </h2>
            
            <p className={`text-uber-gray-300 text-center mt-2 ${mode === "accessibility" ? "text-xl" : "text-base"}`}>
              Your medical documents have been securely uploaded
            </p>
          </div>
          
          <div className="p-6">
            {uploadedDocuments.length > 0 && (
              <Card className="bg-uber-gray-50 border-0 shadow-sm mb-6 overflow-hidden">
                <div className="p-4 border-b border-uber-gray-100 bg-white">
                  <div className="flex items-center justify-between">
                    <span className="text-uber-gray-700 font-medium">
                      {uploadedDocuments.length} {uploadedDocuments.length === 1 ? "Document" : "Documents"}
                    </span>
                    <div className="flex items-center gap-1 bg-uber-green/10 text-uber-green rounded-full px-3 py-1 text-xs font-medium">
                      <Check size={14} />
                      <span>Complete</span>
                    </div>
                  </div>
                </div>
                
                <CardContent className="p-0">
                  <div className="max-h-[180px] overflow-auto">
                    {uploadedDocuments.map((doc, index) => (
                      <div 
                        key={doc.id} 
                        className="flex items-center gap-3 py-3 px-4 border-b border-uber-gray-100 last:border-0 hover:bg-uber-gray-100 transition-colors"
                      >
                        <div className="w-9 h-9 bg-uber-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <File size={16} className="text-uber-gray-600" />
                        </div>
                        <span className="text-uber-gray-800 text-sm truncate flex-grow">
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
                className="w-full bg-white text-uber-black border border-uber-gray-300 rounded-md hover:bg-uber-gray-100 h-14 text-base flex items-center justify-center gap-2"
              >
                View Documents
                <ArrowRight size={18} />
              </Button>
              
              <Button 
                onClick={handleFinish}
                className="w-full bg-uber-black text-white rounded-md hover:bg-uber-gray-900 h-14 text-base flex items-center justify-center gap-2"
              >
                Back to Home
                <Home size={18} />
              </Button>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default SuccessPage;
