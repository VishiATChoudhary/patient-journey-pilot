
import { supabase } from "@/integrations/supabase/client";

// Document upload function
export async function uploadDocument(file: File, patientId = 1) {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${patientId}/${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;
    
    // Upload file to storage bucket 'images'
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
      
    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw uploadError;
    }
    
    // Get public URL for the file
    const { data: urlData } = supabase.storage
      .from('images')
      .getPublicUrl(filePath);
      
    const publicUrl = urlData.publicUrl;
    
    // Insert record into documents_and_images table without specifying document_id
    // Let Supabase auto-generate the primary key
    const { data, error } = await supabase
      .from('documents_and_images')
      .insert([
        { 
          patient_id: patientId,
          raw_input: publicUrl 
        }
      ])
      .select();
      
    if (error) {
      // Check if this is a duplicate key error
      if (error.code === '23505') {
        console.error("Duplicate key error - attempting with different timestamp");
        
        // If it's a duplicate key error, try again with a slightly different timestamp
        // This is a fallback in case multiple documents are uploaded at the exact same millisecond
        return await uploadDocument(file, patientId);
      }
      
      console.error("Database error:", error);
      throw error;
    }
    
    return { success: true, url: publicUrl, data };
    
  } catch (error) {
    console.error('Error uploading document:', error);
    return { success: false, error };
  }
}
