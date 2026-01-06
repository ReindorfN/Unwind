// OpenAI API Integration for Mental Health Support Chat
interface OpenAIConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

interface ChatResponse {
  message: string;
  emotion?: string;
  suggestions?: string[];
  recommendedActions?: Array<{
    type: 'mood_tracker' | 'journal' | 'forum' | 'emergency';
    title: string;
    description: string;
    url: string;
  }>;
  needsCrisisSupport?: boolean;
}

class OpenAIAPI {
  private config: OpenAIConfig;

  constructor(config: OpenAIConfig) {
    this.config = config;
  }

  private validateConfig(): void {
    if (!this.config.apiKey) {
      throw new Error('OpenAI API key is not configured. Please check your environment variables.');
    }
  }

  private getSystemPrompt(): string {
    return `You are a compassionate AI mental health companion for the Unwind app. Your role is to provide empathetic, supportive responses to users sharing their mental health struggles.

IMPORTANT GUIDELINES:
1. Always be empathetic, non-judgmental, and supportive
2. Validate the user's feelings and experiences
3. Provide practical coping strategies when appropriate
4. Recognize crisis situations and recommend immediate help
5. Suggest relevant app features (mood tracker, journaling, community forum)
6. Never provide medical diagnoses or replace professional therapy
7. Encourage professional help when needed
8. Keep responses concise but meaningful (2-4 sentences typically)

CRISIS INDICATORS to watch for:
- Mentions of self-harm, suicide, or "ending it all"
- Expressions of hopelessness or worthlessness
- Substance abuse mentions
- Immediate danger to self or others

RESPONSE FORMAT:
- Provide empathetic response
- Suggest 1-2 coping strategies if appropriate
- Recommend app features that might help
- If crisis indicators detected, prioritize safety resources

Remember: You're a supportive companion, not a therapist. Always encourage professional help for serious concerns.`;
  }

  async sendMessage(
    messages: ChatMessage[],
    userMessage: string
  ): Promise<ChatResponse> {
    try {
      this.validateConfig();

      const conversationMessages = [
        { role: 'system' as const, content: this.getSystemPrompt() },
        ...messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        { role: 'user' as const, content: userMessage }
      ];

      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: conversationMessages,
          max_tokens: 500,
          temperature: 0.7,
          presence_penalty: 0.1,
          frequency_penalty: 0.1,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      const aiMessage = data.choices[0]?.message?.content || 'I understand you\'re going through something difficult. I\'m here to listen and support you.';

      // Analyze the conversation for emotion and recommendations
      const analysis = this.analyzeConversation(userMessage, aiMessage);

      return {
        message: aiMessage,
        ...analysis
      };
    } catch (error) {
      console.error('Error sending message to OpenAI:', error);
      
      // Provide a fallback response
      return {
        message: "I'm here to listen and support you. Sometimes I have trouble connecting, but your feelings are valid and you're not alone. If you're in crisis, please reach out to 988 or emergency services.",
        needsCrisisSupport: this.detectCrisis(userMessage),
        recommendedActions: [{
          type: 'emergency',
          title: 'Get Immediate Help',
          description: 'If you need immediate support',
          url: '/emergency'
        }]
      };
    }
  }

  private analyzeConversation(userMessage: string, aiResponse: string): Partial<ChatResponse> {
    const lowerMessage = userMessage.toLowerCase();
    
    // Crisis detection
    const crisisKeywords = [
      'suicide', 'kill myself', 'end it all', 'want to die', 'not worth living',
      'self harm', 'hurt myself', 'overdose', 'can\'t go on'
    ];
    
    const needsCrisisSupport = crisisKeywords.some(keyword => 
      lowerMessage.includes(keyword)
    );

    // Emotion detection
    let emotion = 'neutral';
    if (lowerMessage.includes('anxious') || lowerMessage.includes('worried') || lowerMessage.includes('panic')) {
      emotion = 'anxious';
    } else if (lowerMessage.includes('sad') || lowerMessage.includes('depressed') || lowerMessage.includes('down')) {
      emotion = 'sad';
    } else if (lowerMessage.includes('angry') || lowerMessage.includes('frustrated') || lowerMessage.includes('mad')) {
      emotion = 'angry';
    } else if (lowerMessage.includes('lonely') || lowerMessage.includes('alone') || lowerMessage.includes('isolated')) {
      emotion = 'lonely';
    }

    // Generate recommendations based on content
    const recommendedActions = this.generateRecommendations(emotion, needsCrisisSupport);

    // Generate follow-up suggestions
    const suggestions = this.generateSuggestions(emotion);

    return {
      emotion,
      needsCrisisSupport,
      recommendedActions,
      suggestions
    };
  }

  private detectCrisis(message: string): boolean {
    const crisisKeywords = [
      'suicide', 'kill myself', 'end it all', 'want to die', 'not worth living',
      'self harm', 'hurt myself', 'overdose', 'can\'t go on', 'hopeless',
      'worthless', 'better off dead'
    ];
    
    const lowerMessage = message.toLowerCase();
    return crisisKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  private generateRecommendations(emotion: string, needsCrisisSupport: boolean): Array<{
    type: 'mood_tracker' | 'journal' | 'forum' | 'emergency';
    title: string;
    description: string;
    url: string;
  }> {
    const recommendations = [];

    if (needsCrisisSupport) {
      recommendations.push({
        type: 'emergency' as const,
        title: 'Get Immediate Help',
        description: 'Crisis support resources available 24/7',
        url: '/emergency'
      });
      return recommendations;
    }

    // Add mood tracker for emotional awareness
    recommendations.push({
      type: 'mood_tracker' as const,
      title: 'Track Your Mood',
      description: 'Monitor your emotional patterns',
      url: '/mood-tracker'
    });

    // Add journaling for processing emotions
    if (emotion === 'sad' || emotion === 'anxious' || emotion === 'angry') {
      recommendations.push({
        type: 'journal' as const,
        title: 'Write in Your Journal',
        description: 'Process your thoughts and feelings',
        url: '/journal'
      });
    }

    // Add community support for loneliness
    if (emotion === 'lonely') {
      recommendations.push({
        type: 'forum' as const,
        title: 'Connect with Community',
        description: 'Find support from others who understand',
        url: '/forum'
      });
    }

    return recommendations.slice(0, 2); // Limit to 2 recommendations
  }

  private generateSuggestions(emotion: string): string[] {
    const suggestions = {
      anxious: [
        "Can you help me with breathing exercises?",
        "I'm having a panic attack, what should I do?",
        "How can I calm down when I'm overwhelmed?"
      ],
      sad: [
        "I'm feeling really down today",
        "How do I cope with sadness?",
        "I feel like crying all the time"
      ],
      angry: [
        "I'm really frustrated and angry",
        "How can I manage my anger?",
        "I feel like everything is going wrong"
      ],
      lonely: [
        "I feel so alone and isolated",
        "How can I feel more connected?",
        "I don't have anyone to talk to"
      ],
      neutral: [
        "I'm not sure how I'm feeling",
        "Can you help me understand my emotions?",
        "I just need someone to listen"
      ]
    };

    return suggestions[emotion as keyof typeof suggestions] || suggestions.neutral;
  }
}

// Export configured instance
export const openaiApi = new OpenAIAPI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
  baseUrl: import.meta.env.VITE_OPENAI_BASE_URL || 'https://api.openai.com/v1',
  model: import.meta.env.VITE_OPENAI_MODEL || 'gpt-4.1'
});

export type { ChatMessage, ChatResponse };