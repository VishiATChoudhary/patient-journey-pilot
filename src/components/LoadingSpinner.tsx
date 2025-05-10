
import React from "react";
import { useAppContext } from "@/context/AppContext";

const LoadingSpinner: React.FC = () => {
  const { mode } = useAppContext();
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className={`bg-white p-6 rounded-lg shadow-xl flex flex-col items-center ${mode === "accessibility" ? "accessibility-mode" : ""}`}>
        <div className="w-12 h-12 rounded-full border-4 border-healthcare-blue border-t-transparent animate-spin mb-4"></div>
        <p className={`text-gray-700 ${mode === "accessibility" ? "text-xl" : "text-base"}`}>
          Processing...
        </p>
      </div>
    </div>
  );
};

export default LoadingSpinner;
