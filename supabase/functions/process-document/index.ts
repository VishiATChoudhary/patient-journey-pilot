
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Define the types for our request and response
interface ProcessDocumentRequest {
  record_id: number;
  image_url: string;
}

interface GeminiResponse {
  type: string;
  description: string;
}

// Use the serve function directly without nesting
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const requestData: ProcessDocumentRequest = await req.json();
    const { record_id, image_url } = requestData;

    console.log(`Processing document with ID: ${record_id} and URL: ${image_url}`);

    if (!image_url) {
      throw new Error("No image URL provided");
    }

    // Create Supabase client
    const supabaseUrl = "https://rkjqdxywsdikcywxggde.supabase.co";
    const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJranFkeHl3c2Rpa2N5d3hnZ2RlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4NzIwOTAsImV4cCI6MjA2MjQ0ODA5MH0.mR6mCEhgr_K_WEoZ2v_5j8AdG1jxh3pp1Nk7A4mKx44";
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Get the image content
    const imageResponse = await fetch(image_url);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
    }

    // Convert image to base64
    const imageBlob = await imageResponse.blob();
    const imageArrayBuffer = await imageBlob.arrayBuffer();
    const imageBase64 = btoa(
      String.fromCharCode(...new Uint8Array(imageArrayBuffer))
    );

    // Determine MIME type from URL or default to image/jpeg
    const mimeType = determineMimeType(image_url);

    // Call Google Gemini API
    const result = await analyzeImageWithGemini(imageBase64, mimeType);
    console.log("Gemini API result:", result);

    // Extract type and description
    const documentType = result.type;
    const documentDescription = result.description;

    // Update the database record
    const { error: updateError } = await supabase
      .from('documents_and_images')
      .update({ 
        type: documentType,
        llm_output: { description: documentDescription }
      })
      .eq('id', record_id);

    if (updateError) {
      throw new Error(`Failed to update database record: ${updateError.message}`);
    }

    console.log(`Successfully processed document ID: ${record_id}`);
    
    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Document processed successfully",
        type: documentType
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
  } catch (error) {
    console.error("Error processing document:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Failed to process document" 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});

// Function to determine MIME type from URL
function determineMimeType(url: string): string {
  const extension = url.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'png': return 'image/png';
    case 'jpg': 
    case 'jpeg': return 'image/jpeg';
    case 'gif': return 'image/gif';
    case 'pdf': return 'application/pdf';
    default: return 'image/jpeg'; // Default mime type
  }
}

// Function to analyze image with Google Gemini API
async function analyzeImageWithGemini(base64Image: string, mimeType: string): Promise<GeminiResponse> {
  const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");
  if (!GOOGLE_API_KEY) {
    throw new Error("Missing GOOGLE_API_KEY environment variable");
  }

  const geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
  
  const payload = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: "Analyze the document in this image and return only a JSON object with two fields: 'type' containing the type of document, and 'description' containing a brief description of the document's content and the date if possible. Do not include any additional text, explanations, or formatting."
          },
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Image
            }
          }
        ]
      }
    ],
    generation_config: {
      temperature: 0,
      top_p: 1,
      top_k: 32,
      max_output_tokens: 2048,
    }
  };

  try {
    const response = await fetch(`${geminiUrl}?key=${GOOGLE_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    
    // Extract JSON content from response
    let textContent = data.candidates[0]?.content?.parts?.[0]?.text;
    
    if (!textContent) {
      throw new Error("No text content in Gemini response");
    }

    // Extract JSON from the response in case it's wrapped in markdown code blocks
    const jsonMatch = textContent.match(/```(?:json)?\s*(\{.*?\})\s*```/s) || 
                     textContent.match(/(\{.*\})/s);
    
    if (jsonMatch) {
      textContent = jsonMatch[1];
    }

    try {
      const parsedJson = JSON.parse(textContent);
      return {
        type: parsedJson.type || "Unknown",
        description: parsedJson.description || "No description available"
      };
    } catch (jsonError) {
      console.error("Failed to parse JSON from Gemini response:", jsonError);
      console.debug("Raw response content:", textContent);
      throw new Error("Failed to parse JSON from Gemini response");
    }
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error(`Gemini API error: ${error.message}`);
  }
}
