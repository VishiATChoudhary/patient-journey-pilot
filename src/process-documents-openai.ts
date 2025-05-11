import { supabase } from './integrations/supabase/client';
import OpenAI from "openai";
import fs from "fs";
import path from "path";

// Initialize OpenAI client
const client = new OpenAI({
  apiKey: "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"
});

async function processDocuments() {
  try {
    console.log('Fetching documents from Supabase...');
    
    // Fetch all documents
    const { data: documents, error } = await supabase
      .from('documents_and_images')
      .select('*');

    if (error) {
      throw new Error(`Error fetching documents: ${error.message}`);
    }

    if (!documents || documents.length === 0) {
      console.log('No documents found.');
      return;
    }

    // Aggregate all document info into a single string
    const docSummaries = documents.map((doc, idx) => {
      return `Document #${idx + 1}\nType: ${doc.type}\nDescription: ${doc.llm_output?.description || 'No previous description'}\nURL: ${doc.raw_input}\n`;
    }).join('\n---\n');

    const prompt = `You are a medical records analyst. Here are a set of medical documents for a single patient.\n\n${docSummaries}\n\nPlease write a comprehensive, structured report summarizing the patient's medical history, key findings, vaccination status, and any notable health concerns or recommendations. Use clear sections and bullet points where appropriate.`;

    // Send the aggregated prompt to OpenAI
    const completion = await client.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a medical document analysis expert. Your task is to analyze a set of medical documents and provide a detailed, accurate, and structured report."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000
    });

    const report = completion.choices[0].message.content;
    console.log("\n===== AGGREGATED MEDICAL REPORT =====\n");
    console.log(report);
    console.log("\n===== END OF REPORT =====\n");

    // Convert report to speech
    console.log('Converting report to speech...');
    const speechFile = path.resolve("./medical-report.mp3");
    
    const mp3 = await client.audio.speech.create({
      model: "tts-1",
      voice: "alloy",
      input: report,
      response_format: "mp3",
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    await fs.promises.writeFile(speechFile, buffer);
    console.log(`Audio report saved to: ${speechFile}`);

  } catch (error) {
    console.error('Error in processDocuments:', error);
  }
}

// Run the processing
processDocuments(); 