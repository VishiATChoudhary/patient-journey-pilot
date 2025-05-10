
import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/context/AppContext";
import { PlusCircle, Upload, Wine } from "lucide-react";
import { toast } from "sonner";

const ModeSelection: React.FC = () => {
  const navigate = useNavigate();
  const { setMode } = useAppContext();
  
  const handleModeSelection = (mode: "standard" | "accessibility") => {
    setMode(mode);
    
    if (mode === "accessibility") {
      toast.info("Fine Wine Aged Mode activated.");
      navigate("/accessibility-mode");
    } else {
      navigate("/upload");
    }
  };
  
  return (
    <div className="min-h-screen bg-uber-white flex flex-col">
      <div className="flex-grow flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8 fade-in">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-uber-black mb-4">
              MediTake
            </h1>
            <p className="text-uber-gray-600">
              Your healthcare journey made simple
            </p>
          </div>
          
          <div className="space-y-4">
            <Button
              onClick={() => handleModeSelection("standard")}
              className="w-full bg-uber-black text-white rounded-md hover:bg-uber-gray-900 h-14 text-base flex items-center justify-center gap-3"
              size="lg"
            >
              <Upload size={20} />
              Continue in Standard Mode
            </Button>
            
            <div className="wine-button-container w-full h-14 relative mt-2 overflow-hidden">
              <button
                onClick={() => handleModeSelection("accessibility")}
                className="wine-button group w-full h-full border border-uber-gray-300 bg-white text-uber-black rounded-md flex items-center justify-center gap-3 overflow-hidden relative z-10"
                aria-label="Continue in Fine Wine Aged Mode"
              >
                {/* SVG Wine Glass */}
                <div className="wine-glass-svg absolute inset-0 w-full h-full pointer-events-none">
                  <svg 
                    viewBox="0 0 100 100" 
                    preserveAspectRatio="none" 
                    className="absolute inset-0 w-full h-full pointer-events-none opacity-20"
                  >
                    {/* Wine Glass Outline */}
                    <path 
                      d="M40,20 C40,20 30,25 30,35 C30,45 40,50 40,80 L60,80 C60,50 70,45 70,35 C70,25 60,20 60,20 L40,20 Z" 
                      fill="none" 
                      stroke="#1A1F2C" 
                      strokeWidth="1"
                      className="wine-glass-path"
                    />
                    {/* Glass Base */}
                    <path 
                      d="M40,80 L60,80 L55,90 L45,90 Z" 
                      fill="none" 
                      stroke="#1A1F2C" 
                      strokeWidth="1"
                    />
                  </svg>
                </div>

                {/* Liquid Container with Clipping */}
                <div className="wine-liquid-container absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
                  {/* Liquid Fill Base Layer */}
                  <div className="wine-liquid absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#5a0417] to-[#8e0c25] h-0 group-hover:h-full transition-all duration-[2.5s] ease-liquid"></div>
                  
                  {/* Liquid Wave Layer 1 */}
                  <div className="wine-wave-1 absolute bottom-0 left-0 right-0 w-full">
                    <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-[300%] h-4 opacity-70">
                      <path 
                        d="M0,24 C300,72 600,-24 900,24 C1200,72 1500,-24 1800,24 L1800,120 L0,120 Z" 
                        fill="#8e0c25"
                      ></path>
                    </svg>
                  </div>
                  
                  {/* Liquid Wave Layer 2 */}
                  <div className="wine-wave-2 absolute bottom-0 left-0 right-0 w-full">
                    <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-[300%] h-6 opacity-50">
                      <path 
                        d="M0,84 C300,30 600,114 900,84 C1200,54 1500,90 1800,84 L1800,120 L0,120 Z" 
                        fill="#bf1a36"
                      ></path>
                    </svg>
                  </div>
                  
                  {/* Bubbles */}
                  <div className="bubbles-container absolute bottom-0 left-0 right-0 h-full opacity-0 group-hover:opacity-100 transition-opacity delay-300">
                    <div className="bubble bubble-1"></div>
                    <div className="bubble bubble-2"></div>
                    <div className="bubble bubble-3"></div>
                    <div className="bubble bubble-4"></div>
                    <div className="bubble bubble-5"></div>
                  </div>

                  {/* Light Reflection */}
                  <div className="wine-reflection absolute top-0 left-0 w-0 h-full opacity-0 bg-gradient-to-br from-white to-transparent group-hover:w-full group-hover:opacity-10 transition-all duration-[2.5s] ease-out"></div>
                </div>

                {/* Button Content */}
                <div className="wine-contents flex items-center justify-center gap-3 relative z-10 w-full h-full group-hover:text-white transition-colors duration-[2.5s]">
                  <Wine size={20} className="wine-icon transition-transform duration-1000 group-hover:rotate-[-15deg]" />
                  <span className="font-medium">Continue in Fine Wine Aged Mode</span>
                </div>
              </button>
            </div>
            
            <div className="relative py-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-uber-gray-200"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-background px-4 text-uber-gray-500 text-sm">or</span>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              onClick={() => navigate("/new-patient")}
              className="w-full border border-uber-gray-300 bg-white text-uber-black hover:bg-uber-gray-50 h-14 text-base flex items-center justify-center gap-3"
            >
              <PlusCircle size={20} />
              Create New Patient
            </Button>
          </div>
        </div>
      </div>
      
      <footer className="py-6 text-center text-uber-gray-500 text-sm border-t border-uber-gray-100">
        <p>© 2025 MediTake Healthcare</p>
      </footer>

      {/* Enhanced CSS for the wine glass animation */}
      <style>{`
        /* Custom cubic-bezier for natural liquid physics */
        .ease-liquid {
          transition-timing-function: cubic-bezier(0.2, 0.8, 0.2, 1.2);
        }

        /* Wine glass path style */
        .wine-glass-path {
          fill: transparent;
          stroke-dasharray: 0;
          opacity: 0.2;
        }

        /* Wave animations */
        @keyframes wave-animation-1 {
          0% { transform: translateX(-33.33%); }
          100% { transform: translateX(-66.66%); }
        }
        
        @keyframes wave-animation-2 {
          0% { transform: translateX(-66.66%); }
          100% { transform: translateX(-33.33%); }
        }

        /* Wine slosh animation for realistic finish */
        @keyframes wine-slosh {
          0% { transform: translateY(0); }
          25% { transform: translateY(-3px) scaleY(1.03); }
          50% { transform: translateY(0) scaleY(0.97); }
          75% { transform: translateY(-1px) scaleY(1.01); }
          100% { transform: translateY(0) scaleY(1); }
        }

        /* Bubble animations */
        @keyframes bubble-rise {
          0% { 
            transform: translateY(0) scale(0); 
            opacity: 0;
          }
          10% {
            opacity: 0.8;
            transform: translateY(0) scale(1);
          }
          90% {
            opacity: 0.6;
            transform: translateY(-100px) scale(0.8);
          }
          100% { 
            transform: translateY(-120px) scale(0); 
            opacity: 0;
          }
        }

        /* Apply wave animations when hovered */
        .wine-button-container:hover .wine-wave-1 {
          animation: wave-animation-1 8s linear infinite;
        }
        
        .wine-button-container:hover .wine-wave-2 {
          animation: wave-animation-2 6s linear infinite;
        }

        /* Button focus style */
        .wine-button:focus-visible {
          outline: 2px solid #276EF1;
          outline-offset: 2px;
        }

        /* Liquid slosh animation at the end of filling */
        .wine-button-container:hover .wine-liquid {
          animation: wine-slosh 1s ease-in-out forwards;
          animation-delay: 2.5s;
        }

        /* Bubble styles */
        .bubbles-container {
          position: absolute;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        .bubble {
          position: absolute;
          background: rgba(255, 255, 255, 0.5);
          border-radius: 50%;
          opacity: 0;
        }

        .bubble-1 {
          width: 5px;
          height: 5px;
          bottom: 15%;
          left: 40%;
          animation: bubble-rise 4s ease-in infinite;
          animation-delay: 2.6s;
        }

        .bubble-2 {
          width: 7px;
          height: 7px;
          bottom: 20%;
          left: 60%;
          animation: bubble-rise 5s ease-in infinite;
          animation-delay: 3.2s;
        }

        .bubble-3 {
          width: 4px;
          height: 4px;
          bottom: 25%;
          left: 50%;
          animation: bubble-rise 3.5s ease-in infinite;
          animation-delay: 3.7s;
        }

        .bubble-4 {
          width: 6px;
          height: 6px;
          bottom: 10%;
          left: 45%;
          animation: bubble-rise 4.5s ease-in infinite;
          animation-delay: 3s;
        }

        .bubble-5 {
          width: 5px;
          height: 5px;
          bottom: 30%;
          left: 55%;
          animation: bubble-rise 3.8s ease-in infinite;
          animation-delay: 3.4s;
        }

        /* Wine button hover effect */
        .wine-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(142, 12, 37, 0.15);
          border-color: rgba(142, 12, 37, 0.3);
        }
      `}</style>
    </div>
  );
};

export default ModeSelection;
