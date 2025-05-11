import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import OpenAI from "openai";

const FinalPage: React.FC = () => {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const generateReport = async () => {
    try {
      setIsProcessing(true);
      
      // Initialize OpenAI client with browser support
      const client = new OpenAI({
        apiKey: "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",
        dangerouslyAllowBrowser: true // Enable browser usage
      });

      // Fetch documents from Supabase
      const { data: documents, error } = await supabase
        .from('documents_and_images')
        .select('*');

      if (error) throw new Error(`Error fetching documents: ${error.message}`);
      if (!documents || documents.length === 0) {
        alert('No documents found.');
        return;
      }

      // Aggregate document info
      const docSummaries = documents.map((doc, idx) => {
        return `Document #${idx + 1}\nType: ${doc.type}\nDescription: ${doc.llm_output?.description || 'No previous description'}\nURL: ${doc.raw_input}\n`;
      }).join('\n---\n');

      // Generate report
      const completion = await client.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a medical document analysis expert. Your task is to analyze a set of medical documents and provide a detailed, accurate, and structured report."
          },
          {
            role: "user",
            content: `You are a medical records analyst. Here are a set of medical documents for a single patient.\n\n${docSummaries}\n\nPlease write a comprehensive, structured report summarizing the patient's medical history, key findings, vaccination status, and any notable health concerns or recommendations. Use clear sections and bullet points where appropriate.`
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      });

      const report = completion.choices[0].message.content;

      // Generate audio
      const mp3 = await client.audio.speech.create({
        model: "tts-1",
        voice: "alloy",
        input: report,
        response_format: "mp3",
      });

      // Convert the audio to a blob URL
      const audioBlob = new Blob([await mp3.arrayBuffer()], { type: 'audio/mp3' });
      const audioUrl = URL.createObjectURL(audioBlob);
      setAudioUrl(audioUrl);

    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error generating report. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="max-w-4xl w-full space-y-8 text-center">
        <h1 className="text-4xl font-bold text-black mb-4">
          You are all set 🚀
        </h1>
        
        <div className="space-y-4">
          <Button 
            onClick={generateReport}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-8 py-6 text-lg"
            size="lg"
            disabled={isProcessing}
          >
            {isProcessing ? 'Generating Report...' : 'Generate Medical Report & Audio Overview'}
          </Button>

          {audioUrl && (
            <div className="mt-4">
              <audio controls className="w-full">
                <source src={audioUrl} type="audio/mp3" />
                Your browser does not support the audio element.
              </audio>
            </div>
          )}
          
          <Button 
            onClick={() => navigate("/")}
            className="bg-black hover:bg-gray-800 text-white rounded-full px-8 py-6 text-lg"
            size="lg"
          >
            Return Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FinalPage; 