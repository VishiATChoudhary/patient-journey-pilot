
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { useAppContext } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { User, UserPlus } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { toast } from "sonner";

interface Patient {
  id: string;
  name: string;
  surname: string;
  birthdate: string;
  phone: string;
  email: string;
}

const Patients: React.FC = () => {
  const { mode } = useAppContext();
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchPatients() {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from("patients")
          .select("id, name, surname, birthdate, phone, email")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setPatients(data || []);
      } catch (error) {
        console.error("Error fetching patients:", error);
        toast.error("Error fetching patients");
      } finally {
        setIsLoading(false);
      }
    }

    fetchPatients();
  }, [user]);

  return (
    <div className={`min-h-screen bg-uber-gray-50 flex flex-col ${mode === "accessibility" ? "accessibility-mode" : ""}`}>
      <Header title="Patients" showBackButton />
      
      <main className="flex-grow p-4">
        <div className="w-full max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className={`font-semibold text-uber-black ${mode === "accessibility" ? "text-2xl" : "text-xl"}`}>
              Patient List
            </h2>
            <Button 
              onClick={() => navigate("/new-patient")}
              className="bg-uber-black text-white hover:bg-uber-gray-800"
            >
              <UserPlus size={16} className="mr-2" />
              New Patient
            </Button>
          </div>
          
          <Card className="bg-white border-0 shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <LoadingSpinner />
              </div>
            ) : patients.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 bg-uber-gray-100 rounded-full flex items-center justify-center mb-4">
                  <User size={28} className="text-uber-gray-600" />
                </div>
                <h3 className="text-lg font-medium text-uber-gray-800">No patients found</h3>
                <p className="text-uber-gray-500 mt-2 mb-6">Create a new patient to get started</p>
                <Button 
                  onClick={() => navigate("/new-patient")} 
                  variant="outline"
                  className="border-uber-black text-uber-black hover:bg-uber-gray-100"
                >
                  Create Patient
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Date of Birth</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patients.map((patient) => (
                      <TableRow 
                        key={patient.id}
                        className="cursor-pointer hover:bg-uber-gray-50"
                        onClick={() => navigate(`/patients/${patient.id}`)}
                      >
                        <TableCell className="font-medium">
                          {patient.name} {patient.surname}
                        </TableCell>
                        <TableCell>
                          {new Date(patient.birthdate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{patient.phone}</TableCell>
                        <TableCell>{patient.email}</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/patients/${patient.id}`);
                            }}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Patients;
