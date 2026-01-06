import { ReactNode } from 'react';

interface AchievementBadgeProps {
  icon: ReactNode;
  title: string;
  description: string;
  progress?: number;
  maxProgress?: number;
  isUnlocked?: boolean;
  color?: string;
}

const AchievementBadge = ({
  icon,
  title,
  description,
  progress = 0,
  maxProgress = 1,
  isUnlocked = false,
  color = 'primary'
}: AchievementBadgeProps) => {
  const progressPercentage = Math.min(100, Math.round((progress / maxProgress) * 100));
  
  const colorClasses = {
    primary: {
      bg: 'bg-primary-100',
      text: 'text-primary-700',
      border: 'border-primary-200',
      progress: 'bg-primary-500',
      icon: 'text-primary-600'
    },
    secondary: {
      bg: 'bg-secondary-100',
      text: 'text-secondary-700',
      border: 'border-secondary-200',
      progress: 'bg-secondary-500',
      icon: 'text-secondary-600'
    },
    accent: {
      bg: 'bg-accent-100',
      text: 'text-accent-700',
      border: 'border-accent-200',
      progress: 'bg-accent-500',
      icon: 'text-accent-600'
    },
    success: {
      bg: 'bg-success-100',
      text: 'text-success-700',
      border: 'border-success-200',
      progress: 'bg-success-500',
      icon: 'text-success-600'
    }
  };
  
  const colorClass = colorClasses[color as keyof typeof colorClasses] || colorClasses.primary;

  return (
    <div className={`p-4 rounded-lg ${isUnlocked ? colorClass.bg : 'bg-neutral-100'} ${isUnlocked ? colorClass.border : 'border-neutral-200'} border transition-all duration-300 ${isUnlocked ? 'shadow-sm' : 'opacity-70'}`}>
      <div className="flex items-center mb-2">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isUnlocked ? colorClass.bg : 'bg-neutral-200'}`}>
          <div className={isUnlocked ? colorClass.icon : 'text-neutral-500'}>
            {icon}
          </div>
        </div>
        <div className="ml-3">
          <h3 className={`font-medium ${isUnlocked ? colorClass.text : 'text-neutral-600'}`}>{title}</h3>
          <p className="text-xs text-neutral-500">{description}</p>
        </div>
      </div>
      
      {maxProgress > 1 && (
        <div className="mt-2">
          <div className="flex justify-between text-xs mb-1">
            <span className={isUnlocked ? colorClass.text : 'text-neutral-500'}>Progress</span>
            <span className={isUnlocked ? colorClass.text : 'text-neutral-500'}>{progress}/{maxProgress}</span>
          </div>
          <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
            <div 
              className={`h-full ${isUnlocked ? colorClass.progress : 'bg-neutral-400'} transition-all duration-500`}
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AchievementBadge;