
import React from "react";
import { useAppContext } from "@/context/AppContext";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface HeaderProps {
  title: string;
  showBackButton?: boolean;
}

const Header: React.FC<HeaderProps> = ({ title, showBackButton = false }) => {
  const { mode } = useAppContext();
  const navigate = useNavigate();
  
  const handleBack = () => {
    navigate(-1);
  };

  return (
    <header className={`py-4 px-4 border-b border-gray-200 bg-white ${mode === "accessibility" ? "accessibility-mode" : ""}`}>
      <div className="flex items-center justify-between max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          {showBackButton && (
            <button 
              onClick={handleBack}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft size={24} />
            </button>
          )}
          <h1 className={`font-semibold ${mode === "accessibility" ? "text-2xl" : "text-xl"}`}>
            {title}
          </h1>
        </div>
      </div>
    </header>
  );
};

export default Header;
