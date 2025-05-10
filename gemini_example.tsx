import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Add type declarations for NodeJS
declare global {
  namespace NodeJS {
    interface Timeout {}
  }
}

interface StorageStatus {
  status: string;
  message: string;
}

export function WebcamFootage() {
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [imageDescription, setImageDescription] = useState<string>('');
  const [storageStatus, setStorageStatus] = useState<StorageStatus | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Gemini
  const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY || '');
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  // Add webcam functionality
  useEffect(() => {
    let stream: MediaStream | null = null;

    const captureFrame = async () => {
      if (!videoRef.current || !canvasRef.current) return;
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (!context) return;

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw current video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert canvas to base64
      const base64Image = canvas.toDataURL('image/jpeg').split(',')[1];
      
      try {
        const response = await model.generateContent([
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image
            }
          },
          { text: "Caption this image. Be very concise, especially if nothing has changed. Be very specific about any unexpected or unusual details, such as strong emotions or actions. Be sure to always mention and accurately describe any people in the scene." }
        ]);
        
        const result = response.response;
        const text = result.text();
        setImageDescription(text);

        // Store the Gemini response in ChromaDB
        try {
          console.log('Attempting to store Visual Model response:', text.substring(0, 100) + '...');
          
          const storeResponse = await fetch('http://localhost:8000/store', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ document: text }),
          });

          const storeData = await storeResponse.json();
          console.log('Store response:', storeData);
          
          setStorageStatus({
            status: storeData.status,
            message: storeData.message
          });

          // Clear the status after 3 seconds
          setTimeout(() => {
            setStorageStatus(null);
          }, 3000);

          if (!storeResponse.ok) {
            console.error('Failed to store document in ChromaDB:', storeData);
            setStorageStatus({
              status: 'error',
              message: `Failed to store document: ${storeData.message || 'Unknown error'}`
            });
          }
        } catch (error) {
          console.error('Error storing document in ChromaDB:', error);
          setStorageStatus({
            status: 'error',
            message: `Error storing document: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
        }
      } catch (error) {
        console.error('Error analyzing image:', error);
      }
    };

    const startWebcam = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: true,
          audio: false 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsWebcamActive(true);
          
          // Start capturing frames every 1.5 seconds
          frameIntervalRef.current = setInterval(captureFrame, 1500);
        }
      } catch (err) {
        console.error('Error accessing webcam:', err);
        setIsWebcamActive(false);
      }
    };

    const stopWebcam = () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
        setIsWebcamActive(false);
        
        // Clear frame capture interval
        if (frameIntervalRef.current) {
          clearInterval(frameIntervalRef.current);
          frameIntervalRef.current = null;
        }
      }
    };

    // Start webcam when component mounts
    startWebcam();

    // Cleanup when component unmounts
    return () => {
      stopWebcam();
    };
  }, []);

  return (
    <div className="webcam-container" style={{ 
      position: 'relative',
      width: '100%',
      height: '100%'
    }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ 
          width: '100%', 
          height: '100%', 
          backgroundColor: '#f0f0f0', 
          objectFit: 'cover' 
        }}
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      {!isWebcamActive && (
        <div style={{ 
          position: 'absolute', 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)',
          color: '#666',
          textAlign: 'center',
          fontSize: '16px',
          fontWeight: '500'
        }}>
          Webcam not available
        </div>
      )}
      
      <div className="content-right" style={{
        position: 'absolute',
        top: 20,
        right: 20,
        width: '300px',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: '8px',
        padding: '15px',
        zIndex: 2
      }}>
        <div className="gemini-results">
          <h4 style={{ 
            margin: '0 0 10px 0', 
            color: '#2c3e50',
            fontSize: '16px',
            fontWeight: '600'
          }}>Visual Model Image Analysis</h4>
          {imageDescription ? (
            <p style={{ 
              margin: '0',
              color: '#495057',
              fontSize: '14px',
              lineHeight: '1.5'
            }}>{imageDescription}</p>
          ) : (
            <p style={{ 
              margin: '0',
              color: '#6c757d',
              fontSize: '14px',
              fontStyle: 'italic'
            }}>Waiting for image analysis...</p>
          )}
        </div>
        {storageStatus && (
          <div style={{
            padding: '8px',
            marginTop: '10px',
            borderRadius: '4px',
            backgroundColor: storageStatus.status === 'success' ? '#d4edda' : '#f8d7da',
            color: storageStatus.status === 'success' ? '#155724' : '#721c24',
            fontSize: '12px'
          }}>
            {storageStatus.message}
          </div>
        )}
      </div>
    </div>
  );
} 