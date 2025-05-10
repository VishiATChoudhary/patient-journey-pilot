import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, X, Zap } from "lucide-react";
import { GoogleGenerativeAI } from '@google/generative-ai';
import { RealtimeClient } from '@openai/realtime-api-beta';
import { ItemType } from '@openai/realtime-api-beta/dist/lib/client.js';
import { WavRecorder, WavStreamPlayer } from '../lib/wavtools/index.js';
import instructions from '@/utils/conversation_config';

// Add RealtimeEvent type definition
interface RealtimeEvent {
  time: string;
  source: 'client' | 'server';
  count?: number;
  event: { 
    type: string;
    event_id: string;
    audio?: any;
    delta?: any;
    [key: string]: any;
  };
}

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen bg-black flex flex-col items-center justify-center p-6 text-white">
          <h2 className="text-2xl mb-4">Something went wrong</h2>
          <p className="mb-8 text-center text-red-400">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <Button 
            onClick={() => window.location.reload()}
            className="bg-white text-black hover:bg-gray-100"
          >
            Reload Page
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

const AccessibilityCamera: React.FC = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCamera, setHasCamera] = useState<boolean>(true);
  const [streamActive, setStreamActive] = useState<boolean>(false);
  const [imageDescription, setImageDescription] = useState<string>('');
  const [storageStatus, setStorageStatus] = useState<{status: string, message: string} | null>(null);
  const [queryResults, setQueryResults] = useState<string[]>([]);
  const [lastQueryTime, setLastQueryTime] = useState<number>(Date.now());
  const [apiError, setApiError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Add new state variables for conversation
  const [items, setItems] = useState<ItemType[]>([]);
  const [realtimeEvents, setRealtimeEvents] = useState<RealtimeEvent[]>([]);
  const [expandedEvents, setExpandedEvents] = useState<{[key: string]: boolean}>({});
  const [isConnected, setIsConnected] = useState(false);
  const [canPushToTalk, setCanPushToTalk] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const startTimeRef = useRef<string>(new Date().toISOString());

  // Add refs for audio handling
  const wavRecorderRef = useRef<WavRecorder>(new WavRecorder({ sampleRate: 24000 }));
  const wavStreamPlayerRef = useRef<WavStreamPlayer>(new WavStreamPlayer({ sampleRate: 24000 }));
  const clientRef = useRef<RealtimeClient>(new RealtimeClient({
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    dangerouslyAllowAPIKeyInBrowser: true,
  }));

  // Add refs for event logging
  const eventsScrollRef = useRef<HTMLDivElement>(null);
  const eventsScrollHeightRef = useRef(0);

  // Debug state
  const [debugInfo, setDebugInfo] = useState<string>('Component mounted');

  // Add VAD state
  const [vadMode, setVadMode] = useState<'manual' | 'vad'>('manual');

  // Add debug logging
  useEffect(() => {
    console.log('Component mounted');
    setDebugInfo('Component mounted and useEffect triggered');
  }, []);

  // Initialize Gemini with error handling
  const genAI = React.useMemo(() => {
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('Gemini API key is missing. Please check your .env file.');
      }
      return new GoogleGenerativeAI(apiKey);
    } catch (error) {
      console.error('Error initializing Gemini:', error);
      setApiError(error instanceof Error ? error.message : 'Failed to initialize Gemini AI');
      return null;
    }
  }, []);

  const model = React.useMemo(() => {
    try {
      if (!genAI) return null;
      return genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    } catch (error) {
      console.error('Error getting Gemini model:', error);
      setApiError(error instanceof Error ? error.message : 'Failed to load Gemini model');
      return null;
    }
  }, [genAI]);

  // Add utility for formatting time
  const formatTime = useCallback((timestamp: string) => {
    const startTime = startTimeRef.current;
    const t0 = new Date(startTime).valueOf();
    const t1 = new Date(timestamp).valueOf();
    const delta = t1 - t0;
    const hs = Math.floor(delta / 10) % 100;
    const s = Math.floor(delta / 1000) % 60;
    const m = Math.floor(delta / 60_000) % 60;
    const pad = (n: number) => {
      let s = n + '';
      while (s.length < 2) {
        s = '0' + s;
      }
      return s;
    };
    return `${pad(m)}:${pad(s)}.${pad(hs)}`;
  }, []);

  // Add conversation connection function
  const connectConversation = useCallback(async () => {
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    const wavStreamPlayer = wavStreamPlayerRef.current;

    startTimeRef.current = new Date().toISOString();
    setIsConnected(true);
    setRealtimeEvents([]);
    setItems(client.conversation.getItems());

    await wavRecorder.begin();
    await wavStreamPlayer.connect();
    await client.connect();
    
    client.sendUserMessageContent([
      {
        type: 'input_text',
        text: 'Hello! I am ready to help you navigate.',
      },
    ]);

    if (client.getTurnDetectionType() === 'server_vad') {
      await wavRecorder.record((data) => client.appendInputAudio(data.mono));
    }
  }, []);

  // Add conversation disconnect function
  const disconnectConversation = useCallback(async () => {
    setIsConnected(false);
    setRealtimeEvents([]);
    setItems([]);

    const client = clientRef.current;
    client.disconnect();

    const wavRecorder = wavRecorderRef.current;
    await wavRecorder.end();

    const wavStreamPlayer = wavStreamPlayerRef.current;
    await wavStreamPlayer.interrupt();
  }, []);

  // Add delete conversation item function
  const deleteConversationItem = useCallback(async (id: string) => {
    const client = clientRef.current;
    client.deleteItem(id);
  }, []);

  // Add recording functions
  const startRecording = async () => {
    setIsRecording(true);
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    const wavStreamPlayer = wavStreamPlayerRef.current;
    const trackSampleOffset = await wavStreamPlayer.interrupt();
    if (trackSampleOffset?.trackId && client.isConnected()) {
      const { trackId, offset } = trackSampleOffset;
      try {
        await client.cancelResponse(trackId, offset);
      } catch (error) {
        console.warn('Failed to cancel response:', error);
      }
    }
    await wavRecorder.record((data) => client.appendInputAudio(data.mono));
  };

  const stopRecording = async () => {
    setIsRecording(false);
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    await wavRecorder.pause();
    client.createResponse();
  };

  // Add auto-scroll effects
  useEffect(() => {
    if (eventsScrollRef.current) {
      const eventsEl = eventsScrollRef.current;
      const scrollHeight = eventsEl.scrollHeight;
      if (scrollHeight !== eventsScrollHeightRef.current) {
        eventsEl.scrollTop = scrollHeight;
        eventsScrollHeightRef.current = scrollHeight;
      }
    }
  }, [realtimeEvents]);

  useEffect(() => {
    const conversationEls = [].slice.call(
      document.body.querySelectorAll('[data-conversation-content]')
    );
    for (const el of conversationEls) {
      const conversationEl = el as HTMLDivElement;
      conversationEl.scrollTop = conversationEl.scrollHeight;
    }
  }, [items]);

  // Add OpenAI client setup effect
  useEffect(() => {
    const client = clientRef.current;
    const wavStreamPlayer = wavStreamPlayerRef.current;

    client.updateSession({ instructions: instructions });
    client.updateSession({ voice: 'echo' });
    client.updateSession({ input_audio_transcription: { model: 'whisper-1' } });

    // Add query_db tool
    client.addTool(
      {
        name: 'query_db',
        description: 'Queries the knowledgebase stored in the vector DB to retrieve relevant and specific context.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The query string to search the knowledgebase',
            },
          },
          required: ['query'],
        },
      },
      async ({ query }: { query: string }) => {
        try {
          const response = await fetch('http://localhost:8000/query', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query }),
          });
    
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to query database');
          }
    
          const data = await response.json();
          setQueryResults(data.results);  // Update the state with query results
          return data.results;
        } catch (error) {
          console.error('Error querying database:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to query database';
          setQueryResults([errorMessage]);
          return [errorMessage];
        }
      }
    );

    client.on('realtime.event', (realtimeEvent: RealtimeEvent) => {
      setRealtimeEvents((realtimeEvents) => {
        const lastEvent = realtimeEvents[realtimeEvents.length - 1];
        if (lastEvent?.event.type === realtimeEvent.event.type) {
          lastEvent.count = (lastEvent.count || 0) + 1;
          return realtimeEvents.slice(0, -1).concat(lastEvent);
        } else {
          return realtimeEvents.concat(realtimeEvent);
        }
      });
    });

    client.on('error', (event: any) => console.error(event));
    client.on('conversation.interrupted', async () => {
      const trackSampleOffset = await wavStreamPlayer.interrupt();
      if (trackSampleOffset?.trackId) {
        const { trackId, offset } = trackSampleOffset;
        await client.cancelResponse(trackId, offset);
      }
    });

    client.on('conversation.updated', async ({ item, delta }: any) => {
      const items = client.conversation.getItems();
      if (delta?.audio) {
        wavStreamPlayer.add16BitPCM(delta.audio, item.id);
      }
      if (item.status === 'completed' && item.formatted.audio?.length) {
        const wavFile = await WavRecorder.decode(
          item.formatted.audio,
          24000,
          24000
        );
        item.formatted.file = wavFile;
      }
      setItems(items);
    });

    setItems(client.conversation.getItems());

    return () => {
      client.reset();
    };
  }, []);

  useEffect(() => {
    let stream: MediaStream | null = null;
    
    const captureFrame = async () => {
      try {
        if (!videoRef.current || !canvasRef.current || !model) return;
        
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        
        if (!context) {
          throw new Error('Could not get canvas context');
        }

        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw current video frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert canvas to base64
        const base64Image = canvas.toDataURL('image/jpeg').split(',')[1];
        
        const response = await model.generateContent([
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image
            }
          },
          { text: "Caption this image. Be very concise, especially if nothing has changed. Be very specific about any unexpected or unusual details, such as strong emotions or actions. Be sure to always mention and accurately describe any people in the scene." }
        ]);
        
        const result = response.response;
        const text = result.text();
        setImageDescription(text);

        // Store the Gemini response in ChromaDB
        try {
          const storeResponse = await fetch('http://localhost:8000/store', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ document: text }),
          });

          const storeData = await storeResponse.json();
          
          setStorageStatus({
            status: storeData.status,
            message: storeData.message
          });

          // Clear the status after 3 seconds
          setTimeout(() => {
            setStorageStatus(null);
          }, 3000);

          if (!storeResponse.ok) {
            throw new Error(storeData.message || 'Failed to store document');
          }
        } catch (error) {
          console.error('Error storing document in ChromaDB:', error);
          setStorageStatus({
            status: 'error',
            message: `Error storing document: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
        }
      } catch (error) {
        console.error('Error in captureFrame:', error);
        setImageDescription('Error analyzing image. Please try again.');
      }
    };
    
    const startCamera = async () => {
      try {
        // First try to get the environment camera
        try {
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "environment" } 
          });
        } catch (envError) {
          console.log('Environment camera not available, trying user camera:', envError);
          // If environment camera fails, try the user camera
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: true 
          });
        }
        
        if (!videoRef.current) {
          throw new Error('Video element not found');
        }

        videoRef.current.srcObject = stream;
        setStreamActive(true);
        setCameraError(null);
        
        // Only start frame capture if we have a valid model
        if (model) {
          frameIntervalRef.current = setInterval(captureFrame, 1500);
        }
      } catch (error) {
        console.error("Error accessing camera:", error);
        setHasCamera(false);
        setCameraError(error instanceof Error ? error.message : 'Failed to access camera');
      }
    };
    
    startCamera();
    
    // Cleanup function to stop camera when component unmounts
    return () => {
      if (stream) {
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
      }
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = null;
      }
    };
  }, [model]);

  // Add polling effect for refreshing documents
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch('http://localhost:8000/query', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: "" }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch latest documents');
        }

        const data = await response.json();
        if (data.status === 'error' || !Array.isArray(data.results)) {
          throw new Error(data.message || 'No results array');
        }
        
        setQueryResults(data.results);
        setLastQueryTime(Date.now());
      } catch (error) {
        console.error('Error polling for latest documents:', error);
        setQueryResults([]);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, []);

  // Add VAD toggle function
  const changeTurnEndType = async (value: 'manual' | 'vad') => {
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    if (value === 'manual' && wavRecorder.getStatus() === 'recording') {
      await wavRecorder.pause();
    }
    client.updateSession({
      turn_detection: value === 'manual' ? null : { type: 'server_vad' },
    });
    if (value === 'vad' && client.isConnected()) {
      await wavRecorder.record((data) => client.appendInputAudio(data.mono));
    }
    setCanPushToTalk(value === 'manual');
    setVadMode(value);
  };

  const handleBackClick = () => {
    navigate("/");
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };
  
  return (
    <ErrorBoundary>
      <div className="min-h-screen w-screen bg-black flex flex-col">
        {/* Debug Info */}
        <div className="fixed top-0 left-0 bg-black/80 text-white p-2 z-50">
          Debug: {debugInfo}
        </div>

        {hasCamera ? (
          <div className="flex h-screen">
            {/* Left side - Camera */}
            <div className="w-3/4 bg-gray-900 relative">
              <video 
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              
              {/* Basic Status */}
              <div className="absolute top-4 left-4 right-4 bg-black/70 text-white p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Status</h3>
                <p className="text-sm">Camera: {streamActive ? 'Active' : 'Inactive'}</p>
                <p className="text-sm">Connection: {isConnected ? 'Connected' : 'Disconnected'}</p>
              </div>

              {/* Back Button */}
              <div className="absolute bottom-8 left-0 right-0 flex justify-center">
                <Button 
                  onClick={handleBackClick}
                  className="bg-white/20 hover:bg-white/40 backdrop-blur-sm text-white rounded-full px-8 py-6 text-lg"
                  size="lg"
                >
                  Back to Home
                  <ArrowRight size={20} />
                </Button>
              </div>
            </div>

            {/* Right side - Simple Panel */}
            <div className="w-1/4 bg-white flex flex-col">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-black font-semibold">Controls</h3>
              </div>
              <div className="p-4 space-y-4">
                {/* VAD Toggle */}
                <div className="flex items-center justify-between bg-gray-100 rounded-lg p-2">
                  <span className="text-black text-sm">Voice Mode:</span>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => changeTurnEndType('manual')}
                      className={`${
                        vadMode === 'manual'
                          ? 'bg-black hover:bg-gray-800'
                          : 'bg-gray-200 hover:bg-gray-300'
                      } text-white text-sm px-3 py-1`}
                    >
                      Manual
                    </Button>
                    <Button
                      onClick={() => changeTurnEndType('vad')}
                      className={`${
                        vadMode === 'vad'
                          ? 'bg-black hover:bg-gray-800'
                          : 'bg-gray-200 hover:bg-gray-300'
                      } text-white text-sm px-3 py-1`}
                    >
                      VAD
                    </Button>
                  </div>
                </div>

                {/* Connection Button */}
                <Button
                  onClick={isConnected ? disconnectConversation : connectConversation}
                  className={`${
                    isConnected
                      ? 'bg-black hover:bg-gray-800'
                      : 'bg-black hover:bg-gray-800'
                  } text-white w-full`}
                >
                  {isConnected ? 'Disconnect' : 'Connect'}
                  {isConnected ? <X size={16} className="ml-2" /> : <Zap size={16} className="ml-2" />}
                </Button>

                {/* Push to Talk Button (only in manual mode) */}
                {isConnected && canPushToTalk && (
                  <Button
                    onMouseDown={startRecording}
                    onMouseUp={stopRecording}
                    className={`${
                      isRecording
                        ? 'bg-black hover:bg-gray-800'
                        : 'bg-black hover:bg-gray-800'
                    } text-white w-full`}
                  >
                    {isRecording ? 'Release to Send' : 'Push to Talk'}
                  </Button>
                )}

                {/* Image Analysis Section */}
                <div className="mt-4 bg-gray-100 rounded-lg p-4">
                  <h4 className="text-black text-sm font-semibold mb-2">Visual Analysis</h4>
                  <div className="bg-white rounded p-3 min-h-[100px] max-h-[200px] overflow-y-auto">
                    {imageDescription ? (
                      <p className="text-gray-800 text-sm">{imageDescription}</p>
                    ) : (
                      <p className="text-gray-500 text-sm italic">Waiting for image analysis...</p>
                    )}
                  </div>
                  {storageStatus && (
                    <div className={`mt-2 text-xs ${
                      storageStatus.status === 'success' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {storageStatus.message}
                    </div>
                  )}
                </div>

                {/* Recent Events Section */}
                <div className="mt-4 bg-gray-100 rounded-lg p-4">
                  <h4 className="text-black text-sm font-semibold mb-2">Recent Events</h4>
                  <div className="bg-white rounded p-3 min-h-[100px] max-h-[200px] overflow-y-auto">
                    {queryResults.length > 0 ? (
                      <ul className="space-y-2">
                        {queryResults.map((result, index) => (
                          <li key={index} className="text-gray-800 text-sm">
                            {result}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-500 text-sm italic">No recent events</p>
                    )}
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Last updated: {formatTimestamp(lastQueryTime)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-screen flex flex-col items-center justify-center p-6 text-white">
            <h2 className="text-2xl mb-4">Camera Not Available</h2>
            <p className="mb-8 text-center">
              We can't access your camera. Please make sure you've granted permission or try using a device with a camera.
            </p>
            <Button 
              onClick={handleBackClick}
              className="bg-white text-black hover:bg-gray-100"
            >
              Back to Home
            </Button>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default AccessibilityCamera;
