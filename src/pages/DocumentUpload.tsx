
import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAppContext, Document } from "@/context/AppContext";
import { uploadDocument } from "@/lib/supabase";
import Header from "@/components/Header";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Upload, X, ImagePlus } from "lucide-react";
import { toast } from "sonner";

const DocumentUpload: React.FC = () => {
  const { mode, addUploadedDocument } = useAppContext();
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  
  // Default patientId as a UUID string instead of a number
  const patientId = "00000000-0000-0000-0000-000000000000";
  
  // If in accessibility mode, redirect to home
  React.useEffect(() => {
    if (mode === "accessibility") {
      toast.error("File uploads are not available in Fine Wine Aged Mode");
      navigate("/");
    }
  }, [mode, navigate]);
  
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      const newFiles = Array.from(selectedFiles);
      setFiles(prev => [...prev, ...newFiles]);
      
      // Generate previews
      newFiles.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };
  
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };
  
  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
    setPreviews(previews.filter((_, i) => i !== index));
  };
  
  const handleSubmit = async () => {
    if (files.length === 0) {
      toast.error("Please select at least one document to upload");
      return;
    }
    
    setIsLoading(true);
    
    try {
      for (const file of files) {
        const result = await uploadDocument(file, patientId);
        if (result.success) {
          const documentObj: Document = {
            id: Date.now().toString(),
            url: result.url,
            name: file.name
          };
          
          addUploadedDocument(documentObj);
        } else {
          throw new Error("Failed to upload document");
        }
      }
      
      toast.success("Documents uploaded successfully!");
      navigate("/success");
    } catch (error) {
      console.error("Error uploading documents:", error);
      toast.error("Failed to upload documents. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  // If in accessibility mode, don't render the upload UI
  if (mode === "accessibility") {
    return null;
  }
  
  return (
    <div className="min-h-screen bg-uber-gray-50 flex flex-col">
      <Header title="Upload Documents" showBackButton />
      
      {isLoading && <LoadingSpinner />}
      
      <main className="flex-grow p-4">
        <div className="w-full max-w-md mx-auto space-y-5">
          <Card className="p-6 bg-white border-0 shadow-sm rounded-lg">
            <h2 className="font-semibold text-uber-black mb-5 text-xl">
              Upload Medical Documents
            </h2>
            
            <p className="text-uber-gray-600 mb-6">
              Please upload your medical documents, prescriptions, or test results.
            </p>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*"
              multiple
            />
            
            <div className="mb-6">
              <Button 
                onClick={triggerFileInput}
                className="w-full bg-uber-black text-white hover:bg-uber-gray-900 h-14 flex items-center justify-center gap-3 transition-colors"
                type="button"
              >
                <ImagePlus size={22} />
                Select Documents
              </Button>
            </div>
            
            {previews.length > 0 && (
              <div className="space-y-4 mb-6">
                <h3 className="font-medium text-lg">
                  Document Preview
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  {previews.map((preview, index) => (
                    <div key={index} className="relative aspect-square rounded-md overflow-hidden border border-uber-gray-100">
                      <img 
                        src={preview} 
                        alt={`Preview ${index + 1}`} 
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => removeFile(index)}
                        className="absolute top-2 right-2 bg-uber-black bg-opacity-70 text-white rounded-full p-1.5 hover:bg-opacity-100 transition-colors"
                        aria-label="Remove file"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="pt-4 border-t border-uber-gray-100">
              <Button
                onClick={handleSubmit}
                className="w-full bg-uber-black text-white rounded-md hover:bg-uber-gray-900 h-14 text-base flex items-center justify-center gap-3"
                disabled={files.length === 0 || isLoading}
              >
                <Upload size={20} />
                Upload Documents
              </Button>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default DocumentUpload;
