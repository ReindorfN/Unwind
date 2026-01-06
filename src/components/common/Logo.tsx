import { Heart } from 'lucide-react';

interface LogoProps {
  size?: number;
  className?: string;
}

const Logo = ({ size = 24, className = '' }: LogoProps) => {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-0 text-primary-400 animate-pulse-slow">
        <Heart size={size} fill="#78A083" />
      </div>
      <Heart size={size} className="text-primary-500" />
    </div>
  );
};

export default Logo;