
import React from "react";
import Header from "@/components/Header";
import { useAppContext } from "@/context/AppContext";
import { Card } from "@/components/ui/card";
import { CalendarIcon, Users } from "lucide-react";

const NewPatient: React.FC = () => {
  const { mode } = useAppContext();

  return (
    <div className={`min-h-screen bg-uber-gray-50 flex flex-col ${mode === "accessibility" ? "accessibility-mode" : ""}`}>
      <Header title="Create New Patient" showBackButton />
      
      <main className="flex-grow p-6">
        <div className="w-full max-w-md mx-auto">
          <Card className="p-6 bg-white border-0 shadow-sm rounded-lg">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-uber-black rounded-full flex items-center justify-center">
                <Users size={24} className="text-white" />
              </div>
              <div>
                <h2 className={`font-semibold text-uber-black ${mode === "accessibility" ? "text-2xl" : "text-xl"}`}>
                  Patient Creation
                </h2>
                <p className="text-uber-gray-500 text-sm mt-1">Coming soon</p>
              </div>
            </div>
            
            <div className="p-4 bg-uber-gray-50 rounded-lg border border-uber-gray-100">
              <div className="flex items-center gap-3 text-uber-gray-600">
                <CalendarIcon size={18} className="text-uber-gray-500" />
                <p>This functionality will be implemented in the next phase.</p>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default NewPatient;
