import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { gamificationService, type GamificationData, type Achievement } from '../services/gamificationService';

export const useGamification = () => {
  const { user } = useAuthStore();
  const [data, setData] = useState<GamificationData>({
    points: 0,
    level: 1,
    streak: 0,
    achievements: [],
    lastActivityDate: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGamificationData();
  }, [user]);

  const loadGamificationData = async () => {
    try {
      setLoading(true);
      const userId = user?.id || 'anonymous';
      const gamificationData = await gamificationService.loadGamificationData(userId);
      setData(gamificationData);
    } catch (error) {
      console.error('Error loading gamification data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addPoints = async (points: number) => {
    try {
      const userId = user?.id || 'anonymous';
      const result = await gamificationService.addPoints(userId, points);
      
      setData(prev => ({
        ...prev,
        points: result.newPoints,
        level: result.newLevel
      }));
      
      return result;
    } catch (error) {
      console.error('Error adding points:', error);
      return { newPoints: data.points, newLevel: data.level, leveledUp: false };
    }
  };

  const updateStreak = async () => {
    try {
      const userId = user?.id || 'anonymous';
      const newStreak = await gamificationService.updateStreak(userId);
      
      setData(prev => ({
        ...prev,
        streak: newStreak
      }));
      
      return newStreak;
    } catch (error) {
      console.error('Error updating streak:', error);
      return data.streak;
    }
  };

  const updateAchievement = async (
    achievementId: string,
    progress: number,
    maxProgress: number
  ) => {
    try {
      const userId = user?.id || 'anonymous';
      const achievement = await gamificationService.updateAchievement(
        userId,
        achievementId,
        progress,
        maxProgress
      );
      
      if (achievement) {
        setData(prev => ({
          ...prev,
          achievements: [
            ...prev.achievements.filter(a => a.id !== achievementId),
            achievement
          ]
        }));
      }
      
      return achievement;
    } catch (error) {
      console.error('Error updating achievement:', error);
      return null;
    }
  };

  return {
    ...data,
    loading,
    addPoints,
    updateStreak,
    updateAchievement,
    refreshData: loadGamificationData
  };
};