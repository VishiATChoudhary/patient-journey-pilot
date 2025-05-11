import { supabase } from './integrations/supabase/client';

async function runTest() {
  try {
    console.log('Testing Supabase connection...');
    
    // Check medical_history_form table
    console.log('\nFetching medical history form data...');
    let { data: medical_history_form, error: medicalError } = await supabase
      .from('medical_history_form')
      .select('*');

    if (medicalError) {
      console.error('Error fetching medical history form:', {
        code: medicalError.code,
        message: medicalError.message,
        details: medicalError.details
      });
    } else {
      console.log('Medical history form data:', medical_history_form);
    }

    // Check documents_and_images table
    console.log('\nFetching documents and images data...');
    let { data: documents, error: docsError } = await supabase
      .from('documents_and_images')
      .select('*');

    if (docsError) {
      console.error('Error fetching documents and images:', {
        code: docsError.code,
        message: docsError.message,
        details: docsError.details
      });
    } else {
      console.log('Documents and images data:', documents);
      console.log('Number of documents:', documents?.length || 0);
    }
  } catch (error) {
    console.error('Test script failed:', error);
  }
}

runTest(); 