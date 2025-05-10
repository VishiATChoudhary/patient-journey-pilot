
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

// Circuit breaker implementation
let isCircuitBroken = false;
let consecutiveErrors = 0;
const CIRCUIT_THRESHOLD = 3;

function resetCircuit() {
  console.log("Resetting circuit breaker");
  isCircuitBroken = false;
  consecutiveErrors = 0;
}

function breakCircuit() {
  console.log("Circuit breaker activated - temporarily disabling function");
  isCircuitBroken = true;
  setTimeout(resetCircuit, 60000); // Reset after 1 minute
}

// Completely flat implementation without recursion
serve(async (req) => {
  console.log("Request received:", req.method, req.url);
  
  // Check for circuit breaker
  if (isCircuitBroken) {
    console.log("Circuit breaker is active - rejecting request");
    return new Response(
      JSON.stringify({ success: false, error: 'Service temporarily unavailable due to errors' }), 
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 503
      }
    );
  }
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log("Handling OPTIONS request");
    return new Response(null, { headers: corsHeaders });
  }

  // Process only POST requests
  if (req.method !== 'POST') {
    console.log(`Rejecting non-POST request: ${req.method}`);
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 405
      }
    );
  }

  try {
    // Parse request body with explicit error handling
    let requestData: ProcessDocumentRequest;
    try {
      requestData = await req.json();
    } catch (parseError) {
      console.error("Failed to parse request JSON:", parseError);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON body' }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400
        }
      );
    }

    const { record_id, image_url } = requestData;
    
    // Input validation
    if (!record_id || typeof record_id !== 'number') {
      console.error("Missing or invalid record_id");
      return new Response(
        JSON.stringify({ success: false, error: 'Missing or invalid record_id' }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400
        }
      );
    }
    
    if (!image_url || typeof image_url !== 'string') {
      console.error("Missing or invalid image_url");
      return new Response(
        JSON.stringify({ success: false, error: 'Missing or invalid image_url' }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400
        }
      );
    }
    
    console.log(`Processing document with ID: ${record_id} and URL: ${image_url}`);
    
    // Create Supabase client
    const supabaseUrl = "https://rkjqdxywsdikcywxggde.supabase.co";
    const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJranFkeHl3c2Rpa2N5d3hnZ2RlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4NzIwOTAsImV4cCI6MjA2MjQ0ODA5MH0.mR6mCEhgr_K_WEoZ2v_5j8AdG1jxh3pp1Nk7A4mKx44";
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // STEP 1: Fetch the image with timeout - REWRITTEN TO AVOID RECURSION
    console.log("Fetching image from URL:", image_url);
    let imageBase64: string;
    let mimeType: string;
    
    try {
      // Create a manually controlled fetch with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      // Fetch the image with controlled signal
      const imageResponse = await fetch(image_url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.statusText} (${imageResponse.status})`);
      }
      
      // Get the image as a blob - NON-RECURSIVE APPROACH
      const imageBlob = await imageResponse.blob();
      
      // Check if the image is too large
      if (imageBlob.size > 10 * 1024 * 1024) { // 10MB limit
        throw new Error(`Image too large: ${Math.round(imageBlob.size / 1024 / 1024)}MB (max 10MB)`);
      }
      
      // Process the image in chunks to avoid memory issues
      // Use arrayBuffer directly instead of recursive/iterative approach
      const imageArrayBuffer = await imageBlob.arrayBuffer();
      
      // Convert to base64 using a non-recursive approach with fixed-size chunks
      // This is a key change to avoid stack overflow
      const bytes = new Uint8Array(imageArrayBuffer);
      const chunkSize = 1024; // Process in 1KB chunks to avoid stack issues
      let binary = '';
      
      // Process bytes in chunks using iteration instead of recursion
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.slice(i, Math.min(i + chunkSize, bytes.length));
        for (let j = 0; j < chunk.length; j++) {
          binary += String.fromCharCode(chunk[j]);
        }
      }
      
      // Convert binary string to base64 in one operation
      imageBase64 = btoa(binary);
      
      console.log(`Successfully fetched and encoded image (${Math.round(imageArrayBuffer.byteLength / 1024)} KB)`);

      // Determine MIME type from URL or default to image/jpeg
      mimeType = (() => {
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
    } catch (imageError) {
      console.error("Error fetching image:", imageError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to fetch or process image: ${imageError.message}` 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500
        }
      );
    }

    // STEP 2: Call Gemini API with retries - NON-RECURSIVE IMPLEMENTATION
    console.log("Calling Gemini API for image analysis");
    let geminiResult: GeminiResponse;
    
    try {
      geminiResult = await callGeminiAPIFlat(imageBase64, mimeType);
      console.log("Gemini API result:", geminiResult);
      
      if (!geminiResult || typeof geminiResult !== 'object') {
        throw new Error("Invalid response structure from Gemini API");
      }
      
      if (!geminiResult.type || !geminiResult.description) {
        console.warn("Gemini API returned incomplete data:", geminiResult);
        // Provide default values if missing
        geminiResult = {
          type: geminiResult.type || "Unknown document",
          description: geminiResult.description || "No description available"
        };
      }
    } catch (geminiError) {
      console.error("Error calling Gemini API:", geminiError);
      
      // Increment consecutive errors and check circuit breaker
      consecutiveErrors++;
      if (consecutiveErrors >= CIRCUIT_THRESHOLD) {
        breakCircuit();
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to analyze document with Gemini API: ${geminiError.message}` 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500
        }
      );
    }

    // STEP 3: Update database
    console.log(`Updating database record ${record_id} with type: ${geminiResult.type}`);
    try {
      const { error: updateError } = await supabase
        .from('documents_and_images')
        .update({ 
          type: geminiResult.type,
          llm_output: { description: geminiResult.description }
        })
        .eq('id', record_id);

      if (updateError) {
        console.error("Database update error:", updateError);
        throw new Error(`Failed to update database record: ${updateError.message}`);
      }
    } catch (dbError) {
      console.error("Error updating database:", dbError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to update database: ${dbError.message}` 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500
        }
      );
    }

    // Success path - reset consecutive errors
    consecutiveErrors = 0;
    
    console.log(`Successfully processed document ID: ${record_id}`);
    
    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Document processed successfully",
        type: geminiResult.type
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
  } catch (error) {
    // Increment consecutive errors and check circuit breaker
    consecutiveErrors++;
    if (consecutiveErrors >= CIRCUIT_THRESHOLD) {
      breakCircuit();
    }
    
    console.error("Unhandled error processing document:", error);
    
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

// Completely flat (non-recursive) implementation of Gemini API calling
async function callGeminiAPIFlat(base64Image: string, mimeType: string): Promise<GeminiResponse> {
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

  // Implement retry mechanism - NON-RECURSIVE
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
        
        // Iterative (non-recursive) JSON parsing with multiple strategies
        let parsedJson: GeminiResponse | null = null;
        
        // Method 1: Direct JSON parsing
        try {
          parsedJson = JSON.parse(textContent);
        } catch (e) {
          console.log("Direct JSON parsing failed:", e);
        }
        
        // Method 2: Extract from markdown code blocks
        if (!parsedJson) {
          try {
            const jsonMatch = textContent.match(/```(?:json)?\s*(\{.*?\})\s*```/s) || 
                             textContent.match(/(\{.*\})/s);
            if (jsonMatch) {
              parsedJson = JSON.parse(jsonMatch[1]);
            }
          } catch (e) {
            console.log("JSON extraction from markdown failed:", e);
          }
        }
        
        // Method 3: Extract any JSON-like structure
        if (!parsedJson) {
          try {
            const possibleJson = textContent.match(/\{[^]*\}/);
            if (possibleJson) {
              parsedJson = JSON.parse(possibleJson[0]);
            }
          } catch (e) {
            console.log("JSON extraction from text failed:", e);
          }
        }
        
        // Method 4: Basic fallback with regex extraction
        if (!parsedJson) {
          try {
            const typeMatch = textContent.match(/["']type["']\s*:\s*["']([^"']+)["']/);
            const descMatch = textContent.match(/["']description["']\s*:\s*["']([^"']+)["']/);
            
            if (typeMatch || descMatch) {
              parsedJson = {
                type: typeMatch ? typeMatch[1] : "Unknown",
                description: descMatch ? descMatch[1] : "No description available"
              };
            }
          } catch (e) {
            console.log("Regex extraction failed:", e);
          }
        }
        
        // If all parsing methods failed
        if (!parsedJson) {
          throw new Error("Failed to extract valid JSON from Gemini response");
        }
        
        console.log("Parsed JSON:", parsedJson);
        
        // Return the parsed response
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
      } else {
        // Don't retry on parsing errors or other issues
        throw error;
      }
    }
  }
  
  // If we've exhausted all retries
  throw lastError || new Error("Failed to get valid response from Gemini API after multiple attempts");
}
