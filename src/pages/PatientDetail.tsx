import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { useAppContext } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { User, Phone, Mail, MapPin, Calendar, Heart, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import LoadingSpinner from "@/components/LoadingSpinner";
import { toast } from "sonner";

interface Patient {
  id: string;
  name: string;
  surname: string;
  birthdate: string;
  gender: number;
  email: string;
  phone: string;
  street: string;
  city: string;
  plz: number;
  country: string;
  height: number;
  weight: number;
  insurance_provider: string;
  insurance_number: number;
}

const PatientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { mode } = useAppContext();
  const { user } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchPatientDetails() {
      if (!id || !user) return;
      
      try {
        const { data, error } = await supabase
          .from("patients")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;
        setPatient(data);
      } catch (error) {
        console.error("Error fetching patient details:", error);
        toast.error("Error fetching patient details");
      } finally {
        setIsLoading(false);
      }
    }

    fetchPatientDetails();
  }, [id, user]);

  const getGenderLabel = (gender: number) => {
    const genders = ["Female", "Male", "Non-binary", "Other"];
    return genders[gender] || "Not specified";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-uber-gray-50 flex flex-col">
        <Header title="Patient Details" showBackButton />
        <div className="flex-grow flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-uber-gray-50 flex flex-col">
        <Header title="Patient Not Found" showBackButton />
        <div className="flex-grow flex items-center justify-center flex-col p-4">
          <div className="text-center">
            <h2 className="text-2xl font-medium text-uber-gray-800 mb-4">Patient not found</h2>
            <p className="text-uber-gray-600 mb-6">The patient you're looking for doesn't exist or has been removed.</p>
            <Button 
              onClick={() => navigate("/patients")}
              className="bg-uber-black text-white hover:bg-uber-gray-800"
            >
              Return to Patients
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-uber-gray-50 flex flex-col ${mode === "accessibility" ? "accessibility-mode" : ""}`}>
      <Header title="Patient Details" showBackButton />
      
      <main className="flex-grow p-4">
        <div className="w-full max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className={`font-semibold text-uber-black ${mode === "accessibility" ? "text-2xl" : "text-xl"}`}>
              {patient.name} {patient.surname}
            </h2>
            <Button 
              onClick={() => navigate("/upload")}
              className="bg-uber-black text-white hover:bg-uber-gray-800"
            >
              <FileText size={16} className="mr-2" />
              Upload Documents
            </Button>
          </div>
          
          <div className="space-y-5">
            {/* Personal Information */}
            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-start gap-3 mb-4">
                  <User size={20} className="text-uber-gray-600 mt-1" />
                  <div>
                    <h3 className="font-medium text-lg">Personal Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 mt-3">
                      <div className="py-2">
                        <p className="text-sm text-uber-gray-500">Full Name</p>
                        <p className="font-medium">{patient.name} {patient.surname}</p>
                      </div>
                      <div className="py-2">
                        <p className="text-sm text-uber-gray-500">Gender</p>
                        <p className="font-medium">{getGenderLabel(patient.gender)}</p>
                      </div>
                      <div className="py-2 flex items-center gap-2">
                        <Calendar size={16} className="text-uber-gray-500" />
                        <div>
                          <p className="text-sm text-uber-gray-500">Date of Birth</p>
                          <p className="font-medium">{new Date(patient.birthdate).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Contact Information */}
            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-start gap-3 mb-4">
                  <Phone size={20} className="text-uber-gray-600 mt-1" />
                  <div>
                    <h3 className="font-medium text-lg">Contact Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 mt-3">
                      <div className="py-2 flex items-center gap-2">
                        <Phone size={16} className="text-uber-gray-500" />
                        <div>
                          <p className="text-sm text-uber-gray-500">Phone</p>
                          <p className="font-medium">{patient.phone}</p>
                        </div>
                      </div>
                      <div className="py-2 flex items-center gap-2">
                        <Mail size={16} className="text-uber-gray-500" />
                        <div>
                          <p className="text-sm text-uber-gray-500">Email</p>
                          <p className="font-medium">{patient.email}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Address */}
            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-start gap-3 mb-4">
                  <MapPin size={20} className="text-uber-gray-600 mt-1" />
                  <div>
                    <h3 className="font-medium text-lg">Address</h3>
                    <div className="mt-3">
                      <p className="font-medium">{patient.street}</p>
                      <p className="font-medium">{patient.plz} {patient.city}</p>
                      <p className="font-medium">{patient.country}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Medical Information */}
            <Card className="bg-white border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-start gap-3 mb-4">
                  <Heart size={20} className="text-uber-gray-600 mt-1" />
                  <div>
                    <h3 className="font-medium text-lg">Medical Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 mt-3">
                      <div className="py-2">
                        <p className="text-sm text-uber-gray-500">Height</p>
                        <p className="font-medium">{patient.height} cm</p>
                      </div>
                      <div className="py-2">
                        <p className="text-sm text-uber-gray-500">Weight</p>
                        <p className="font-medium">{patient.weight} kg</p>
                      </div>
                      <div className="py-2">
                        <p className="text-sm text-uber-gray-500">Insurance Provider</p>
                        <p className="font-medium">{patient.insurance_provider}</p>
                      </div>
                      <div className="py-2">
                        <p className="text-sm text-uber-gray-500">Insurance Number</p>
                        <p className="font-medium">{patient.insurance_number}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PatientDetail;
