import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Clock, Heart } from 'lucide-react';
import Button from '../common/Button';
import Card from '../common/Card';

interface MeditationSessionProps {
  onComplete: () => void;
  onClose: () => void;
}

const MeditationSession = ({ onComplete, onClose }: MeditationSessionProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedDuration, setSelectedDuration] = useState(5); // minutes
  const [phase, setPhase] = useState<'setup' | 'breathing' | 'meditation' | 'complete'>('setup');
  const [breathingPhase, setBreathingPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const breathingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const durations = [
    { value: 3, label: '3 minutes', description: 'Quick reset' },
    { value: 5, label: '5 minutes', description: 'Daily practice' },
    { value: 10, label: '10 minutes', description: 'Deep relaxation' },
    { value: 15, label: '15 minutes', description: 'Extended session' },
  ];

  const breathingCycle = {
    inhale: 4000,  // 4 seconds
    hold: 4000,    // 4 seconds  
    exhale: 6000,  // 6 seconds
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (breathingIntervalRef.current) clearInterval(breathingIntervalRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const playTone = (frequency: number, duration: number) => {
    if (!soundEnabled) return;
    
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      
      oscillator.frequency.setValueAtTime(frequency, audioContextRef.current.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, audioContextRef.current.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, audioContextRef.current.currentTime + 0.1);
      gainNode.gain.linearRampToValueAtTime(0, audioContextRef.current.currentTime + duration / 1000);
      
      oscillator.start(audioContextRef.current.currentTime);
      oscillator.stop(audioContextRef.current.currentTime + duration / 1000);
    } catch (error) {
      console.log('Audio not supported');
    }
  };

  const startBreathingGuide = () => {
    setPhase('breathing');
    setBreathingPhase('inhale');
    playTone(220, 500); // Start tone
    
    const cycleBreathing = () => {
      let currentPhase = 'inhale';
      
      const updatePhase = () => {
        setBreathingPhase(currentPhase as any);
        
        if (currentPhase === 'inhale') {
          playTone(330, 200);
          setTimeout(() => {
            currentPhase = 'hold';
            updatePhase();
          }, breathingCycle.inhale);
        } else if (currentPhase === 'hold') {
          setTimeout(() => {
            currentPhase = 'exhale';
            updatePhase();
          }, breathingCycle.hold);
        } else {
          playTone(220, 200);
          setTimeout(() => {
            currentPhase = 'inhale';
            updatePhase();
          }, breathingCycle.exhale);
        }
      };
      
      updatePhase();
    };
    
    cycleBreathing();
    breathingIntervalRef.current = setInterval(cycleBreathing, 
      breathingCycle.inhale + breathingCycle.hold + breathingCycle.exhale);
  };

  const startMeditation = () => {
    setPhase('meditation');
    setIsPlaying(true);
    setCurrentTime(0);
    
    if (breathingIntervalRef.current) {
      clearInterval(breathingIntervalRef.current);
    }
    
    playTone(440, 1000); // Meditation start tone
    
    intervalRef.current = setInterval(() => {
      setCurrentTime(prev => {
        const newTime = prev + 1;
        if (newTime >= selectedDuration * 60) {
          completeMeditation();
          return prev;
        }
        return newTime;
      });
    }, 1000);
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      setIsPlaying(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
    } else {
      setIsPlaying(true);
      intervalRef.current = setInterval(() => {
        setCurrentTime(prev => {
          const newTime = prev + 1;
          if (newTime >= selectedDuration * 60) {
            completeMeditation();
            return prev;
          }
          return newTime;
        });
      }, 1000);
    }
  };

  const completeMeditation = () => {
    setPhase('complete');
    setIsPlaying(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (breathingIntervalRef.current) clearInterval(breathingIntervalRef.current);
    
    playTone(523, 1500); // Completion tone
    onComplete();
  };

  const resetSession = () => {
    setPhase('setup');
    setCurrentTime(0);
    setIsPlaying(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (breathingIntervalRef.current) clearInterval(breathingIntervalRef.current);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getBreathingInstruction = () => {
    switch (breathingPhase) {
      case 'inhale': return 'Breathe in slowly...';
      case 'hold': return 'Hold your breath...';
      case 'exhale': return 'Breathe out slowly...';
    }
  };

  const getBreathingCircleScale = () => {
    switch (breathingPhase) {
      case 'inhale': return 'scale-125';
      case 'hold': return 'scale-125';
      case 'exhale': return 'scale-75';
    }
  };

  if (phase === 'setup') {
    return (
      <Card className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Heart className="text-primary-600" size={32} />
          </div>
          <h3 className="text-xl font-semibold text-neutral-900 mb-2">Meditation Session</h3>
          <p className="text-neutral-600">Choose your meditation duration</p>
        </div>

        <div className="space-y-3 mb-6">
          {durations.map((duration) => (
            <button
              key={duration.value}
              onClick={() => setSelectedDuration(duration.value)}
              className={`w-full p-4 rounded-lg border-2 transition-colors text-left ${
                selectedDuration === duration.value
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-neutral-200 hover:border-primary-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-neutral-900">{duration.label}</span>
                  <p className="text-sm text-neutral-600">{duration.description}</p>
                </div>
                <Clock size={20} className="text-neutral-400" />
              </div>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between mb-6">
          <span className="text-sm font-medium text-neutral-700">Sound guidance</span>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-md transition-colors ${
              soundEnabled ? 'text-primary-600' : 'text-neutral-400'
            }`}
          >
            {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
        </div>

        <div className="flex space-x-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button variant="primary" onClick={startBreathingGuide} className="flex-1">
            Begin Session
          </Button>
        </div>
      </Card>
    );
  }

  if (phase === 'breathing') {
    return (
      <Card className="max-w-md mx-auto text-center">
        <h3 className="text-xl font-semibold text-neutral-900 mb-2">Breathing Exercise</h3>
        <p className="text-neutral-600 mb-8">Let's start with some deep breathing to center yourself</p>

        <div className="mb-8">
          <div className={`w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center transition-transform duration-1000 ${getBreathingCircleScale()}`}>
            <div className="text-white font-medium">
              {breathingPhase === 'inhale' && '↑'}
              {breathingPhase === 'hold' && '●'}
              {breathingPhase === 'exhale' && '↓'}
            </div>
          </div>
          <p className="text-lg font-medium text-neutral-700 mt-4">
            {getBreathingInstruction()}
          </p>
        </div>

        <div className="flex space-x-3">
          <Button variant="outline" onClick={resetSession} className="flex-1">
            Back
          </Button>
          <Button variant="primary" onClick={startMeditation} className="flex-1">
            Start Meditation
          </Button>
        </div>
      </Card>
    );
  }

  if (phase === 'meditation') {
    const progress = (currentTime / (selectedDuration * 60)) * 100;
    
    return (
      <Card className="max-w-md mx-auto text-center">
        <h3 className="text-xl font-semibold text-neutral-900 mb-2">Meditation in Progress</h3>
        <p className="text-neutral-600 mb-8">Focus on your breath and let your thoughts flow</p>

        <div className="mb-8">
          <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center mb-4 relative overflow-hidden">
            <div 
              className="absolute inset-0 bg-white opacity-20"
              style={{ 
                clipPath: `polygon(50% 50%, 50% 0%, ${50 + 50 * Math.cos((progress / 100) * 2 * Math.PI - Math.PI/2)}% ${50 + 50 * Math.sin((progress / 100) * 2 * Math.PI - Math.PI/2)}%, 50% 50%)` 
              }}
            />
            <div className="text-white font-medium text-lg">
              {formatTime(selectedDuration * 60 - currentTime)}
            </div>
          </div>
          
          <div className="w-full bg-neutral-200 rounded-full h-2 mb-4">
            <div 
              className="bg-primary-500 h-2 rounded-full transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <p className="text-sm text-neutral-600">
            {formatTime(currentTime)} / {formatTime(selectedDuration * 60)}
          </p>
        </div>

        <div className="flex space-x-3">
          <Button 
            variant="outline" 
            onClick={togglePlayPause}
            icon={isPlaying ? <Pause size={18} /> : <Play size={18} />}
            className="flex-1"
          >
            {isPlaying ? 'Pause' : 'Resume'}
          </Button>
          <Button 
            variant="secondary" 
            onClick={completeMeditation}
            className="flex-1"
          >
            Complete
          </Button>
        </div>
      </Card>
    );
  }

  if (phase === 'complete') {
    return (
      <Card className="max-w-md mx-auto text-center">
        <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Heart className="text-success-600" size={32} />
        </div>
        <h3 className="text-xl font-semibold text-neutral-900 mb-2">Session Complete!</h3>
        <p className="text-neutral-600 mb-6">
          Great job! You've completed your {selectedDuration}-minute meditation session.
        </p>
        
        <div className="bg-primary-50 p-4 rounded-lg mb-6">
          <p className="text-sm text-primary-700">
            "The present moment is the only time over which we have dominion." - Thich Nhat Hanh
          </p>
        </div>

        <div className="flex space-x-3">
          <Button variant="outline" onClick={resetSession} icon={<RotateCcw size={18} />} className="flex-1">
            New Session
          </Button>
          <Button variant="primary" onClick={onClose} className="flex-1">
            Done
          </Button>
        </div>
      </Card>
    );
  }

  return null;
};

export default MeditationSession;