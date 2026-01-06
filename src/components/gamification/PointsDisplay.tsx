import { Star, TrendingUp, Award } from 'lucide-react';

interface PointsDisplayProps {
  points: number;
  level: number;
  nextLevelPoints: number;
  className?: string;
}

const PointsDisplay = ({ points, level, nextLevelPoints, className = '' }: PointsDisplayProps) => {
  // Calculate progress to next level
  const progressPercentage = Math.min(100, Math.round((points / nextLevelPoints) * 100));
  
  return (
    <div className={`p-4 rounded-lg bg-primary-50 border border-primary-100 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <Star className="text-primary-500 mr-2" size={20} />
          <h3 className="font-medium text-primary-700">Wellness Points</h3>
        </div>
        <span className="text-xl font-bold text-primary-700">{points}</span>
      </div>
      
      <div className="mb-2">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-primary-600">Level {level}</span>
          <span className="text-primary-600">{points}/{nextLevelPoints} points</span>
        </div>
        <div className="w-full h-2 bg-primary-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary-500 transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>
      
      <div className="flex items-center justify-between text-xs text-primary-600">
        <div className="flex items-center">
          <TrendingUp size={14} className="mr-1" />
          <span>{nextLevelPoints - points} points to level {level + 1}</span>
        </div>
        <div className="flex items-center">
          <Award size={14} className="mr-1" />
          <span>Rank: {getRank(level)}</span>
        </div>
      </div>
    </div>
  );
};

// Helper function to determine rank based on level
const getRank = (level: number): string => {
  if (level < 3) return 'Beginner';
  if (level < 6) return 'Explorer';
  if (level < 10) return 'Enthusiast';
  if (level < 15) return 'Achiever';
  if (level < 20) return 'Master';
  return 'Wellness Champion';
};

export default PointsDisplay;