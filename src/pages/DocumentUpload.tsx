
import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, GalleryHorizontal } from "lucide-react";
import { useAppContext } from "@/context/AppContext";
import { uploadDocument } from "@/lib/supabase";
import Header from "@/components/Header";
import { useToast } from "@/components/ui/use-toast";
import LoadingSpinner from "@/components/LoadingSpinner";

const DocumentUpload: React.FC = () => {
  const { mode, isLoading, setIsLoading, uploadedDocuments, addUploadedDocument } = useAppContext();
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    try {
      setIsLoading(true);
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Create preview
        const fileUrl = URL.createObjectURL(file);
        setPreviewImages(prev => [...prev, fileUrl]);
        
        // Upload to Supabase
        const result = await uploadDocument(file);
        
        if (result.success && result.url) {
          addUploadedDocument(result.url);
          toast({
            title: "Document uploaded successfully",
            description: "Your medical document has been uploaded.",
          });
        } else {
          toast({
            title: "Upload failed",
            description: "There was an error uploading your document. Please try again.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Error handling files:", error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGalleryClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };
  
  const handleSubmit = () => {
    if (previewImages.length === 0) {
      toast({
        title: "No documents",
        description: "Please upload at least one document before submitting.",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Documents submitted",
      description: `Successfully submitted ${previewImages.length} document(s).`,
    });
    
    // In a real app, we would navigate to the next step
    navigate("/success");
  };
  
  return (
    <div className={`min-h-screen bg-healthcare-lightGray flex flex-col ${mode === "accessibility" ? "accessibility-mode" : ""}`}>
      <Header title="Upload Medical Documents" showBackButton />
      
      {isLoading && <LoadingSpinner />}
      
      <main className="flex-grow p-6">
        <div className="w-full max-w-md mx-auto space-y-6">
          <Card className="p-6">
            <h2 className={`${mode === "accessibility" ? "text-2xl" : "text-xl"} font-semibold mb-4`}>
              Upload Your Medical Documents
            </h2>
            
            <p className="text-gray-600 mb-6">
              Take a photo or upload existing documents from your device.
            </p>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <Button 
                onClick={handleCameraClick}
                className="py-8 flex flex-col items-center gap-2 bg-healthcare-blue hover:bg-blue-700"
              >
                <Camera size={mode === "accessibility" ? 36 : 24} />
                <span>Take Photo</span>
              </Button>
              
              <Button 
                onClick={handleGalleryClick}
                className="py-8 flex flex-col items-center gap-2 bg-healthcare-blue hover:bg-blue-700"
              >
                <GalleryHorizontal size={mode === "accessibility" ? 36 : 24} />
                <span>Gallery</span>
              </Button>
            </div>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*"
              multiple
            />
            
            <input
              type="file"
              ref={cameraInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*"
              capture="environment"
            />
            
            {previewImages.length > 0 && (
              <div className="mt-6">
                <h3 className={`${mode === "accessibility" ? "text-xl" : "text-lg"} font-medium mb-3`}>
                  Uploaded Documents ({previewImages.length})
                </h3>
                
                <div className="grid grid-cols-2 gap-3">
                  {previewImages.map((src, index) => (
                    <div key={index} className="relative rounded-lg overflow-hidden aspect-square">
                      <img 
                        src={src} 
                        alt={`Document ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
          
          <div className="flex justify-end">
            <Button 
              onClick={handleSubmit}
              disabled={previewImages.length === 0}
              className={`px-8 ${mode === "accessibility" ? "text-xl py-6" : ""} bg-healthcare-green hover:bg-green-600`}
            >
              Submit Documents
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DocumentUpload;
