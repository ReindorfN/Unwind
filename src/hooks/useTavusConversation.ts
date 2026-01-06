import { useState, useEffect, useRef, useCallback } from 'react';
import { tavusApi, type ConversationResponse, type EmotionAnalysis, type TavusReplica, type TavusPersona } from '../lib/tavusApi';

interface ConversationState {
  isConnected: boolean;
  isConnecting: boolean;
  conversationId: string | null;
  conversationUrl: string | null;
  error: string | null;
  transcript: Array<{
    speaker: 'user' | 'ai';
    text: string;
    timestamp: number;
    emotion?: string;
  }>;
  currentEmotion: EmotionAnalysis | null;
  replica: TavusReplica | null;
  personas: TavusPersona[];
}

interface UseTavusConversationOptions {
  personaId?: string;
  userMood?: number;
  onEmotionDetected?: (emotion: EmotionAnalysis) => void;
  onAIResponse?: (response: string) => void;
  onError?: (error: string) => void;
  onConversationStarted?: (conversationUrl: string) => void;
}

export const useTavusConversation = (options: UseTavusConversationOptions) => {
  const [state, setState] = useState<ConversationState>({
    isConnected: false,
    isConnecting: false,
    conversationId: null,
    conversationUrl: null,
    error: null,
    transcript: [],
    currentEmotion: null,
    replica: null,
    personas: []
  });

  const conversationRef = useRef<ConversationResponse | null>(null);
  const speechRecognitionRef = useRef<SpeechRecognition | null>(null);

  // Load replica and personas on mount
  useEffect(() => {
    loadReplica();
    loadPersonas();
  }, []);

  const loadReplica = async () => {
    try {
      const replica = await tavusApi.getReplica();
      setState(prev => ({ ...prev, replica }));
    } catch (error) {
      console.error('Error loading replica:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load AI replica. Please check your configuration.';
      setState(prev => ({ 
        ...prev, 
        error: errorMessage
      }));
    }
  };

  const loadPersonas = async () => {
    try {
      const personas = await tavusApi.getPersonas();
      setState(prev => ({ ...prev, personas }));
    } catch (error) {
      console.error('Error loading personas:', error);
      // Don't set error state for personas since we have fallback personas
      // Just continue with empty personas array or default personas
      setState(prev => ({ 
        ...prev, 
        personas: [
          {
            persona_id: 'default-mental-health-companion',
            persona_name: 'Mental Health Companion',
            context: 'A compassionate AI mental health companion that provides empathetic, supportive responses to help users process their emotions and feelings.',
            created_at: new Date().toISOString()
          }
        ]
      }));
    }
  };

  const addToTranscript = useCallback((speaker: 'user' | 'ai', text: string, emotion?: string) => {
    setState(prev => ({
      ...prev,
      transcript: [...prev.transcript, {
        speaker,
        text,
        timestamp: Date.now(),
        emotion
      }]
    }));
  }, []);

  const startConversation = useCallback(async () => {
    if (state.isConnecting || state.isConnected) return;

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      // Check if replica is available
      if (!state.replica) {
        throw new Error('No AI replica available. Please ensure your replica ID is configured correctly.');
      }

      if (state.replica.status !== 'ready' && state.replica.status !== 'completed') {
        throw new Error(`AI replica is not ready. Current status: ${state.replica.status}`);
      }

      const conversationalContext = `You are a compassionate AI mental health companion. The user's current mood level is ${options.userMood || 3}/5. Provide empathetic, supportive responses to help them process their emotions. Listen actively and respond with understanding and validation.`;

      const conversation = await tavusApi.startConversation({
        persona_id: options.personaId || state.personas[0]?.persona_id,
        conversation_name: `Mental Health Support - ${new Date().toISOString()}`,
        conversational_context: conversationalContext,
        custom_greeting: options.userMood && options.userMood <= 2 
          ? "I can sense you might be going through a difficult time. I'm here to listen and support you. What's on your mind?"
          : "Hello, I'm here to listen and support you. What would you like to talk about today?",
        properties: {
          max_call_duration: 180,
          enable_recording: false,
          enable_transcription: true
        }
      });

      conversationRef.current = conversation;
      
      setState(prev => ({ 
        ...prev, 
        conversationId: conversation.conversation_id,
        conversationUrl: conversation.conversation_url,
        isConnected: true,
        isConnecting: false 
      }));

      // Notify parent component
      options.onConversationStarted?.(conversation.conversation_url);

      // Add AI greeting to transcript
      const greeting = options.userMood && options.userMood <= 2 
        ? "I can sense you might be going through a difficult time. I'm here to listen and support you. What's on your mind?"
        : "Hello, I'm here to listen and support you. What would you like to talk about today?";
      
      addToTranscript('ai', greeting);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start conversation';
      setState(prev => ({ 
        ...prev, 
        error: errorMessage,
        isConnecting: false 
      }));
      options.onError?.(errorMessage);
    }
  }, [state.isConnecting, state.isConnected, state.replica, state.personas, options, addToTranscript]);

  const sendUserInput = useCallback(async (input: string | Blob) => {
    if (!state.isConnected || !state.conversationId) return;

    try {
      // Add user input to transcript if it's text
      if (typeof input === 'string') {
        addToTranscript('user', input);
        
        // Analyze emotion
        const emotion = await tavusApi.analyzeEmotion(input);
        setState(prev => ({ ...prev, currentEmotion: emotion }));
        options.onEmotionDetected?.(emotion);

        // Generate AI response based on emotion
        const aiResponse = generateContextualResponse(input, emotion.emotion);
        setTimeout(() => {
          addToTranscript('ai', aiResponse, emotion.emotion);
          options.onAIResponse?.(aiResponse);
        }, 1500);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send input';
      setState(prev => ({ ...prev, error: errorMessage }));
      options.onError?.(errorMessage);
    }
  }, [state.isConnected, state.conversationId, addToTranscript, options]);

  const generateContextualResponse = (userInput: string, emotion: string): string => {
    const responses = {
      angry: [
        "I can hear the frustration in your words. It's completely understandable to feel angry about this situation. Your feelings are valid.",
        "That sounds really frustrating. It's okay to feel angry - let's work through these feelings together.",
        "I sense you're really upset about this. Would it help to talk about what's making you feel this way?"
      ],
      sad: [
        "I can feel the sadness in what you're sharing. It's okay to feel this way, and I'm here with you through this.",
        "Thank you for trusting me with something so difficult. Your feelings are completely valid.",
        "I hear the pain you're going through. You don't have to carry this alone."
      ],
      anxious: [
        "I notice you seem anxious about this. That's completely understandable. Let's take this one step at a time.",
        "Anxiety can be overwhelming. You're safe here, and we can work through this together.",
        "I can sense your worry. Let's focus on what's within your control right now."
      ],
      hopeless: [
        "I'm really concerned about you, and I want you to know that you matter so much. These feelings can change, and there is hope.",
        "I hear how much pain you're in. Please know that you're not alone, and there are people who want to help.",
        "Thank you for trusting me with these difficult feelings. Let's talk about getting you some additional support."
      ],
      confused: [
        "It sounds like you're feeling uncertain about things. That's completely normal when we're going through difficult times.",
        "Confusion can be really uncomfortable. Let's try to sort through these feelings together.",
        "I can help you work through this uncertainty. What feels most unclear to you right now?"
      ],
      happy: [
        "I'm so glad to hear some positivity in your voice. It's wonderful that you're experiencing these good feelings.",
        "That's really great to hear! It sounds like something positive is happening for you.",
        "I love hearing about the good moments. What's bringing you joy right now?"
      ],
      neutral: [
        "I'm listening. Tell me more about what's going on.",
        "I'm here for you. What would be most helpful to talk about?",
        "Thank you for sharing with me. How are you feeling about all of this?"
      ]
    };

    const emotionResponses = responses[emotion as keyof typeof responses] || responses.neutral;
    return emotionResponses[Math.floor(Math.random() * emotionResponses.length)];
  };

  const endConversation = useCallback(async () => {
    try {
      if (state.conversationId) {
        await tavusApi.endConversation(state.conversationId);
      }
      
      setState(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        conversationId: null,
        conversationUrl: null
      }));
    } catch (error) {
      console.error('Error ending conversation:', error);
    }
  }, [state.conversationId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (state.conversationId) {
        endConversation();
      }
    };
  }, []);

  return {
    ...state,
    startConversation,
    sendUserInput,
    endConversation,
    addToTranscript
  };
};