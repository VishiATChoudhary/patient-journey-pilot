
import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Camera } from "lucide-react";

const AccessibilityMode: React.FC = () => {
  const navigate = useNavigate();
  
  const handleStartCamera = async () => {
    try {
      // Request camera access
      await navigator.mediaDevices.getUserMedia({ video: true });
      
      // If access granted, navigate to camera view
      navigate("/accessibility-camera");
    } catch (error) {
      console.error("Error accessing camera:", error);
      alert("Unable to access camera. Please make sure you've granted permission.");
    }
  };
  
  return (
    <div className="min-h-screen bg-uber-white flex flex-col">
      <div className="flex-grow flex flex-col items-center justify-center p-6">
        <Card className="w-full max-w-lg shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Fine Wine Aged Mode</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center mb-4">
              This mode is designed for users who prefer a simpler, more accessible experience.
            </p>
            
            <div className="space-y-4 text-uber-gray-700">
              <p>
                <strong>• Camera-Based Assistance:</strong> We'll use your device's camera to help you read and identify your medications.
              </p>
              <p>
                <strong>• Clear Visual Guidance:</strong> Larger text and high contrast displays make information easier to read.
              </p>
              <p>
                <strong>• Simplified Navigation:</strong> Fewer steps and clearer instructions to complete your tasks.
              </p>
              <p>
                <strong>• Voice Assistance:</strong> Get help through audio guidance (coming soon).
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleStartCamera}
              className="w-full bg-uber-black text-white rounded-md hover:bg-uber-gray-900 h-14 text-base flex items-center justify-center gap-3"
              size="lg"
            >
              <Camera size={20} />
              Start Camera Assistance
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      <footer className="py-6 text-center text-uber-gray-500 text-sm border-t border-uber-gray-100">
        <p>© 2025 MediTake Healthcare</p>
      </footer>
    </div>
  );
};

export default AccessibilityMode;
