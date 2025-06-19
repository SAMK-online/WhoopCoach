import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import { MessageCircle, Mic, Send, Volume2, VolumeX, Database, Brain, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { WhoopDayData } from '@/types/whoopData';
import { RAGService } from '@/services/ragService';

// @ts-ignore - SpeechRecognition in browser
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

interface AICoachProps {
  data: WhoopDayData;
  selectedMetric: string | null;
  dynamicMetrics?: any[];
  chartData?: any[];
}

interface Message {
  id: string;
  type: 'user' | 'coach';
  content: string;
  timestamp: Date;
}

export interface AICoachRef {
  sendMessage: (message: string) => void;
}

export const AICoach = forwardRef<AICoachRef, AICoachProps>(({ data, selectedMetric, dynamicMetrics = [], chartData = [] }, ref) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [ragService, setRagService] = useState<RAGService | null>(null);
  const [ragStats, setRagStats] = useState<any>(null);
  const [isSpeechEnabled, setIsSpeechEnabled] = useState(true);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentStreamingMessageId, setCurrentStreamingMessageId] = useState<string | null>(null);
  const spokenTextRef = useRef<string>(''); // Track what we've already spoken

  // Check if browser supports speech recognition
  const isSpeechRecognitionSupported = () => {
    return typeof (window as any).SpeechRecognition !== 'undefined' || 
           typeof (window as any).webkitSpeechRecognition !== 'undefined';
  };

  // Check if we're in a secure context
  const isSecureContext = () => {
    return window.isSecureContext || window.location.protocol === 'https:' || window.location.hostname === 'localhost';
  };

  // Initialize RAG service with environment variable
  useEffect(() => {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (apiKey) {
      const rag = new RAGService(apiKey);
      setRagService(rag);

      // Build knowledge base if we have data
      if ((dynamicMetrics.length > 0 || chartData.length > 0)) {
        rag.buildKnowledgeBase(chartData, dynamicMetrics);
        setRagStats(rag.getKnowledgeBaseStats());
      }
    }
  }, [dynamicMetrics, chartData]);

  // Initialize simplified welcome message
  useEffect(() => {
    if (dynamicMetrics.length > 0) {
      const voiceStatus = isSecureContext() && isSpeechRecognitionSupported() 
        ? "🎤 Use the mic button to ask questions with your voice!" 
        : "Type your questions in the input field below.";
      
      const welcomeMessage = `Hey there! 👋 I'm your Whoop AI Coach.

Ask me anything about your health metrics and I'll provide personalized insights based on your data! 🧠✨

${voiceStatus}`;

      setMessages([{
        id: '1',
        type: 'coach',
        content: welcomeMessage,
        timestamp: new Date()
      }]);
    }
  }, [dynamicMetrics]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Send transcript as a message (auto-send)
  const sendTranscriptMessage = async (transcript: string) => {
    const messageToSend = transcript.trim();
    if (!messageToSend) return;

    // Reset spoken text tracker for new conversation
    spokenTextRef.current = '';

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: messageToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();
    
    // Create initial AI message for streaming
    const aiMessageId = (Date.now() + 1).toString();
    setCurrentStreamingMessageId(aiMessageId);
    
    const initialAiMessage: Message = {
      id: aiMessageId,
      type: 'coach',
      content: '',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, initialAiMessage]);
    
    try {
      if (ragService && dynamicMetrics.length > 0) {
        // Track the complete text outside of state updates
        let completeText = '';
        
        // Add metric context to the query if a specific metric is selected
        let contextualQuery = messageToSend;
        let metricContext = undefined;
        if (selectedMetric && dynamicMetrics) {
          const selectedMetricData = dynamicMetrics.find(m => m.id === selectedMetric);
          if (selectedMetricData) {
            metricContext = {
              id: selectedMetricData.id,
              title: selectedMetricData.title,
              value: selectedMetricData.value
            };
            console.log('📊 Adding metric context for transcript:', metricContext);
          }
        }
        
        // Use streaming RAG response
        await ragService.generateRAGResponseStream(
          contextualQuery,
          (chunk: string, isComplete: boolean) => {
            // Build the complete text incrementally
            completeText += chunk;
            
            // Update the streaming message
            setMessages(prev => prev.map(msg => {
              if (msg.id === aiMessageId) {
                return { ...msg, content: completeText };
              }
              return msg;
            }));
            
            // Handle auto-speech during streaming AND when complete
            if (completeText.trim()) {
              if (isComplete) {
                console.log('🎯 Transcript streaming complete, triggering final TTS for:', completeText.substring(0, 50) + '...');
                setCurrentStreamingMessageId(null);
              } else {
                console.log('🔄 Transcript streaming chunk, checking for TTS:', completeText.substring(0, 50) + '...');
              }
              handleAutoSpeech(isComplete, completeText);
            }
          },
          abortControllerRef.current.signal,
          metricContext
        );
      } else {
        // No real data available
        const errorResponse = "Please ensure your CSV data is loaded before asking questions. I can only analyze real health data from your CSV file. 📊";
        setMessages(prev => prev.map(msg => 
          msg.id === aiMessageId 
            ? { ...msg, content: errorResponse }
            : msg
        ));
        if (isSpeechEnabled) {
          speakText(errorResponse);
        }
      }
    } catch (error) {
      const errorContent = error.name === 'AbortError' 
        ? "Response generation was stopped. 🛑"
        : "I'm having trouble connecting right now. Please make sure you've entered a valid OpenAI API key. 🤔";
        
      setMessages(prev => prev.map(msg => 
        msg.id === aiMessageId 
          ? { ...msg, content: errorContent }
          : msg
      ));
      
      if (error.name !== 'AbortError' && isSpeechEnabled) {
        speakText(errorContent);
      }
    } finally {
      setIsLoading(false);
      setCurrentStreamingMessageId(null);
      abortControllerRef.current = null;
    }
  };

  // Request microphone permission upfront
  const requestMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the stream immediately
      setHasPermission(true);
      console.log('Microphone permission granted');
      return true;
    } catch (err) {
      console.log('Microphone permission denied');
      setHasPermission(false);
      return false;
    }
  };

  useImperativeHandle(ref, () => ({
    sendMessage: (message: string) => {
      setInputMessage(message);
      setTimeout(() => handleSendMessage(), 100);
    }
  }), []);

  const handleSendMessage = async () => {
    const messageToSend = inputMessage.trim();
    if (!messageToSend) return;

    // Reset spoken text tracker for new conversation
    spokenTextRef.current = '';

    setInputMessage('');
    
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: messageToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();
    
    // Create initial AI message for streaming
    const aiMessageId = (Date.now() + 1).toString();
    setCurrentStreamingMessageId(aiMessageId);
    
    const initialAiMessage: Message = {
      id: aiMessageId,
      type: 'coach',
      content: '',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, initialAiMessage]);
    
    try {
      if (ragService && dynamicMetrics.length > 0) {
        // Track the complete text outside of state updates
        let completeText = '';
        
        // Add metric context to the query if a specific metric is selected
        let contextualQuery = messageToSend;
        let metricContext = undefined;
        if (selectedMetric && dynamicMetrics) {
          const selectedMetricData = dynamicMetrics.find(m => m.id === selectedMetric);
          if (selectedMetricData) {
            metricContext = {
              id: selectedMetricData.id,
              title: selectedMetricData.title,
              value: selectedMetricData.value
            };
            console.log('📊 Adding metric context for input:', metricContext);
          }
        }
        
        // Use streaming RAG response
        await ragService.generateRAGResponseStream(
          contextualQuery,
          (chunk: string, isComplete: boolean) => {
            // Build the complete text incrementally
            completeText += chunk;
            
            // Update the streaming message
            setMessages(prev => prev.map(msg => {
              if (msg.id === aiMessageId) {
                return { ...msg, content: completeText };
              }
              return msg;
            }));
            
            // Handle auto-speech during streaming AND when complete
            if (completeText.trim()) {
              if (isComplete) {
                console.log('🎯 Input streaming complete, triggering final TTS for:', completeText.substring(0, 50) + '...');
                setCurrentStreamingMessageId(null);
              } else {
                console.log('🔄 Input streaming chunk, checking for TTS:', completeText.substring(0, 50) + '...');
              }
              handleAutoSpeech(isComplete, completeText);
            }
          },
          abortControllerRef.current.signal,
          metricContext
        );
      } else {
        // No real data available
        const errorResponse = "Please ensure your CSV data is loaded before asking questions. I can only analyze real health data from your CSV file. 📊";
        setMessages(prev => prev.map(msg => 
          msg.id === aiMessageId 
            ? { ...msg, content: errorResponse }
            : msg
        ));
        if (isSpeechEnabled) {
          speakText(errorResponse);
        }
      }
    } catch (error) {
      const errorContent = error.name === 'AbortError' 
        ? "Response generation was stopped. 🛑"
        : "I'm having trouble connecting right now. Please make sure you've entered a valid OpenAI API key. 🤔";
        
      setMessages(prev => prev.map(msg => 
        msg.id === aiMessageId 
          ? { ...msg, content: errorContent }
          : msg
      ));
      
      if (error.name !== 'AbortError' && isSpeechEnabled) {
        speakText(errorContent);
      }
    } finally {
      setIsLoading(false);
      setCurrentStreamingMessageId(null);
      abortControllerRef.current = null;
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Stop any current audio playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    
    // Clear audio queue
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    
    // Reset spoken text tracker
    spokenTextRef.current = '';
  };

  const handleVoiceInput = () => {
    // Interrupt any current TTS playback when user wants to speak
    if (audioRef.current && !audioRef.current.paused) {
      console.log('🔇 Interrupting TTS playback for voice input');
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    
    // Clear audio queue
    audioQueueRef.current = [];
    isPlayingRef.current = false;

    // Check if we're in a secure context
    if (!isSecureContext()) {
      alert('Voice input requires a secure context (HTTPS). Please use HTTPS or localhost.');
      return;
    }

    // Check browser support
    if (!isSpeechRecognitionSupported()) {
      alert('Voice input is not supported in your browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognitionRef.current = recognition;

      recognition.onstart = () => {
        console.log('Voice recognition started');
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        console.log('Transcript:', transcript);
        setIsListening(false);
        // Auto-send the transcript directly without needing to click send
        sendTranscriptMessage(transcript);
      };

      recognition.onerror = (event: any) => {
        console.error('Voice recognition error:', event.error);
        let errorMessage = 'An error occurred with voice recognition.';
        
        switch (event.error) {
          case 'no-speech':
            errorMessage = 'No speech was detected. Please try again.';
            break;
          case 'aborted':
            errorMessage = 'Voice recognition was aborted.';
            break;
          case 'audio-capture':
            errorMessage = 'No microphone was found. Please ensure your microphone is connected.';
            break;
          case 'network':
            errorMessage = 'Network error occurred. Please check your connection.';
            break;
          case 'not-allowed':
            errorMessage = 'Microphone access was denied. Please allow microphone access.';
            break;
          case 'service-not-allowed':
            errorMessage = 'Voice recognition service is not allowed.';
            break;
        }
        
        console.error(errorMessage);
        alert(errorMessage);
        setIsListening(false);
      };

      recognition.onend = () => {
        console.log('Voice recognition ended');
        setIsListening(false);
      };

      // Request microphone permission explicitly
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => {
          console.log('Microphone permission granted');
          recognition.start();
          console.log('Called recognition.start()');
        })
        .catch((err) => {
          console.error('Microphone permission denied:', err);
          alert('Please allow microphone access to use voice input.');
          setIsListening(false);
        });

    } catch (error) {
      console.error('Error initializing voice recognition:', error);
      alert('Failed to initialize voice recognition. Please try again.');
      setIsListening(false);
    }
  };

  // Queue-based streaming TTS
  const audioQueueRef = useRef<HTMLAudioElement[]>([]);
  const isPlayingRef = useRef<boolean>(false);

  const handleAutoSpeech = (isComplete: boolean, fullText: string) => {
    if (!isSpeechEnabled || !fullText.trim()) return;

    const alreadySpoken = spokenTextRef.current;
    const newText = fullText.slice(alreadySpoken.length);

    console.log(`🔍 TTS: Already spoken ${alreadySpoken.length} chars, new text: "${newText.substring(0, 50)}..."`);

    if (isComplete) {
      // Speak any remaining text when complete
      if (newText.trim()) {
        console.log('🎯 Final TTS chunk:', newText.substring(0, 50) + '...');
        queueTextForSpeech(newText);
        spokenTextRef.current = fullText;
      }
      // Reset for next message
      setTimeout(() => {
        spokenTextRef.current = '';
      }, 100);
    } else {
      // Stream mode: look for complete sentences
      const sentenceMatch = newText.match(/^(.*?[.!?])\s*/);
      
      if (sentenceMatch && sentenceMatch[1].length > 10) {
        const sentence = sentenceMatch[1].trim();
        
        // Don't speak if it's just emojis or very short after sanitization
        const testSanitized = sanitizeTextForTTS(sentence);
        if (testSanitized.length > 5) {
          console.log('🎯 Streaming sentence:', sentence.substring(0, 50) + '...');
          queueTextForSpeech(sentence);
          spokenTextRef.current = alreadySpoken + sentenceMatch[0]; // Include the space after punctuation
        } else {
          console.log('🚫 Skipping sentence (too short after sanitization):', testSanitized);
        }
      }
    }
  };

  const queueTextForSpeech = async (text: string) => {
    if (!text.trim()) return;

    // Sanitize text to prevent TTS issues
    const sanitizedText = sanitizeTextForTTS(text);
    if (!sanitizedText.trim()) return;

    try {
      const audioElement = await createAudioFromText(sanitizedText);
      audioQueueRef.current.push(audioElement);
      
      if (!isPlayingRef.current) {
        playNextInQueue();
      }
    } catch (error) {
      console.error('Error queuing text for speech:', error);
    }
  };

  const sanitizeTextForTTS = (text: string): string => {
    console.log('🧹 TTS Sanitization input:', text);
    
    // Helper function to convert decimal hours to hours and minutes
    const convertHoursToHoursMinutes = (hoursStr: string, sign: string = '') => {
      const hours = parseFloat(hoursStr);
      const wholeHours = Math.floor(hours);
      const minutes = Math.round((hours - wholeHours) * 60);
      
      let result = '';
      if (sign) result += sign + ' ';
      
      if (wholeHours > 0 && minutes > 0) {
        result += `${wholeHours} ${wholeHours === 1 ? 'hour' : 'hours'} and ${minutes} minutes`;
      } else if (wholeHours > 0) {
        result += `${wholeHours} ${wholeHours === 1 ? 'hour' : 'hours'}`;
      } else if (minutes > 0) {
        result += `${minutes} minutes`;
      } else {
        result += 'zero hours';
      }
      
      return result;
    };
    
    let result = text
      // Handle decimal hours with "hours" unit (e.g., "8.1 hours", "+0.5 hours")
      .replace(/([+-]?)(\d+\.\d+)\s*hours?\b/g, (match, sign, hoursStr) => {
        return convertHoursToHoursMinutes(hoursStr, sign === '+' ? 'plus' : sign === '-' ? 'minus' : '');
      })
      
      // Handle standalone decimal hours patterns when followed by context suggesting time
      .replace(/([+-]?)(\d+\.\d+)\b(?=\s*(?:of sleep|per day|each night|per night|total|accumulated))/g, (match, sign, hoursStr) => {
        return convertHoursToHoursMinutes(hoursStr, sign === '+' ? 'plus' : sign === '-' ? 'minus' : '');
      })
      
      // Handle specific common decimal hour values
      .replace(/\+0\.5\b/g, 'plus 30 minutes')
      .replace(/-0\.5\b/g, 'minus 30 minutes')
      .replace(/\b0\.5\b/g, '30 minutes')
      .replace(/\+1\.5\b/g, 'plus 1 hour and 30 minutes')
      .replace(/-1\.5\b/g, 'minus 1 hour and 30 minutes')
      .replace(/\b1\.5\b/g, '1 hour and 30 minutes')
      
      // Handle other common decimal patterns
      .replace(/\+0\.25\b/g, 'plus 15 minutes')
      .replace(/-0\.25\b/g, 'minus 15 minutes')
      .replace(/\b0\.25\b/g, '15 minutes')
      .replace(/\+0\.75\b/g, 'plus 45 minutes')
      .replace(/-0\.75\b/g, 'minus 45 minutes')
      .replace(/\b0\.75\b/g, '45 minutes')
      
      // Fallback for other decimals that don't look like hours
      .replace(/\+([1-9]\d*)\.(\d+)\b/g, 'plus $1 point $2')
      .replace(/-([1-9]\d*)\.(\d+)\b/g, 'minus $1 point $2')
      .replace(/\b([1-9]\d*)\.(\d+)\b/g, '$1 point $2')
      
      // Handle remaining mathematical symbols
      .replace(/\+/g, ' plus ') // + → " plus "
      .replace(/\s-/g, ' minus ') // " -" → " minus "  
      .replace(/^-/g, 'minus ') // "-" → "minus " (at start)
      .replace(/±/g, ' plus or minus ') // ± → " plus or minus "
      .replace(/\+\/-/g, ' plus or minus ') // +/- → " plus or minus "
      
      // Handle units
      .replace(/%/g, ' percent') // % → " percent"
      .replace(/\bh\b/g, ' hours') // "h" → " hours"
      .replace(/\bmin\b/g, ' minutes') // "min" → " minutes"
      .replace(/\bbpm\b/g, ' beats per minute') // "bpm" → " beats per minute"
      .replace(/\bms\b/g, ' milliseconds') // "ms" → " milliseconds"
      .replace(/\bcal\b/g, ' calories') // "cal" → " calories"
      
      // Remove excessive emojis (keep max 2 per sentence)
      .replace(/([\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]){3,}/gu, '$1$1')
      
      // Remove markdown formatting
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      
      // Remove excessive punctuation
      .replace(/[!]{2,}/g, '!')
      .replace(/[?]{2,}/g, '?')
      .replace(/[.]{3,}/g, '...')
      
      // Remove special characters that might confuse TTS
      .replace(/[🔍🎯📊💪🌟👋😊🚀⚠️📈💯🎪🔄]/g, '')
      
      // Clean up extra whitespace
      .replace(/\s+/g, ' ')
      .trim();
      
    console.log('🧹 TTS Sanitization output:', result);
    return result;
  };

  const createAudioFromText = async (text: string): Promise<HTMLAudioElement> => {
    const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY as string;
    const voiceId = (import.meta.env.VITE_ELEVENLABS_VOICE_ID as string) || 'EXAVITQu4vr4xnSDxMaL';

    // Validate API key
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('ElevenLabs API key not configured');
    }

    // More aggressive text validation and cleaning
    if (text.length > 300) { // Further reduced for reliability
      console.warn('Text too long for TTS, truncating:', text.length);
      text = text.substring(0, 300) + '.';
    }

    if (text.length < 2) {
      throw new Error('Text too short for TTS');
    }

    // Clean text more thoroughly
    text = text
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
      .replace(/[^\x00-\x7F]/g, (char) => { // Handle non-ASCII characters carefully
        // Keep common symbols but remove problematic ones
        const allowed = ['é', 'è', 'à', 'ü', 'ö', 'ä', '—', '–', "'", "'", '"', '"'];
        return allowed.includes(char) ? char : '';
      })
      .trim();

    console.log('🎤 Creating TTS audio for:', text.substring(0, 50) + '...');

    // Add retry logic with exponential backoff
    let attempts = 0;
    const maxAttempts = 3;
    let response: Response;
    
    while (attempts < maxAttempts) {
      try {
        // Use more conservative settings to prevent 500 errors
        const requestBody = {
          text,
          model_id: 'eleven_turbo_v2', // Use v2 instead of v2_5 for better stability
          voice_settings: { 
            stability: 0.4, // More conservative values
            similarity_boost: 0.6,
            style: 0.0, // Keep at 0 to prevent exaggeration issues
            use_speaker_boost: false
          },
          output_format: 'mp3_22050_32' // Keep lower quality for reliability
        };

        console.log('🔍 TTS Request body:', JSON.stringify(requestBody, null, 2));

        response = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'audio/mpeg',
              'xi-api-key': apiKey,
            },
            body: JSON.stringify(requestBody),
          }
        );

        console.log('🔍 TTS Response status:', response.status, response.statusText);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`TTS API Error (attempt ${attempts + 1}):`, {
            status: response.status,
            statusText: response.statusText,
            error: errorText,
            voiceId,
            textLength: text.length,
            text: text.substring(0, 100)
          });
          
          // Handle specific error cases
          if (response.status === 401) {
            throw new Error('Invalid ElevenLabs API key');
          }
          
          if (response.status === 422) {
            throw new Error('Invalid voice ID or request parameters');
          }
          
          if (attempts === maxAttempts - 1) {
            throw new Error(`ElevenLabs TTS error: ${response.status} ${response.statusText}`);
          }
          
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempts) * 1000;
          console.log(`⏳ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          attempts++;
          continue;
        }

        // Success - break out of retry loop
        console.log('✅ TTS request successful');
        break;
      } catch (error) {
        console.error(`TTS request failed (attempt ${attempts + 1}):`, error);
        
        if (attempts === maxAttempts - 1) {
          throw error;
        }
        
        // Exponential backoff for network errors too
        const delay = Math.pow(2, attempts) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        attempts++;
      }
    }

    const arrayBuffer = await response.arrayBuffer();
    
    if (arrayBuffer.byteLength < 1000) {
      throw new Error('Audio response too small, likely an error');
    }

    const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
    const url = URL.createObjectURL(blob);
    
    const audio = new Audio(url);
    
    // Add error handling for audio playback
    audio.onerror = (e) => {
      console.error('Audio playback error:', e);
      URL.revokeObjectURL(url);
      playNextInQueue(); // Continue with next audio
    };
    
    audio.onended = () => {
      URL.revokeObjectURL(url);
      playNextInQueue();
    };
    
    // Set volume to prevent distortion
    audio.volume = 0.8;
    
    return audio;
  };

  const playNextInQueue = () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      return;
    }

    const nextAudio = audioQueueRef.current.shift();
    if (nextAudio) {
      isPlayingRef.current = true;
      audioRef.current = nextAudio;
      nextAudio.play().catch(console.error);
    }
  };

  // Smart streaming TTS function for chunks
  const speakTextChunk = async (text: string) => {
    console.log('🎤 Speaking streaming chunk:', text.substring(0, 50) + '...');
    const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY as string;
    const voiceId = (import.meta.env.VITE_ELEVENLABS_VOICE_ID as string) || 'EXAVITQu4vr4xnSDxMaL';

    if (!apiKey) {
      console.warn('ElevenLabs API key not set');
      return;
    }

    if (!text.trim()) {
      console.warn('Empty text provided to TTS');
      return;
    }

    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?optimize_streaming_latency=4`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg',
            'xi-api-key': apiKey,
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_turbo_v2_5',
            voice_settings: { 
              stability: 0.4, // Lower for faster processing
              similarity_boost: 0.75, 
              style: 0.2, 
              use_speaker_boost: true 
            },
            speech_rate: 1.0 // Normal speed
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`ElevenLabs TTS error: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);

      // Create audio for this chunk
      const audio = new Audio(url);
      
      // If there's current audio playing, queue this chunk
      if (audioRef.current && !audioRef.current.paused) {
        // Wait for current audio to finish, then play this chunk
        audioRef.current.onended = () => {
          audio.play().catch(console.error);
          audioRef.current = audio;
        };
      } else {
        // No current audio, play immediately
        audioRef.current = audio;
        await audio.play();
      }
      
      // Clean up the URL after playing
      audio.onended = () => {
        URL.revokeObjectURL(url);
        if (audioRef.current === audio) {
          audioRef.current = null;
        }
      };

    } catch (error) {
      console.error('TTS streaming error:', error);
    }
  };

  // Auto TTS function for complete responses (fallback)
  const speakText = async (text: string) => {
    console.log('🎤 Speaking complete response:', text.substring(0, 50) + '...');
    const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY as string;
    const voiceId = (import.meta.env.VITE_ELEVENLABS_VOICE_ID as string) || 'EXAVITQu4vr4xnSDxMaL';

    if (!apiKey) {
      console.warn('ElevenLabs API key not set');
      return;
    }

    if (!text.trim()) {
      console.warn('Empty text provided to TTS');
      return;
    }

    // Sanitize text for TTS
    const sanitizedText = sanitizeTextForTTS(text);
    if (!sanitizedText.trim()) {
      console.warn('Text became empty after sanitization');
      return;
    }

    // Stop any current audio before playing new one
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }

    // Clear queue when speaking complete response
    audioQueueRef.current = [];
    isPlayingRef.current = false;

    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?optimize_streaming_latency=3`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg',
            'xi-api-key': apiKey,
          },
          body: JSON.stringify({
            text: sanitizedText,
            model_id: 'eleven_turbo_v2_5',
            voice_settings: { 
              stability: 0.6, // Higher stability for cleaner voice
              similarity_boost: 0.8, 
              style: 0.1, // Lower style for more natural voice
              use_speaker_boost: true 
            },
            speech_rate: 1.0, // Normal speed
            output_format: 'mp3_44100_128' // Specify quality format
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('TTS API Error:', errorText);
        throw new Error(`ElevenLabs TTS error: ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);

      // Play the complete response
      const audio = new Audio(url);
      audioRef.current = audio;
      await audio.play();
      
      // Clean up the URL after playing
      audio.onended = () => {
        URL.revokeObjectURL(url);
        audioRef.current = null;
      };

    } catch (error) {
      console.error('TTS error:', error);
    }
  };

  const speakMessage = async (text: string) => {
    try {
      // Stop any current audio playback
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }

      await speakText(text);
    } catch (err) {
      console.error('ElevenLabs TTS failed:', err);
    }
  };

  // Don't render if data is not available
  if (!data) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 h-full flex items-center justify-center">
        <div className="text-center text-gray-400">
          Loading AI Coach...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 h-full flex flex-col">
      <div className="flex items-center space-x-3 mb-6">
        <div className="bg-gradient-to-r from-blue-400 to-purple-500 p-3 rounded-xl">
          {ragService && dynamicMetrics.length > 0 ? (
            <Database className="h-6 w-6 text-white" />
          ) : (
            <MessageCircle className="h-6 w-6 text-white" />
          )}
        </div>
        <div className="flex-1">
          <h2 className="text-white text-xl font-bold">Whoop AI Coach</h2>
          <p className="text-gray-400 text-sm">Personalized insights from your data</p>
        </div>
        <Button
          onClick={() => setIsSpeechEnabled(!isSpeechEnabled)}
          variant="outline"
          size="sm"
          className={`${isSpeechEnabled ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-700 hover:bg-gray-600'} text-white`}
          title={isSpeechEnabled ? 'Disable speech' : 'Enable speech'}
        >
          {isSpeechEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </Button>
      </div>

      <div className="space-y-4 mb-6 flex-1 overflow-y-auto max-h-96 min-h-[200px]">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex items-start space-x-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.type === 'coach' && (
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage 
                  src="/images/whoop.png" 
                  alt="Whoop AI Coach"
                  className="object-cover w-full h-full"
                />
                <AvatarFallback className="bg-gradient-to-r from-blue-400 to-purple-500 text-white text-xs">
                  🤖
                </AvatarFallback>
              </Avatar>
            )}
            <div
              className={`max-w-[80%] p-3 rounded-2xl ${
                message.type === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-100'
              }`}
            >
              <p className="text-sm whitespace-pre-line">{message.content}</p>
              {message.type === 'coach' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => speakMessage(message.content)}
                  className="mt-1 p-1 h-auto text-gray-400 hover:text-white"
                >
                  <Volume2 className="h-3 w-3" />
                </Button>
              )}
            </div>
            {message.type === 'user' && (
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage 
                  src="https://coin-images.coingecko.com/coins/images/34755/large/IMG_0015.png?1705957165" 
                  alt="Giga Chad"
                  className="object-cover"
                />
                <AvatarFallback className="bg-gray-800 text-gray-300 text-xs">
                  GC
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-700 text-gray-100 p-3 rounded-2xl">
              <p className="text-sm">
                {ragService && dynamicMetrics.length > 0 ? (
                  <>
                    <Database className="h-3 w-3 inline mr-1" />
                    WHOOPING...............
                  </>
                ) : (
                  'Analyzing your health data... 📊'
                )}
              </p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="space-y-3">
        <div className="flex space-x-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={ragService && dynamicMetrics.length > 0 ? "Ask about your health data..." : "Please load CSV data to ask questions..."}
            className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
            onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSendMessage()}
            disabled={isLoading}
          />
          <Button
            onClick={handleVoiceInput}
            variant="outline"
            size="icon"
            className={`${isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'} text-white`}
            disabled={isLoading || !isSpeechRecognitionSupported() || !isSecureContext()}
            title={!isSecureContext() ? 'Voice input requires HTTPS' : !isSpeechRecognitionSupported() ? 'Voice input not supported in this browser' : 'Voice input'}
          >
            {isListening ? (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <Mic className="h-4 w-4" />
              </div>
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </Button>
          {isLoading ? (
            <Button
              onClick={handleStopGeneration}
              variant="outline"
              size="icon"
              className="bg-gray-700 hover:bg-gray-600 text-white"
            >
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSendMessage}
              variant="outline"
              size="icon"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={!inputMessage.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>

      </div>
    </div>
  );
});

AICoach.displayName = 'AICoach';
