
import { supabase } from "@/integrations/supabase/client";

// Document upload function with retry limit and unique filename generation
export async function uploadDocument(file: File, patientId = "00000000-0000-0000-0000-000000000000", retryCount = 0) {
  try {
    // Limit retries to prevent infinite loops
    if (retryCount >= 3) {
      console.error("Maximum retry count reached");
      return { success: false, error: "Maximum retry count reached" };
    }
    
    const fileExt = file.name.split('.').pop();
    // Make filename more unique by adding retry count and random string
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    const fileName = `${patientId}/${uniqueId}.${fileExt}`;
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
    
    // Insert record into documents_and_images table including display_name
    const { data, error } = await supabase
      .from('documents_and_images')
      .insert([
        { 
          patient_id: patientId,
          raw_input: publicUrl,
          display_name: file.name // Store the original filename in the display_name column
        }
      ])
      .select();
      
    if (error) {
      // Check if this is a duplicate key error
      if (error.code === '23505') {
        console.error("Duplicate key error - attempting with different timestamp");
        
        // If it's a duplicate key error, try again with increased retry count
        return await uploadDocument(file, patientId, retryCount + 1);
      }
      
      console.error("Database error:", error);
      throw error;
    }
    
    return { 
      success: true, 
      url: publicUrl, 
      data,
      name: file.name // Return the original filename
    };
    
  } catch (error) {
    console.error('Error uploading document:', error);
    return { success: false, error };
  }
}
