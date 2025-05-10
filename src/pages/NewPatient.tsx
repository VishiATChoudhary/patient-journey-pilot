
import React from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { useAppContext } from "@/context/AppContext";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { User, Calendar, Phone, Mail, MapPin, Heart } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Define the form validation schema
const patientFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  surname: z.string().min(1, "Surname is required"),
  birthdate: z.string().min(1, "Date of birth is required"),
  gender: z.coerce.number().min(0, "Gender is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone number is required"),
  street: z.string().min(1, "Street is required"),
  city: z.string().min(1, "City is required"),
  plz: z.coerce.number().min(1, "Postal code is required"),
  country: z.string().min(1, "Country is required"),
  height: z.coerce.number().min(1, "Height is required"),
  weight: z.coerce.number().min(1, "Weight is required"),
  insurance_provider: z.string().min(1, "Insurance provider is required"),
  insurance_number: z.coerce.number().min(1, "Insurance number is required"),
});

type PatientFormValues = z.infer<typeof patientFormSchema>;

const NewPatient: React.FC = () => {
  const { mode } = useAppContext();
  const navigate = useNavigate();

  // Initialize the form
  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: {
      name: "",
      surname: "",
      birthdate: "",
      gender: undefined,
      email: "",
      phone: "",
      street: "",
      city: "",
      plz: undefined,
      country: "",
      height: undefined,
      weight: undefined,
      insurance_provider: "",
      insurance_number: undefined,
    },
  });

  const isLoading = form.formState.isSubmitting;

  async function onSubmit(data: PatientFormValues) {
    try {
      // Insert patient data into Supabase
      const { data: patientData, error } = await supabase
        .from("patients")
        .insert([{
          name: data.name,
          surname: data.surname,
          birthdate: data.birthdate,
          gender: data.gender,
          email: data.email,
          phone: data.phone,
          street: data.street,
          city: data.city,
          plz: data.plz,
          country: data.country,
          height: data.height,
          weight: data.weight,
          insurance_provider: data.insurance_provider,
          insurance_number: data.insurance_number,
        }])
        .select();

      if (error) {
        throw error;
      }

      toast.success("Patient created successfully");
      
      // Navigate to patient detail (we'll add this route later)
      if (patientData && patientData[0]) {
        navigate(`/patients/${patientData[0].id}`);
      } else {
        navigate("/patients");
      }
    } catch (error) {
      console.error("Error creating patient:", error);
      toast.error("Failed to create patient");
    }
  }

  return (
    <div className={`min-h-screen bg-uber-gray-50 flex flex-col ${mode === "accessibility" ? "accessibility-mode" : ""}`}>
      <Header title="Create New Patient" showBackButton />
      
      <main className="flex-grow p-4 pb-20">
        <div className="w-full max-w-lg mx-auto">
          <Card className="p-6 bg-white border-0 shadow-sm rounded-lg">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-uber-black rounded-full flex items-center justify-center">
                <User size={24} className="text-white" />
              </div>
              <div>
                <h2 className={`font-semibold text-uber-black ${mode === "accessibility" ? "text-2xl" : "text-xl"}`}>
                  New Patient Registration
                </h2>
                <p className="text-uber-gray-500 text-sm mt-1">Enter patient details</p>
              </div>
            </div>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                {/* Personal Information */}
                <div className="bg-uber-gray-50 p-4 rounded-lg border border-uber-gray-100">
                  <h3 className="font-medium text-lg mb-4 flex items-center gap-2">
                    <User size={18} className="text-uber-gray-600" />
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="First name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="surname"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Last name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="birthdate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date of Birth</FormLabel>
                          <FormControl>
                            <div className="flex items-center">
                              <Calendar size={16} className="mr-2 text-uber-gray-500" />
                              <Input type="date" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gender</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(parseInt(value))}
                            defaultValue={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select gender" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="0">Female</SelectItem>
                              <SelectItem value="1">Male</SelectItem>
                              <SelectItem value="2">Non-binary</SelectItem>
                              <SelectItem value="3">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Contact Information */}
                <div className="bg-uber-gray-50 p-4 rounded-lg border border-uber-gray-100">
                  <h3 className="font-medium text-lg mb-4 flex items-center gap-2">
                    <Phone size={18} className="text-uber-gray-600" />
                    Contact Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <div className="flex items-center">
                              <Mail size={16} className="mr-2 text-uber-gray-500" />
                              <Input type="email" placeholder="Email address" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <div className="flex items-center">
                              <Phone size={16} className="mr-2 text-uber-gray-500" />
                              <Input placeholder="Phone number" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Address Information */}
                <div className="bg-uber-gray-50 p-4 rounded-lg border border-uber-gray-100">
                  <h3 className="font-medium text-lg mb-4 flex items-center gap-2">
                    <MapPin size={18} className="text-uber-gray-600" />
                    Address
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    <FormField
                      control={form.control}
                      name="street"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Street</FormLabel>
                          <FormControl>
                            <Input placeholder="Street address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input placeholder="City" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="plz"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Postal Code</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="Postal code" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <FormControl>
                            <Input placeholder="Country" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Medical Information */}
                <div className="bg-uber-gray-50 p-4 rounded-lg border border-uber-gray-100">
                  <h3 className="font-medium text-lg mb-4 flex items-center gap-2">
                    <Heart size={18} className="text-uber-gray-600" />
                    Medical Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="height"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Height (cm)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="Height in cm" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="weight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Weight (kg)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="Weight in kg" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Insurance Information */}
                <div className="bg-uber-gray-50 p-4 rounded-lg border border-uber-gray-100">
                  <h3 className="font-medium text-lg mb-4 flex items-center gap-2">
                    <Heart size={18} className="text-uber-gray-600" />
                    Insurance Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="insurance_provider"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Insurance Provider</FormLabel>
                          <FormControl>
                            <Input placeholder="Insurance provider" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="insurance_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Insurance Number</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="Insurance number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full h-12 bg-uber-black text-white hover:bg-uber-gray-800"
                >
                  {isLoading ? "Creating..." : "Create Patient"}
                </Button>
              </form>
            </Form>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default NewPatient;
