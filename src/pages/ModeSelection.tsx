
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/context/AppContext";
import { PlusCircle, Upload, Wine } from "lucide-react";
import { toast } from "sonner";
import { useWineGlassSimulation } from "@/hooks/useWineGlassSimulation";

const ModeSelection: React.FC = () => {
  const navigate = useNavigate();
  const { setMode } = useAppContext();
  const { containerRef, isMobile } = useWineGlassSimulation("wine-glass-simulation");
  
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
            
            <div 
              className="wine-button-container w-full h-14 relative mt-2 overflow-hidden"
              ref={containerRef}
            >
              <button
                onClick={() => handleModeSelection("accessibility")}
                className="wine-button group w-full h-full border border-uber-gray-300 bg-white text-uber-black rounded-md flex items-center justify-center gap-3 overflow-hidden relative z-10"
                aria-label="Continue in Fine Wine Aged Mode"
              >
                {/* Wine Glass SVG Container */}
                <div className="wine-glass-container absolute inset-0 w-full h-full pointer-events-none">
                  {/* Wine Glass Shape - More realistic glass shape */}
                  <svg 
                    viewBox="0 0 100 100" 
                    preserveAspectRatio="none" 
                    className="absolute inset-0 w-full h-full pointer-events-none opacity-20"
                  >
                    {/* Stem and Base */}
                    <path 
                      d="M50,95 C50,95 47,90 47,88 L47,75 C47,75 42,73 40,65 C38,57 40,50 40,50 L40,30 C35,20 35,15 50,15 C65,15 65,20 60,30 L60,50 C60,50 62,57 60,65 C58,73 53,75 53,75 L53,88 C53,90 50,95 50,95 Z" 
                      fill="none" 
                      stroke="#1A1F2C" 
                      strokeWidth="0.8"
                      className="wine-glass-path"
                    />
                    
                    {/* Glass Reflections - subtle light reflection */}
                    <path 
                      d="M42,25 Q41,40 43,50" 
                      fill="none" 
                      stroke="#ffffff" 
                      strokeWidth="0.5" 
                      strokeOpacity="0.5"
                      className="glass-highlight"
                    />
                    
                    <path 
                      d="M58,25 Q59,40 57,50" 
                      fill="none" 
                      stroke="#ffffff" 
                      strokeWidth="0.5" 
                      strokeOpacity="0.5"
                      className="glass-highlight"
                    />
                  </svg>
                </div>

                {/* Liquid Container with Advanced Clipping */}
                <div className="wine-liquid-container absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
                  {/* Base Liquid Fill Layer */}
                  <div className="wine-liquid absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#5a0417] to-[#8e0c25] h-0 group-hover:h-[65%] transition-all duration-[2.5s] ease-liquid"></div>
                  
                  {/* Wine Legs Effect - Side Drips */}
                  <div className="wine-legs-left absolute left-[40%] bottom-0 w-[1px] h-0 bg-gradient-to-t from-[#8e0c25] to-[#8e0c2500] opacity-0 group-hover:h-[55%] group-hover:opacity-80 transition-all delay-[2.7s] duration-[3s]"></div>
                  
                  <div className="wine-legs-right absolute left-[60%] bottom-0 w-[1px] h-0 bg-gradient-to-t from-[#8e0c25] to-[#8e0c2500] opacity-0 group-hover:h-[60%] group-hover:opacity-80 transition-all delay-[2.5s] duration-[3.2s]"></div>
                  
                  {/* Additional wine legs with different timings */}
                  <div className="wine-legs-extra1 absolute left-[45%] bottom-0 w-[2px] h-0 bg-gradient-to-t from-[#8e0c25] to-[#8e0c2500] opacity-0 group-hover:h-[48%] group-hover:opacity-60 transition-all delay-[2.9s] duration-[3.5s]"></div>
                  
                  <div className="wine-legs-extra2 absolute left-[55%] bottom-0 w-[2px] h-0 bg-gradient-to-t from-[#8e0c25] to-[#8e0c2500] opacity-0 group-hover:h-[52%] group-hover:opacity-70 transition-all delay-[3.1s] duration-[3.3s]"></div>
                  
                  {/* Multi-layered Wave Effects */}
                  <div className="wine-wave-1 absolute bottom-0 left-0 right-0 w-full">
                    <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-[300%] h-4 opacity-70">
                      <path 
                        d="M0,24 C300,72 600,-24 900,24 C1200,72 1500,-24 1800,24 L1800,120 L0,120 Z" 
                        fill="url(#wine-gradient-1)"
                      ></path>
                      <defs>
                        <linearGradient id="wine-gradient-1" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#8e0c25" stopOpacity="0.9" />
                          <stop offset="100%" stopColor="#5a0417" stopOpacity="0.95" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                  
                  {/* Second Wave Layer - Different pattern */}
                  <div className="wine-wave-2 absolute bottom-0 left-0 right-0 w-full">
                    <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-[300%] h-6 opacity-50">
                      <path 
                        d="M0,84 C300,30 600,114 900,84 C1200,54 1500,90 1800,84 L1800,120 L0,120 Z" 
                        fill="url(#wine-gradient-2)"
                      ></path>
                      <defs>
                        <linearGradient id="wine-gradient-2" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#bf1a36" stopOpacity="0.85" />
                          <stop offset="100%" stopColor="#8e0c25" stopOpacity="0.9" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                  
                  {/* Third Wave Layer - Subtle ripples */}
                  <div className="wine-wave-3 absolute bottom-0 left-0 right-0 w-full">
                    <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-[400%] h-3 opacity-40">
                      <path 
                        d="M0,60 C200,40 400,80 600,60 C800,40 1000,70 1200,60 L1200,120 L0,120 Z" 
                        fill="url(#wine-gradient-3)"
                      ></path>
                      <defs>
                        <linearGradient id="wine-gradient-3" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#d82a4a" stopOpacity="0.7" />
                          <stop offset="100%" stopColor="#bf1a36" stopOpacity="0.75" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                  
                  {/* Enhanced Bubble Animation Container */}
                  <div className="bubbles-container absolute bottom-0 left-0 right-0 h-full opacity-0 group-hover:opacity-100 transition-opacity delay-300">
                    {/* Multiple bubbles with varied sizes, positions and timings */}
                    <div className="bubble bubble-1"></div>
                    <div className="bubble bubble-2"></div>
                    <div className="bubble bubble-3"></div>
                    <div className="bubble bubble-4"></div>
                    <div className="bubble bubble-5"></div>
                    <div className="bubble bubble-6"></div>
                    <div className="bubble bubble-7"></div>
                    <div className="bubble bubble-8"></div>
                    <div className="bubble bubble-9"></div>
                    <div className="bubble bubble-10"></div>
                  </div>

                  {/* Light Refraction Effects */}
                  <div className="wine-surface-light absolute top-[35%] left-[30%] w-[40%] h-[1px] bg-white opacity-0 group-hover:opacity-40 rotate-[-5deg] blur-[2px] transition-all duration-[2.5s] delay-[2.4s]"></div>
                  <div className="wine-light-beam absolute bottom-0 left-[45%] w-[10%] h-0 group-hover:h-[50%] bg-gradient-to-t from-[#8e0c2500] via-[#ff456730] to-[#8e0c2500] opacity-0 group-hover:opacity-20 transition-all duration-[2s] delay-[2.6s] blur-[3px]"></div>
                  <div className="wine-reflection absolute top-0 left-0 w-0 h-full opacity-0 bg-gradient-to-br from-white to-transparent group-hover:w-full group-hover:opacity-10 transition-all duration-[2.5s] ease-out"></div>
                  <div className="wine-splash absolute top-[35%] left-[40%] w-[20%] h-[1px] bg-gradient-to-r from-transparent via-[#8e0c25] to-transparent scale-x-0 group-hover:scale-x-100 opacity-0 group-hover:opacity-60 group-hover:h-[2px] transition-all duration-[0.3s] delay-[0.1s]"></div>
                </div>

                {/* Button Text Content */}
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
      <style>
        {`
        /* Custom cubic-bezier for natural liquid physics */
        .ease-liquid {
          transition-timing-function: cubic-bezier(0.22, 0.61, 0.36, 1);
        }

        /* Wine glass path styles */
        .wine-glass-path {
          fill: transparent;
          stroke-dasharray: 0;
          opacity: 0.3;
        }
        
        .glass-highlight {
          opacity: 0;
          animation: glass-shine 8s ease-in-out infinite alternate;
          animation-delay: 3s;
        }

        @keyframes glass-shine {
          0% { opacity: 0; stroke-dashoffset: 100; stroke-dasharray: 100; }
          20% { opacity: 0.7; }
          80% { opacity: 0.3; }
          100% { opacity: 0; stroke-dashoffset: -100; stroke-dasharray: 100; }
        }

        /* Enhanced wave animations with varied timing */
        @keyframes wave-animation-1 {
          0% { transform: translateX(-33.33%); }
          100% { transform: translateX(-66.66%); }
        }
        
        @keyframes wave-animation-2 {
          0% { transform: translateX(-66.66%); }
          100% { transform: translateX(-33.33%); }
        }
        
        @keyframes wave-animation-3 {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0%); }
        }

        /* Wine slosh animation sequence */
        @keyframes wine-slosh {
          0% { transform: translateY(0); }
          20% { transform: translateY(-3px) scaleY(1.03); }
          40% { transform: translateY(0) scaleY(0.98); }
          60% { transform: translateY(-2px) scaleY(1.02); }
          80% { transform: translateY(0) scaleY(0.99); }
          100% { transform: translateY(-1px) scaleY(1); }
        }
        
        /* Wine legs drip animation */
        @keyframes wine-legs-drip {
          0% { transform: translateY(0) scaleY(1); opacity: 0.7; }
          80% { transform: translateY(15px) scaleY(1.2); opacity: 0.3; }
          100% { transform: translateY(20px) scaleY(1.5); opacity: 0; }
        }

        /* Enhanced bubble animations with varied paths */
        @keyframes bubble-rise-1 {
          0% { 
            transform: translateY(0) translateX(0) scale(0); 
            opacity: 0;
          }
          10% {
            opacity: 0.8;
            transform: translateY(0) translateX(0) scale(1);
          }
          70% {
            opacity: 0.6;
          }
          100% { 
            transform: translateY(-70px) translateX(5px) scale(0); 
            opacity: 0;
          }
        }
        
        @keyframes bubble-rise-2 {
          0% { 
            transform: translateY(0) translateX(0) scale(0); 
            opacity: 0;
          }
          10% {
            opacity: 0.7;
            transform: translateY(0) translateX(0) scale(1);
          }
          30% {
            transform: translateY(-30px) translateX(-3px);
          }
          100% { 
            transform: translateY(-80px) translateX(-8px) scale(0); 
            opacity: 0;
          }
        }
        
        @keyframes bubble-rise-3 {
          0% { 
            transform: translateY(0) translateX(0) scale(0); 
            opacity: 0;
          }
          10% {
            opacity: 0.6;
            transform: translateY(0) translateX(0) scale(1);
          }
          50% {
            transform: translateY(-40px) translateX(4px);
          }
          100% { 
            transform: translateY(-90px) translateX(10px) scale(0); 
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
        
        .wine-button-container:hover .wine-wave-3 {
          animation: wave-animation-3 7s linear infinite;
        }

        /* Button interaction styles */
        .wine-button:focus-visible {
          outline: 2px solid #276EF1;
          outline-offset: 2px;
        }

        /* Liquid slosh animation triggered after filling */
        .wine-button-container:hover .wine-liquid {
          animation: wine-slosh 1.2s ease-in-out forwards;
          animation-delay: 2.5s;
        }
        
        /* Wine legs animation triggered after filling */
        .wine-button-container:hover .wine-legs-left,
        .wine-button-container:hover .wine-legs-right,
        .wine-button-container:hover .wine-legs-extra1,
        .wine-button-container:hover .wine-legs-extra2 {
          animation: wine-legs-drip 3.5s ease-in-out infinite;
          animation-delay: 3.2s;
        }

        /* Enhanced bubble styles with different sizes and animations */
        .bubbles-container {
          position: absolute;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        .bubble {
          position: absolute;
          background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.3));
          border-radius: 50%;
          opacity: 0;
          box-shadow: 0 0 1px rgba(255, 255, 255, 0.5);
        }

        /* Different bubble sizes, positions and animations */
        .bubble-1 {
          width: 4px;
          height: 4px;
          bottom: 15%;
          left: 45%;
          animation: bubble-rise-1 3.5s ease-in infinite;
          animation-delay: 2.6s;
        }

        .bubble-2 {
          width: 6px;
          height: 6px;
          bottom: 20%;
          left: 53%;
          animation: bubble-rise-2 4.2s ease-in infinite;
          animation-delay: 3.2s;
        }

        .bubble-3 {
          width: 3px;
          height: 3px;
          bottom: 25%;
          left: 48%;
          animation: bubble-rise-3 3.2s ease-in infinite;
          animation-delay: 3.7s;
        }

        .bubble-4 {
          width: 5px;
          height: 5px;
          bottom: 10%;
          left: 46%;
          animation: bubble-rise-2 3.9s ease-in infinite;
          animation-delay: 3s;
        }

        .bubble-5 {
          width: 4px;
          height: 4px;
          bottom: 30%;
          left: 52%;
          animation: bubble-rise-1 3.5s ease-in infinite;
          animation-delay: 3.4s;
        }
        
        .bubble-6 {
          width: 2px;
          height: 2px;
          bottom: 22%;
          left: 44%;
          animation: bubble-rise-3 2.8s ease-in infinite;
          animation-delay: 2.9s;
        }
        
        .bubble-7 {
          width: 5px;
          height: 5px;
          bottom: 18%;
          left: 49%;
          animation: bubble-rise-1 4.5s ease-in infinite;
          animation-delay: 3.6s;
        }
        
        .bubble-8 {
          width: 3px;
          height: 3px;
          bottom: 28%;
          left: 47%;
          animation: bubble-rise-2 3.7s ease-in infinite;
          animation-delay: 2.7s;
        }
        
        .bubble-9 {
          width: 4px;
          height: 4px;
          bottom: 12%;
          left: 51%;
          animation: bubble-rise-3 3.3s ease-in infinite;
          animation-delay: 3.1s;
        }
        
        .bubble-10 {
          width: 2px;
          height: 2px;
          bottom: 35%;
          left: 50%;
          animation: bubble-rise-1 2.9s ease-in infinite;
          animation-delay: 3.8s;
        }

        /* Wine button hover effect */
        .wine-button {
          transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
        }
        
        .wine-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(142, 12, 37, 0.15);
          border-color: rgba(142, 12, 37, 0.3);
        }
        
        /* Subtle ambient animation for wine surface even when not hovered */
        @keyframes subtle-ambient {
          0% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-1px) scale(1.005); }
          100% { transform: translateY(0) scale(1); }
        }
        
        .wine-liquid {
          animation: subtle-ambient 4s ease-in-out infinite;
        }
        `}
      </style>
    </div>
  );
};

export default ModeSelection;
