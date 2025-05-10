
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const AccessibilityCamera: React.FC = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCamera, setHasCamera] = useState<boolean>(true);
  const [streamActive, setStreamActive] = useState<boolean>(false);
  
  useEffect(() => {
    let stream: MediaStream | null = null;
    
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: "environment" } 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setStreamActive(true);
        }
      } catch (error) {
        console.error("Error accessing camera:", error);
        setHasCamera(false);
      }
    };
    
    startCamera();
    
    // Cleanup function to stop camera when component unmounts
    return () => {
      if (stream) {
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);
  
  const handleBackClick = () => {
    navigate("/");
  };
  
  return (
    <div className="h-screen w-screen bg-black flex flex-col">
      {hasCamera ? (
        <>
          <video 
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          
          {streamActive && (
            <div className="absolute bottom-8 left-0 right-0 flex justify-center">
              <Button 
                onClick={handleBackClick}
                className="bg-white/20 hover:bg-white/40 backdrop-blur-sm text-white rounded-full px-8 py-6 text-lg"
                size="lg"
              >
                Back to Home
                <ArrowRight size={20} />
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="h-full flex flex-col items-center justify-center p-6 text-white">
          <h2 className="text-2xl mb-4">Camera Not Available</h2>
          <p className="mb-8 text-center">
            We can't access your camera. Please make sure you've granted permission or try using a device with a camera.
          </p>
          <Button 
            onClick={handleBackClick}
            className="bg-white text-black hover:bg-gray-100"
          >
            Back to Home
          </Button>
        </div>
      )}
    </div>
  );
};

export default AccessibilityCamera;
