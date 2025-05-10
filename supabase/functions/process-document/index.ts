
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

// Simple handler to process preflight requests
function handleOptions() {
  return new Response(null, { headers: corsHeaders });
}

// Main request handler function with proper error handling
serve(async (req: Request) => {
  console.log("Request received:", req.method, req.url);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log("Handling OPTIONS request");
    return handleOptions();
  }

  try {
    // Parse request body
    const requestData: ProcessDocumentRequest = await req.json();
    const { record_id, image_url } = requestData;
    
    console.log(`Starting to process document with ID: ${record_id} and URL: ${image_url}`);
    
    if (!image_url) {
      throw new Error("No image URL provided");
    }

    // Create Supabase client
    const supabaseUrl = "https://rkjqdxywsdikcywxggde.supabase.co";
    const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJranFkeHl3c2Rpa2N5d3hnZ2RlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4NzIwOTAsImV4cCI6MjA2MjQ0ODA5MH0.mR6mCEhgr_K_WEoZ2v_5j8AdG1jxh3pp1Nk7A4mKx44";
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Fetch the image (with timeout)
    console.log("Fetching image from URL:", image_url);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const imageResponse = await fetch(image_url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.statusText} (${imageResponse.status})`);
      }
      
      // Convert image to base64
      const imageBlob = await imageResponse.blob();
      const imageArrayBuffer = await imageBlob.arrayBuffer();
      const imageBase64 = btoa(
        String.fromCharCode(...new Uint8Array(imageArrayBuffer))
      );
      
      console.log(`Successfully fetched and encoded image (${Math.round(imageArrayBuffer.byteLength / 1024)} KB)`);

      // Determine MIME type from URL or default to image/jpeg
      const mimeType = (() => {
        const extension = image_url.split('.').pop()?.toLowerCase();
        switch (extension) {
          case 'png': return 'image/png';
          case 'jpg': 
          case 'jpeg': return 'image/jpeg';
          case 'gif': return 'image/gif';
          case 'pdf': return 'application/pdf';
          default: return 'image/jpeg';
        }
      })();

      // Call Google Gemini API
      console.log("Calling Gemini API for image analysis");
      const geminiResult = await callGeminiAPI(imageBase64, mimeType);
      console.log("Gemini API result:", geminiResult);

      // Extract type and description
      const documentType = geminiResult.type;
      const documentDescription = geminiResult.description;

      // Update the database record
      console.log(`Updating database record ${record_id} with type: ${documentType}`);
      const { error: updateError } = await supabase
        .from('documents_and_images')
        .update({ 
          type: documentType,
          llm_output: { description: documentDescription }
        })
        .eq('id', record_id);

      if (updateError) {
        console.error("Database update error:", updateError);
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
    } finally {
      // Ensure timeout is cleared even if fetch fails
      clearTimeout(timeoutId);
    }
  } catch (error) {
    console.error("Error processing document:", error);
    
    // More detailed error logging
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error",
        errorType: error instanceof Error ? error.name : "UnknownErrorType"
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});

// Function to call the Gemini API with retry and timeout
async function callGeminiAPI(base64Image: string, mimeType: string): Promise<GeminiResponse> {
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

  // Implement retry mechanism
  const MAX_RETRIES = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`Gemini API attempt ${attempt} of ${MAX_RETRIES}`);
      
      // Set a timeout for the fetch call
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      try {
        const response = await fetch(`${geminiUrl}?key=${GOOGLE_API_KEY}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Gemini API error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        console.log("Raw Gemini response received");
        
        // Extract JSON content from response
        const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!textContent) {
          throw new Error("No text content in Gemini response");
        }

        console.log("Raw text content:", textContent.substring(0, 100) + "...");

        // Try to extract JSON from the response with multiple fallback methods
        let parsedJson;
        
        // Method 1: Try direct JSON parsing
        try {
          parsedJson = JSON.parse(textContent);
        } catch (e) {
          console.log("Direct JSON parsing failed, trying to extract from markdown");
          
          // Method 2: Try to extract from markdown code blocks
          const jsonMatch = textContent.match(/```(?:json)?\s*(\{.*?\})\s*```/s) || 
                           textContent.match(/(\{.*\})/s);
          
          if (jsonMatch) {
            try {
              parsedJson = JSON.parse(jsonMatch[1]);
            } catch (e2) {
              console.log("JSON extraction from markdown failed:", e2);
              throw new Error("Failed to parse JSON from Gemini response");
            }
          } else {
            // Method 3: Try to extract any JSON-like structure
            const possibleJson = textContent.match(/\{[^]*\}/);
            if (possibleJson) {
              try {
                parsedJson = JSON.parse(possibleJson[0]);
              } catch (e3) {
                console.log("JSON extraction from text failed:", e3);
                throw new Error("Failed to extract valid JSON from Gemini response");
              }
            } else {
              throw new Error("No JSON structure found in Gemini response");
            }
          }
        }
        
        // Validate the parsed JSON has the expected fields
        console.log("Parsed JSON:", parsedJson);
        
        if (!parsedJson || typeof parsedJson !== 'object') {
          throw new Error("Invalid JSON structure in Gemini response");
        }
        
        return {
          type: parsedJson.type || "Unknown",
          description: parsedJson.description || "No description available"
        };
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error);
      lastError = error;
      
      // Only retry on certain types of errors
      if (error.name === 'AbortError' || 
          error.message.includes('fetch') || 
          error.message.includes('network')) {
        // Wait before retrying (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`Waiting ${delay}ms before next attempt...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      } else {
        // Don't retry on parsing errors or other issues
        throw error;
      }
    }
  }
  
  // If we've exhausted all retries
  throw lastError || new Error("Failed to get valid response from Gemini API after multiple attempts");
}
