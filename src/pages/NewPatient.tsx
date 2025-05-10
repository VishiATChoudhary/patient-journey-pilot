
import React from "react";
import Header from "@/components/Header";
import { useAppContext } from "@/context/AppContext";
import { Card } from "@/components/ui/card";

const NewPatient: React.FC = () => {
  const { mode } = useAppContext();

  return (
    <div className={`min-h-screen bg-healthcare-lightGray flex flex-col ${mode === "accessibility" ? "accessibility-mode" : ""}`}>
      <Header title="Create New Patient" showBackButton />
      
      <main className="flex-grow p-6">
        <div className="w-full max-w-md mx-auto">
          <Card className="p-6">
            <h2 className={`${mode === "accessibility" ? "text-2xl" : "text-xl"} font-semibold mb-4`}>
              Patient Creation
            </h2>
            
            <p className="text-gray-600 mb-6">
              This functionality will be implemented in the next phase.
            </p>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default NewPatient;
