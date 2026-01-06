// Tavus API Integration for Real-Time Conversations
// This file handles the integration with Tavus's real-time conversation API

interface TavusConfig {
  apiKey: string;
  baseUrl: string;
  replicaId: string; // Add replica ID to config
}

interface ConversationRequest {
  replica_id: string;
  persona_id?: string;
  conversation_name?: string;
  conversational_context?: string;
  custom_greeting?: string;
  properties?: {
    max_call_duration?: number;
    participant_left_timeout?: number;
    participant_absent_timeout?: number;
    enable_recording?: boolean;
    enable_transcription?: boolean;
  };
}

interface ConversationResponse {
  conversation_id: string;
  conversation_url: string;
  status: 'active' | 'ended';
  created_at: string;
  updated_at: string;
}

interface EmotionAnalysis {
  emotion: string;
  confidence: number;
  suggestions: string[];
}

interface TavusReplica {
  replica_id: string;
  replica_name: string;
  status: 'ready' | 'training' | 'failed' | 'completed';
  created_at: string;
}

interface TavusPersona {
  persona_id: string;
  persona_name: string;
  context: string;
  created_at: string;
}

class TavusAPI {
  private config: TavusConfig;
  private websocket: WebSocket | null = null;

  constructor(config: TavusConfig) {
    this.config = config;
  }

  /**
   * Validate API configuration
   */
  private validateConfig(): void {
    if (!this.config.apiKey) {
      throw new Error('Tavus API key is not configured. Please check your environment variables.');
    }
    if (!this.config.baseUrl) {
      throw new Error('Tavus base URL is not configured.');
    }
    if (!this.config.replicaId) {
      throw new Error('Tavus replica ID is not configured.');
    }
  }

  /**
   * Get replica information for the configured replica ID
   */
  async getReplica(): Promise<TavusReplica | null> {
    try {
      this.validateConfig();
      
      const response = await fetch(`${this.config.baseUrl}/replicas/${this.config.replicaId}`, {
        method: 'GET',
        headers: {
          'x-api-key': this.config.apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`Replica ${this.config.replicaId} not found`);
          return null;
        }
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Failed to fetch replica: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching replica:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to fetch replica information');
    }
  }

  /**
   * Get available personas - Mock implementation since Tavus API might not have this endpoint
   */
  async getPersonas(): Promise<TavusPersona[]> {
    try {
      this.validateConfig();
      
      // Since the Tavus API might not have a personas endpoint, we'll provide a mock implementation
      // that returns a default persona based on the replica
      console.log('Loading personas for Tavus API...');
      
      // Try to fetch personas, but if it fails, return a default persona
      try {
        const response = await fetch(`${this.config.baseUrl}/personas`, {
          method: 'GET',
          headers: {
            'x-api-key': this.config.apiKey,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          return data.data || [];
        }
      } catch (fetchError) {
        console.log('Personas endpoint not available, using default persona');
      }

      // Return a default persona if the API doesn't support personas endpoint
      return [
        {
          persona_id: 'default-mental-health-companion',
          persona_name: 'Mental Health Companion',
          context: 'A compassionate AI mental health companion that provides empathetic, supportive responses to help users process their emotions and feelings.',
          created_at: new Date().toISOString()
        }
      ];
    } catch (error) {
      console.error('Error fetching personas:', error);
      // Return default persona even if there's an error
      return [
        {
          persona_id: 'default-mental-health-companion',
          persona_name: 'Mental Health Companion',
          context: 'A compassionate AI mental health companion that provides empathetic, supportive responses to help users process their emotions and feelings.',
          created_at: new Date().toISOString()
        }
      ];
    }
  }

  /**
   * Initialize a new conversation with Tavus AI using the configured replica
   */
  async startConversation(request: Omit<ConversationRequest, 'replica_id'>): Promise<ConversationResponse> {
    try {
      this.validateConfig();
      
      const payload = {
        replica_id: this.config.replicaId, // Use the configured replica ID
        persona_id: request.persona_id,
        conversation_name: request.conversation_name || 'Mental Health Support Session',
        conversational_context: request.conversational_context || 
          'You are a compassionate AI mental health companion. Provide empathetic, supportive responses to help users process their emotions and feelings. Listen actively and respond with understanding and validation.',
        custom_greeting: request.custom_greeting || 
          'Hello, I\'m here to listen and support you. What\'s on your mind today?',
        properties: {
          max_call_duration: 3600, // 1 hour
          participant_left_timeout: 60,
          participant_absent_timeout: 300,
          enable_recording: false,
          enable_transcription: true,
          ...request.properties
        }
      };

      const response = await fetch(`${this.config.baseUrl}/conversations`, {
        method: 'POST',
        headers: {
          'x-api-key': this.config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Tavus API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      return {
        conversation_id: data.conversation_id,
        conversation_url: data.conversation_url,
        status: data.status || 'active',
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    } catch (error) {
      console.error('Error starting Tavus conversation:', error);
      throw error;
    }
  }

  /**
   * End a conversation
   */
  async endConversation(conversationId: string): Promise<void> {
    try {
      this.validateConfig();
      
      const response = await fetch(`${this.config.baseUrl}/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: {
          'x-api-key': this.config.apiKey,
        },
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Failed to end conversation: ${response.status} ${response.statusText} - ${errorText}`);
      }
    } catch (error) {
      console.error('Error ending conversation:', error);
      throw error;
    }
  }

  /**
   * Get conversation details
   */
  async getConversation(conversationId: string): Promise<ConversationResponse> {
    try {
      this.validateConfig();
      
      const response = await fetch(`${this.config.baseUrl}/conversations/${conversationId}`, {
        method: 'GET',
        headers: {
          'x-api-key': this.config.apiKey,
        },
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Failed to get conversation: ${response.status} ${response.statusText} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting conversation:', error);
      throw error;
    }
  }

  /**
   * Analyze emotion from text (mock implementation for now)
   */
  async analyzeEmotion(input: string | Blob): Promise<EmotionAnalysis> {
    // This is a mock implementation since Tavus doesn't have a direct emotion analysis endpoint
    // In a real implementation, you might use a separate emotion analysis service
    
    if (typeof input === 'string') {
      const emotionKeywords = {
        angry: ['angry', 'mad', 'furious', 'frustrated', 'rage', 'annoyed'],
        sad: ['sad', 'depressed', 'grief', 'heartbroken', 'crying', 'lonely'],
        anxious: ['anxious', 'worried', 'nervous', 'panic', 'scared', 'overwhelmed'],
        hopeless: ['hopeless', 'despair', 'worthless', 'pointless', 'give up'],
        confused: ['confused', 'lost', 'uncertain', 'unclear', 'mixed up'],
        happy: ['happy', 'good', 'great', 'excited', 'joy', 'wonderful']
      };

      const lowerText = input.toLowerCase();
      let maxScore = 0;
      let detectedEmotion = 'neutral';

      Object.entries(emotionKeywords).forEach(([emotion, keywords]) => {
        const score = keywords.reduce((acc, keyword) => {
          return acc + (lowerText.includes(keyword) ? 1 : 0);
        }, 0);
        
        if (score > maxScore) {
          maxScore = score;
          detectedEmotion = emotion;
        }
      });

      const confidence = Math.min((maxScore / input.split(' ').length) * 100, 95);
      
      return {
        emotion: detectedEmotion,
        confidence,
        suggestions: this.getEmotionSuggestions(detectedEmotion)
      };
    }

    // For audio input, return neutral for now
    return {
      emotion: 'neutral',
      confidence: 50,
      suggestions: []
    };
  }

  private getEmotionSuggestions(emotion: string): string[] {
    const suggestions = {
      angry: [
        'Try taking deep breaths to calm down',
        'Consider what triggered this anger',
        'Physical exercise can help release anger'
      ],
      sad: [
        'It\'s okay to feel sad - your emotions are valid',
        'Consider reaching out to someone you trust',
        'Gentle self-care activities might help'
      ],
      anxious: [
        'Try grounding techniques like 5-4-3-2-1',
        'Focus on your breathing',
        'Remember that anxiety is temporary'
      ],
      hopeless: [
        'Please consider reaching out for professional help',
        'You are not alone in this feeling',
        'Crisis support is available 24/7'
      ],
      confused: [
        'It\'s normal to feel uncertain sometimes',
        'Try writing down your thoughts',
        'Consider talking to someone for clarity'
      ],
      happy: [
        'Enjoy this positive moment',
        'Consider what brought you joy',
        'Share your happiness with others'
      ]
    };

    return suggestions[emotion as keyof typeof suggestions] || [
      'Take time to process your feelings',
      'Self-care is important',
      'Consider journaling about your experience'
    ];
  }
}

// Export configured instance
export const tavusApi = new TavusAPI({
  apiKey: import.meta.env.VITE_TAVUS_API_KEY || '',
  baseUrl: import.meta.env.VITE_TAVUS_BASE_URL || 'https://api.tavus.io/v2',
  replicaId: import.meta.env.VITE_TAVUS_REPLICA_ID || '' // Add replica ID from environment
});

export type { ConversationRequest, ConversationResponse, EmotionAnalysis, TavusReplica, TavusPersona };