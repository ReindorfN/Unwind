import { useState, useEffect, useRef } from 'react';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Phone, 
  PhoneOff,
  MessageSquare,
  Heart,
  Brain,
  MessageCircle,
  BookOpen,
  RotateCcw,
  Sparkles,
  User,
  Volume2,
  VolumeX,
  Settings,
  Camera,
  CameraOff,
  Send,
  AlertTriangle,
  AlertCircle
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { useTavusConversation } from '../hooks/useTavusConversation';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import ChatInterface from '../components/chat/ChatInterface';

interface RantSession {
  id: string;
  user_id: string;
  input_text: string;
  input_audio_url?: string;
  detected_emotion: string;
  confidence_score: number;
  video_response_id: string;
  mood_before?: number;
  mood_after?: number;
  created_at: string;
}

interface EmotionState {
  current: string;
  confidence: number;
  history: Array<{ emotion: string; timestamp: number; confidence: number }>;
}

const RantCompanionPage = () => {
  const { user } = useAuthStore();
  
  // Video call states
  const [callMode, setCallMode] = useState<'text' | 'video'>('text');
  const [isCallActive, setIsCallActive] = useState(false);
  const [userStream, setUserStream] = useState<MediaStream | null>(null);
  
  // Media states
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  
  // Session states
  const [moodBefore, setMoodBefore] = useState<number | null>(null);
  const [moodAfter, setMoodAfter] = useState<number | null>(null);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [recentSessions, setRecentSessions] = useState<RantSession[]>([]);
  
  // Text mode states
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showTextChat, setShowTextChat] = useState(false);
  
  // Speech recognition states
  const [speechError, setSpeechError] = useState<string | null>(null);
  
  // Refs
  const userVideoRef = useRef<HTMLVideoElement>(null);
  const tavusVideoRef = useRef<HTMLIFrameElement>(null);
  const speechRecognitionRef = useRef<SpeechRecognition | null>(null);

  // Tavus conversation hook
  const {
    isConnected,
    isConnecting,
    conversationUrl,
    error: conversationError,
    transcript,
    currentEmotion,
    replica,
    personas,
    startConversation,
    sendUserInput,
    endConversation,
    addToTranscript
  } = useTavusConversation({
    userMood: moodBefore || undefined,
    onEmotionDetected: (emotion) => {
      console.log('Emotion detected:', emotion);
    },
    onAIResponse: (response) => {
      console.log('AI response:', response);
    },
    onError: (error) => {
      console.error('Conversation error:', error);
    },
    onConversationStarted: (url) => {
      console.log('Conversation started:', url);
      // Load the Tavus conversation in iframe
      if (tavusVideoRef.current) {
        tavusVideoRef.current.src = url;
      }
    }
  });

  useEffect(() => {
    document.title = 'AI Companion | Unwind';
    loadRecentSessions();
    initializeSpeechRecognition();
    
    return () => {
      cleanup();
    };
  }, []);

  const loadRecentSessions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('rant_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentSessions(data || []);
    } catch (error) {
      console.error('Error loading recent sessions:', error);
    }
  };

  const initializeSpeechRecognition = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscript) {
          sendUserInput(finalTranscript);
          setSpeechError(null); // Clear any previous speech errors
        }
      };
      
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        
        // Handle different types of speech recognition errors
        switch (event.error) {
          case 'no-speech':
            setSpeechError('No speech detected. Please check your microphone and speak clearly.');
            break;
          case 'audio-capture':
            setSpeechError('Microphone not accessible. Please check your microphone permissions.');
            break;
          case 'not-allowed':
            setSpeechError('Microphone access denied. Please allow microphone access and try again.');
            break;
          case 'network':
            setSpeechError('Network error occurred. Please check your internet connection.');
            break;
          case 'service-not-allowed':
            setSpeechError('Speech recognition service not available. Please try again later.');
            break;
          default:
            setSpeechError(`Speech recognition error: ${event.error}. Please try again.`);
        }
      };
      
      recognition.onstart = () => {
        setSpeechError(null); // Clear errors when recognition starts successfully
      };
      
      speechRecognitionRef.current = recognition;
    }
  };

  const startVideoCall = async () => {
    if (moodBefore === null) {
      alert('Please rate your current mood first');
      return;
    }

    try {
      // Get user media first
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideoEnabled,
        audio: isAudioEnabled
      });
      
      setUserStream(stream);
      
      // Set up user video
      if (userVideoRef.current) {
        userVideoRef.current.srcObject = stream;
        userVideoRef.current.onloadedmetadata = () => {
          userVideoRef.current?.play().catch(console.error);
        };
      }

      // Start Tavus conversation
      await startConversation();
      
      // Start speech recognition
      if (speechRecognitionRef.current && isAudioEnabled) {
        speechRecognitionRef.current.start();
      }
      
      setIsCallActive(true);
      setCallMode('video');
      
    } catch (error) {
      console.error('Error starting video call:', error);
      
      // Enhanced error handling for device-specific issues
      if (error instanceof DOMException) {
        switch (error.name) {
          case 'NotFoundError':
            alert('No camera or microphone was detected. Please ensure you have a camera and microphone connected and enabled, then try again.');
            break;
          case 'NotAllowedError':
            alert('Camera and microphone access was denied. Please allow access to your camera and microphone in your browser settings and try again.');
            break;
          case 'NotReadableError':
            alert('Your camera or microphone is already in use by another application. Please close other applications using these devices and try again.');
            break;
          case 'OverconstrainedError':
            alert('Your camera or microphone does not meet the required specifications. Please try with different devices or check your hardware.');
            break;
          case 'SecurityError':
            alert('Camera and microphone access is blocked due to security restrictions. Please ensure you are using HTTPS and try again.');
            break;
          default:
            alert('Unable to access camera or microphone. Please check your device permissions and try again.');
        }
      } else {
        alert(`Unable to start video call: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  const startTextChat = () => {
    if (moodBefore === null) {
      alert('Please rate your current mood first');
      return;
    }
    
    setCallMode('text');
    setShowTextChat(true);
  };

  const handleEndCall = async () => {
    try {
      // Stop user media
      if (userStream) {
        userStream.getTracks().forEach(track => track.stop());
        setUserStream(null);
      }
      
      // Stop speech recognition
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
      }
      
      // End Tavus conversation
      await endConversation();
      
      // Clear Tavus iframe
      if (tavusVideoRef.current) {
        tavusVideoRef.current.src = '';
      }
      
      setIsCallActive(false);
      setSessionComplete(true);
      setSpeechError(null); // Clear speech errors
      
      // Save session to database
      if (user && transcript.length > 0) {
        const sessionText = transcript
          .filter(msg => msg.speaker === 'user')
          .map(msg => msg.text)
          .join(' ');
          
        await supabase
          .from('rant_sessions')
          .insert({
            user_id: user.id,
            input_text: sessionText,
            detected_emotion: currentEmotion?.emotion || 'neutral',
            confidence_score: currentEmotion?.confidence || 0,
            video_response_id: conversationUrl || '',
            mood_before: moodBefore
          });
      }
      
    } catch (error) {
      console.error('Error ending call:', error);
    }
  };

  const toggleVideo = () => {
    if (userStream) {
      const videoTrack = userStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (userStream) {
      const audioTrack = userStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
        
        // Restart/stop speech recognition based on audio state
        if (speechRecognitionRef.current) {
          if (audioTrack.enabled) {
            speechRecognitionRef.current.start();
            setSpeechError(null);
          } else {
            speechRecognitionRef.current.stop();
            setSpeechError(null);
          }
        }
      }
    }
  };

  const handleMoodAfterSubmit = async () => {
    if (!user || moodAfter === null) return;

    try {
      // Update the most recent session with mood after
      const { data: sessions } = await supabase
        .from('rant_sessions')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (sessions && sessions.length > 0) {
        await supabase
          .from('rant_sessions')
          .update({ mood_after: moodAfter })
          .eq('id', sessions[0].id);
      }

      alert('Thank you for sharing how you feel. Your progress has been saved.');
      resetSession();
    } catch (error) {
      console.error('Error saving mood after:', error);
    }
  };

  const resetSession = () => {
    setCallMode('text');
    setIsCallActive(false);
    setShowTextChat(false);
    setMoodBefore(null);
    setMoodAfter(null);
    setSessionComplete(false);
    setInputText('');
    setSpeechError(null);
    loadRecentSessions();
  };

  const cleanup = () => {
    if (userStream) {
      userStream.getTracks().forEach(track => track.stop());
    }
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
    }
    setSpeechError(null);
  };

  const getMoodIcon = (mood: number) => {
    if (mood <= 2) return '😢';
    if (mood === 3) return '😐';
    return '😊';
  };

  const getEmotionColor = (emotion: string) => {
    const colors = {
      angry: '#dc2626',
      sad: '#1f2937',
      anxious: '#7c3aed',
      hopeless: '#4338ca',
      confused: '#ea580c',
      happy: '#059669',
      neutral: '#78A083'
    };
    return colors[emotion as keyof typeof colors] || colors.neutral;
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-gradient-to-br from-primary-100 to-secondary-100 rounded-full">
              <Sparkles size={32} className="text-primary-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">AI Companion</h1>
          <p className="text-neutral-600 max-w-2xl mx-auto">
            Connect with an empathetic AI companion through video call or text chat. 
            Share what's on your mind and receive personalized, real-time support.
          </p>
        </div>

        {/* Error Display */}
        {conversationError && (
          <Card className="mb-6 border-error-200 bg-error-50">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="text-error-600" size={20} />
              <h3 className="font-semibold text-error-800">Connection Error</h3>
            </div>
            <p className="text-error-700 mb-4">{conversationError}</p>
            <Button variant="outline" onClick={resetSession}>
              Try Again
            </Button>
          </Card>
        )}

        {/* Speech Recognition Error Display */}
        {speechError && isCallActive && (
          <Card className="mb-6 border-warning-200 bg-warning-50">
            <div className="flex items-center space-x-2 mb-2">
              <AlertCircle className="text-warning-600" size={20} />
              <h3 className="font-semibold text-warning-800">Microphone Issue</h3>
            </div>
            <p className="text-warning-700 mb-4">{speechError}</p>
            <Button 
              variant="outline" 
              onClick={() => {
                setSpeechError(null);
                if (speechRecognitionRef.current && isAudioEnabled) {
                  speechRecognitionRef.current.start();
                }
              }}
            >
              Try Again
            </Button>
          </Card>
        )}

        {/* Replica/Persona Status */}
        {!replica && !isConnecting && (
          <Card className="mb-6 border-warning-200 bg-warning-50">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="text-warning-600" size={20} />
              <h3 className="font-semibold text-warning-800">Setting up!!</h3>
            </div>
            <p className="text-warning-700">
              Connecting to Companions... Please be patient.
            </p>
          </Card>
        )}

        {/* Mode Selection */}
        {!isCallActive && !sessionComplete && !showTextChat && (
          <Card className="mb-6">
            <h2 className="text-xl font-semibold mb-4">How would you like to connect?</h2>
            
            {/* Mood Before Input */}
            {moodBefore === null && (
              <div className="mb-6 p-4 bg-primary-50 rounded-lg">
                <h3 className="font-medium text-neutral-900 mb-3">
                  First, how would you rate your mood right now?
                </h3>
                <div className="flex justify-between items-center">
                  {[1, 2, 3, 4, 5].map((mood) => (
                    <button
                      key={mood}
                      onClick={() => setMoodBefore(mood)}
                      className="flex flex-col items-center p-2 rounded-md hover:bg-white transition-colors"
                    >
                      <span className="text-2xl mb-1">{getMoodIcon(mood)}</span>
                      <span className="text-xs text-neutral-600">
                        {mood === 1 ? 'Very Bad' : mood === 2 ? 'Bad' : mood === 3 ? 'Okay' : mood === 4 ? 'Good' : 'Great'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {moodBefore !== null && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Video Call Option */}
                <div className="p-6 border-2 border-primary-200 rounded-lg hover:border-primary-400 transition-colors">
                  <div className="flex items-center mb-4">
                    <Video className="text-primary-600 mr-3" size={24} />
                    <h3 className="text-lg font-semibold">Video Call</h3>
                  </div>
                  <p className="text-neutral-600 mb-4">
                    Have a face-to-face conversation with an AI companion. Speak naturally and receive 
                    real-time empathetic responses through video.
                  </p>
                  <ul className="text-sm text-neutral-600 mb-6 space-y-1">
                    <li>• Real-time conversation</li>
                    <li>• Voice and video interaction</li>
                    <li>• Immediate emotional support</li>
                    <li>• Natural conversation flow</li>
                    <li>• Conversation time constraints due to limited resources.</li>
                  </ul>
                  <Button
                    variant="primary"
                    onClick={startVideoCall}
                    disabled={isConnecting || !replica}
                    icon={isConnecting ? undefined : <Video size={18} />}
                    fullWidth
                  >
                    {isConnecting ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Connecting...
                      </div>
                    ) : (
                      'Start Video Call'
                    )}
                  </Button>
                </div>

                {/* Text Chat Option */}
                <div className="p-6 border-2 border-neutral-200 rounded-lg hover:border-neutral-400 transition-colors">
                  <div className="flex items-center mb-4">
                    <MessageSquare className="text-neutral-600 mr-3" size={24} />
                    <h3 className="text-lg font-semibold">Text Chat</h3>
                  </div>
                  <p className="text-neutral-600 mb-4">
                    Express yourself through writing. Take your time to share your thoughts 
                    and receive thoughtful, personalized responses.
                  </p>
                  <ul className="text-sm text-neutral-600 mb-6 space-y-1">
                    <li>• Written expression</li>
                    <li>• Take your time</li>
                    <li>• Thoughtful responses</li>
                    <li>• Privacy focused; We don't save your sessions.</li>
                  </ul>
                  <Button
                    variant="outline"
                    onClick={startTextChat}
                    icon={<MessageSquare size={18} />}
                    fullWidth
                  >
                    Start Text Chat
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Text Chat Interface */}
        {showTextChat && callMode === 'text' && !sessionComplete && (
          <Card className="mb-6">
            <ChatInterface 
              onClose={() => setShowTextChat(false)}
              initialMood={moodBefore || undefined}
            />
          </Card>
        )}

        {/* Video Call Interface */}
        {isCallActive && callMode === 'video' && (
          <div className="space-y-6">
            {/* Video Grid */}
            <Card className="p-0 overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-2 h-96 lg:h-[500px]">
                {/* AI Video */}
                <div className="relative bg-gradient-to-br from-primary-100 to-secondary-100">
                  {conversationUrl ? (
                    <iframe
                      ref={tavusVideoRef}
                      src={conversationUrl}
                      className="w-full h-full"
                      allow="camera; microphone; autoplay; encrypted-media; fullscreen"
                      title="AI Companion Video"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center text-neutral-600">
                        <Sparkles size={48} className="mx-auto mb-2 opacity-50" />
                        <p className="text-sm opacity-75">Connecting to AI companion...</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                    AI Companion
                  </div>
                  
                  {/* Emotion Indicator */}
                  {currentEmotion && currentEmotion.emotion !== 'neutral' && (
                    <div 
                      className="absolute top-4 left-4 px-3 py-1 rounded-full text-white text-sm font-medium"
                      style={{ backgroundColor: getEmotionColor(currentEmotion.emotion) }}
                    >
                      Detected: {currentEmotion.emotion} ({Math.round(currentEmotion.confidence)}%)
                    </div>
                  )}
                  
                  {/* Connection Status */}
                  <div className="absolute top-4 right-4">
                    <div className={`w-3 h-3 rounded-full ${
                      isConnected ? 'bg-green-500' : 
                      isConnecting ? 'bg-yellow-500' : 'bg-red-500'
                    }`}></div>
                  </div>
                </div>

                {/* User Video */}
                <div className="relative bg-neutral-900">
                  <video
                    ref={userVideoRef}
                    className="w-full h-full object-cover"
                    autoPlay
                    playsInline
                    muted
                  />
                  <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                    You
                  </div>
                  
                  {!isVideoEnabled && (
                    <div className="absolute inset-0 bg-neutral-800 flex items-center justify-center">
                      <div className="text-center text-white">
                        <CameraOff size={48} className="mx-auto mb-2 opacity-50" />
                        <p className="text-sm opacity-75">Camera is off</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Call Controls */}
              <div className="p-4 bg-neutral-50 flex justify-center space-x-4">
                <Button
                  variant={isAudioEnabled ? "outline" : "error"}
                  onClick={toggleAudio}
                  icon={isAudioEnabled ? <Mic size={18} /> : <MicOff size={18} />}
                >
                  {isAudioEnabled ? 'Mute' : 'Unmute'}
                </Button>
                
                <Button
                  variant={isVideoEnabled ? "outline" : "secondary"}
                  onClick={toggleVideo}
                  icon={isVideoEnabled ? <Camera size={18} /> : <CameraOff size={18} />}
                >
                  {isVideoEnabled ? 'Turn Off Video' : 'Turn On Video'}
                </Button>
                
                <Button
                  variant={isSpeakerOn ? "outline" : "secondary"}
                  onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                  icon={isSpeakerOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
                >
                  Speaker
                </Button>
                
                <Button
                  variant="error"
                  onClick={handleEndCall}
                  icon={<PhoneOff size={18} />}
                >
                  End Call
                </Button>
              </div>
            </Card>

            {/* Live Transcript */}
            <Card>
              <h3 className="text-lg font-semibold mb-4">Conversation</h3>
              <div className="max-h-64 overflow-y-auto space-y-3">
                {transcript.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.speaker === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.speaker === 'user'
                          ? 'bg-primary-500 text-white'
                          : 'bg-neutral-100 text-neutral-900'
                      }`}
                    >
                      <p className="text-sm">{message.text}</p>
                      <p className="text-xs opacity-75 mt-1">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Post-Session Feedback */}
        {sessionComplete && (
          <Card>
            <h3 className="text-lg font-semibold mb-4">How are you feeling now?</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-neutral-600 mb-3">
                  Rate your mood after this session:
                </p>
                <div className="flex justify-between items-center mb-4">
                  {[1, 2, 3, 4, 5].map((mood) => (
                    <button
                      key={mood}
                      onClick={() => setMoodAfter(mood)}
                      className={`flex flex-col items-center p-2 rounded-md transition-colors ${
                        moodAfter === mood ? 'bg-primary-100' : 'hover:bg-neutral-50'
                      }`}
                    >
                      <span className="text-2xl mb-1">{getMoodIcon(mood)}</span>
                      <span className="text-xs text-neutral-600">
                        {mood === 1 ? 'Worse' : mood === 2 ? 'Same' : mood === 3 ? 'Okay' : mood === 4 ? 'Better' : 'Much Better'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex space-x-3">
                <Button
                  variant="primary"
                  onClick={handleMoodAfterSubmit}
                  disabled={moodAfter === null}
                  className="flex-1"
                >
                  Save Progress
                </Button>
                <Button
                  variant="outline"
                  onClick={resetSession}
                  icon={<RotateCcw size={18} />}
                >
                  New Session
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-neutral-200">
                <Button
                  variant="outline"
                  icon={<BookOpen size={18} />}
                  onClick={() => window.open('/journal', '_blank')}
                >
                  Continue Journaling
                </Button>
                <Button
                  variant="outline"
                  icon={<MessageCircle size={18} />}
                  onClick={() => window.open('/forum', '_blank')}
                >
                  Join Community
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className="lg:col-span-2">
            {/* Crisis Support */}
            {currentEmotion?.emotion === 'hopeless' && (
              <Card className="border-error-200 bg-error-50">
                <div className="flex items-center space-x-2 mb-4">
                  <Phone className="text-error-600" size={20} />
                  <h3 className="font-semibold text-error-800">Additional Support Available</h3>
                </div>
                <p className="text-error-700 mb-4">
                  I'm concerned about what you're going through. Here are some immediate support options:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <a 
                    href="tel:988"
                    className="flex items-center p-3 bg-white rounded-md hover:bg-error-100 transition-colors"
                  >
                    <Phone size={16} className="text-error-600 mr-2" />
                    <span className="font-medium text-error-800">Call 988 Crisis Line</span>
                  </a>
                  <a 
                    href="sms:741741?&body=HOME"
                    className="flex items-center p-3 bg-white rounded-md hover:bg-error-100 transition-colors"
                  >
                    <MessageCircle size={16} className="text-error-600 mr-2" />
                    <span className="font-medium text-error-800">Text Crisis Line</span>
                  </a>
                </div>
              </Card>
            )}
          </div>

          <div>
            <Card className="sticky top-6">
              <h3 className="text-lg font-semibold mb-4">Your Safe Space</h3>

              {/* Shorter copy on small screens */}
              <div className="md:hidden space-y-3 text-xs text-neutral-600">
                <div>
                  <h4 className="font-medium text-neutral-900 mb-1.5">🎥 Video</h4>
                  <ul className="space-y-0.5">
                    <li>• Live AI + voice; responds to how you feel</li>
                    <li>• Empathetic video replies</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-neutral-900 mb-1.5">💬 Text</h4>
                  <ul className="space-y-0.5">
                    <li>• Thoughtful written replies</li>
                    <li>• Starters, bookmarks & suggestions</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-neutral-900 mb-1.5">🔒 Privacy</h4>
                  <ul className="space-y-0.5">
                    <li>• Confidential; you control your data</li>
                    <li>• Encrypted; no recordings kept</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-neutral-900 mb-1.5">💡 Tips</h4>
                  <ul className="space-y-0.5">
                    <li>• Be honest; pause when you need to</li>
                    <li>• Pick video or text—whatever feels safer</li>
                  </ul>
                </div>
              </div>

              {/* Full copy on md+ */}
              <div className="hidden md:block space-y-4 text-sm text-neutral-600">
                <div>
                  <h4 className="font-medium text-neutral-900 mb-2">🎥 Video Call Features:</h4>
                  <ul className="space-y-1">
                    <li>• Real-time AI conversation</li>
                    <li>• Emotion detection & response</li>
                    <li>• Natural voice interaction</li>
                    <li>• Empathetic video responses</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-neutral-900 mb-2">💬 Text Chat Features:</h4>
                  <ul className="space-y-1">
                    <li>• Thoughtful written responses</li>
                    <li>• Suggested conversation starters</li>
                    <li>• Bookmark important conversations</li>
                    <li>• Smart recommendations</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-neutral-900 mb-2">🔒 Privacy:</h4>
                  <ul className="space-y-1">
                    <li>• Conversations are confidential</li>
                    <li>• End-to-end encryption</li>
                    <li>• You control your data</li>
                    <li>• No recordings stored</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-neutral-900 mb-2">💡 Tips:</h4>
                  <ul className="space-y-1">
                    <li>• Be honest about your feelings</li>
                    <li>• Take breaks when you need them</li>
                    <li>• Use the mode that feels comfortable</li>
                    <li>• Follow up with other app features</li>
                  </ul>
                </div>

                {/* {personas.length > 0 && (
                  <div>
                    <h4 className="font-medium text-neutral-900 mb-2">🤖 Available Companions:</h4>
                    <ul className="space-y-1">
                      {personas.slice(0, 3).map((persona) => (
                        <li key={persona.persona_id} className="text-xs">
                          • {persona.persona_name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )} */} 
              </div>

              {recentSessions.length > 0 && (
                <div className="mt-6 pt-6 border-t border-neutral-200">
                  <h4 className="font-medium text-neutral-900 mb-3">Recent Sessions</h4>
                  <div className="space-y-2">
                    {recentSessions.slice(0, 3).map((session) => (
                      <div key={session.id} className="p-2 bg-neutral-50 rounded-md">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium capitalize">
                            {session.detected_emotion.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-neutral-500">
                            {new Date(session.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {session.mood_before && session.mood_after && (
                          <div className="text-xs text-neutral-600 mt-1">
                            Mood: {getMoodIcon(session.mood_before)} → {getMoodIcon(session.mood_after)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RantCompanionPage;