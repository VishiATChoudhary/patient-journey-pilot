
import { supabase } from "@/integrations/supabase/client";

// Document upload function
export async function uploadDocument(file: File, patientId = 1) {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${patientId}/${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;
    
    // Upload file to storage bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
      
    if (uploadError) {
      throw uploadError;
    }
    
    // Get public URL for the file
    const { data: urlData } = supabase.storage
      .from('images')
      .getPublicUrl(filePath);
      
    const publicUrl = urlData.publicUrl;
    
    // Insert record into documents_and_images table
    const { data, error } = await supabase
      .from('documents_and_images')
      .insert([
        { 
          type: 'docs', 
          raw_input: publicUrl, 
          patient_id: patientId 
        }
      ])
      .select();
      
    if (error) {
      throw error;
    }
    
    return { success: true, url: publicUrl, data };
    
  } catch (error) {
    console.error('Error uploading document:', error);
    return { success: false, error };
  }
}
