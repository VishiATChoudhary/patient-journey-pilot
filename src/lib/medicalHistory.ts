import { supabase } from "@/integrations/supabase/client";

export interface MedicalHistoryQuestion {
  id: number;
  question: string;
  created_at: string;
  // Add other fields as needed
}

export async function getMostRecentQuestions(limit: number = 10): Promise<MedicalHistoryQuestion[]> {
  try {
    let { data: medical_history_form, error } = await supabase
      .from('medical_history_form')
      .select('*');

    if (error) {
      throw error;
    }

    return medical_history_form || [];
  } catch (error) {
    console.error('Error fetching medical history questions:', error);
    throw error;
  }
}

// Test function
export async function testGetMostRecentQuestions() {
  try {
    console.log('Fetching all medical history questions...');
    let { data: medical_history_form, error } = await supabase
      .from('medical_history_form')
      .select('*');

    if (error) {
      throw error;
    }

    console.log('Table contents:', medical_history_form);
    console.log('Number of entries:', medical_history_form?.length || 0);
    return medical_history_form;
  } catch (error) {
    console.error('Test failed:', error);
    throw error;
  }
} 