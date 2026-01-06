import { Calendar, Award, Flame } from 'lucide-react';

interface StreakCounterProps {
  streak: number;
  className?: string;
}

const StreakCounter = ({ streak, className = '' }: StreakCounterProps) => {
  // Determine the appropriate message based on streak length
  const getMessage = () => {
    if (streak === 0) return "Start your streak today!";
    if (streak === 1) return "You've started your journey!";
    if (streak < 5) return "Keep going, you're doing great!";
    if (streak < 10) return "Impressive consistency!";
    if (streak < 30) return "You're building a solid habit!";
    return "Amazing dedication! You're a wellness champion!";
  };

  // Determine the appropriate color based on streak length
  const getColor = () => {
    if (streak === 0) return 'bg-neutral-100 text-neutral-600';
    if (streak < 3) return 'bg-primary-100 text-primary-700';
    if (streak < 7) return 'bg-secondary-100 text-secondary-700';
    if (streak < 14) return 'bg-accent-100 text-accent-700';
    return 'bg-success-100 text-success-700';
  };

  return (
    <div className={`p-4 rounded-lg ${getColor()} ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <Flame className="mr-2" size={20} />
          <h3 className="font-medium">Current Streak</h3>
        </div>
        <div className="flex items-center">
          <span className="text-2xl font-bold">{streak}</span>
          <span className="ml-1 text-sm">days</span>
        </div>
      </div>
      
      <p className="text-sm opacity-90">{getMessage()}</p>
      
      {streak >= 7 && (
        <div className="mt-3 pt-3 border-t border-opacity-20 flex items-center">
          <Award size={16} className="mr-2" />
          <span className="text-xs">
            {streak >= 30 ? 'Monthly' : streak >= 7 ? 'Weekly' : ''} streak achievement unlocked!
          </span>
        </div>
      )}
    </div>
  );
};

export default StreakCounter;