import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const SoundWave: React.FC = () => {
  return (
    <div className="flex items-center justify-center gap-2 h-20">
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="w-2 rounded-full animate-uber-wave"
          style={{
            height: "60px",
            animationDelay: `${i * 0.15}s`,
            background: "linear-gradient(180deg, #000000 0%, #333333 100%)"
          }}
        />
      ))}
    </div>
  );
};

const VoiceAgentPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Load the ElevenLabs Convai widget script
    const script = document.createElement('script');
    script.src = 'https://elevenlabs.io/convai-widget/index.js';
    script.async = true;
    script.type = 'text/javascript';
    document.body.appendChild(script);

    // Add custom styles for the soundwave animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes uber-wave {
        0% { 
          transform: scaleY(0.2);
          opacity: 0.3;
        }
        50% { 
          transform: scaleY(1);
          opacity: 1;
        }
        100% { 
          transform: scaleY(0.2);
          opacity: 0.3;
        }
      }
      .animate-uber-wave {
        animation: uber-wave 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        transform-origin: center;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.body.removeChild(script);
      document.head.removeChild(style);
    };
  }, []);

  const handleBackClick = () => {
    navigate("/accessibility-camera");
  };

  return (
    <div className="min-h-screen w-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="max-w-4xl w-full space-y-8">
        <h1 className="text-4xl font-bold text-black text-center mb-8">
          Voice Agent:
        </h1>
        
        {/* Soundwave Animation */}
        <div className="flex justify-center items-center min-h-[120px]">
          <SoundWave />
        </div>

        {/* ElevenLabs Convai Widget - Centered */}
        <div className="flex justify-center items-center min-h-[400px]">
          <elevenlabs-convai agent-id="IdnIBngLITfLpoP9YlLk"></elevenlabs-convai>
        </div>

        {/* Buttons Container */}
        <div className="flex justify-between w-full">
          <Button 
            onClick={handleBackClick}
            className="bg-black hover:bg-gray-800 text-white rounded-full px-8 py-6 text-lg"
            size="lg"
          >
            <ArrowRight className="rotate-180 mr-2" size={20} />
            Back to Camera
          </Button>

          <Button 
            onClick={() => navigate("/final")}
            className="bg-green-600 hover:bg-green-700 text-white rounded-full px-8 py-6 text-lg"
            size="lg"
          >
            Finish
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VoiceAgentPage; 