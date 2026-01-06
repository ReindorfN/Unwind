import { supabase } from '../lib/supabase';

interface GamificationData {
  points: number;
  level: number;
  streak: number;
  achievements: Achievement[];
  lastActivityDate: string;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  isUnlocked: boolean;
  unlockedAt?: string;
  progress: number;
  maxProgress: number;
}

class GamificationService {
  private static instance: GamificationService;
  
  static getInstance(): GamificationService {
    if (!GamificationService.instance) {
      GamificationService.instance = new GamificationService();
    }
    return GamificationService.instance;
  }
  
  // Save gamification data to both localStorage and database
  async saveGamificationData(userId: string, data: Partial<GamificationData>): Promise<void> {
    try {
      // Save to localStorage for immediate access
      const currentData = this.getLocalGamificationData(userId);
      const updatedData = { ...currentData, ...data };
      localStorage.setItem(`gamification_${userId}`, JSON.stringify(updatedData));
      
      // Save to database for persistence
      if (userId !== 'anonymous') {
        await supabase
          .from('user_gamification')
          .upsert({
            user_id: userId,
            points: updatedData.points,
            level: updatedData.level,
            streak: updatedData.streak,
            achievements: updatedData.achievements,
            last_activity_date: updatedData.lastActivityDate || new Date().toISOString().split('T')[0]
          });
      }
    } catch (error) {
      console.error('Error saving gamification data:', error);
    }
  }
  
  // Load gamification data from database and update localStorage
  async loadGamificationData(userId: string): Promise<GamificationData> {
    if (userId === 'anonymous') {
      return this.getLocalGamificationData(userId);
    }
    
    try {
      const { data, error } = await supabase
        .from('user_gamification')
        .select('*')
        .eq('user_id', userId)
        .single();
        
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      if (data) {
        // Convert database format to service format
        const gamificationData: GamificationData = {
          points: data.points || 0,
          level: data.level || 1,
          streak: data.streak || 0,
          achievements: data.achievements || [],
          lastActivityDate: data.last_activity_date || new Date().toISOString().split('T')[0]
        };
        
        // Update localStorage
        localStorage.setItem(`gamification_${userId}`, JSON.stringify(gamificationData));
        
        return gamificationData;
      }
      
      // If no data in database, use local data
      return this.getLocalGamificationData(userId);
    } catch (error) {
      console.error('Error loading gamification data:', error);
      return this.getLocalGamificationData(userId);
    }
  }
  
  // Get gamification data from localStorage
  getLocalGamificationData(userId: string): GamificationData {
    const defaultData: GamificationData = {
      points: 0,
      level: 1,
      streak: 0,
      achievements: [],
      lastActivityDate: new Date().toISOString().split('T')[0]
    };
    
    try {
      const storedData = localStorage.getItem(`gamification_${userId}`);
      if (storedData) {
        return JSON.parse(storedData);
      }
      return defaultData;
    } catch (error) {
      console.error('Error getting local gamification data:', error);
      return defaultData;
    }
  }
  
  // Add points and handle level ups
  async addPoints(userId: string, points: number): Promise<{ newPoints: number, newLevel: number, leveledUp: boolean }> {
    const data = await this.loadGamificationData(userId);
    const oldLevel = data.level;
    const newPoints = data.points + points;
    
    // Simple level formula: level = 1 + floor(points/100)
    const newLevel = 1 + Math.floor(newPoints / 100);
    const leveledUp = newLevel > oldLevel;
    
    await this.saveGamificationData(userId, {
      points: newPoints,
      level: newLevel
    });
    
    return { newPoints, newLevel, leveledUp };
  }
  
  // Update streak
  async updateStreak(userId: string): Promise<number> {
    const data = await this.loadGamificationData(userId);
    const today = new Date().toISOString().split('T')[0];
    
    // If already updated today, don't update again
    if (data.lastActivityDate === today) {
      return data.streak;
    }
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    let newStreak = 1; // Default to 1 if streak is broken
    
    // If last activity was yesterday, increment streak
    if (data.lastActivityDate === yesterdayStr) {
      newStreak = data.streak + 1;
    }
    
    await this.saveGamificationData(userId, {
      streak: newStreak,
      lastActivityDate: today
    });
    
    return newStreak;
  }
  
  // Unlock or update achievement
  async updateAchievement(
    userId: string, 
    achievementId: string, 
    progress: number, 
    maxProgress: number
  ): Promise<Achievement | null> {
    const data = await this.loadGamificationData(userId);
    const achievements = [...(data.achievements || [])];
    
    // Find existing achievement or create new one
    let achievement = achievements.find(a => a.id === achievementId);
    const isNewlyUnlocked = !achievement?.isUnlocked && progress >= maxProgress;
    
    if (achievement) {
      // Update existing achievement
      achievement.progress = progress;
      if (isNewlyUnlocked) {
        achievement.isUnlocked = true;
        achievement.unlockedAt = new Date().toISOString();
        
        // Award bonus points for unlocking achievement
        await this.addPoints(userId, 50);
      }
    } else {
      // Create new achievement
      achievement = {
        id: achievementId,
        title: achievementId, // This should be replaced with actual title
        description: '', // This should be replaced with actual description
        isUnlocked: progress >= maxProgress,
        progress,
        maxProgress,
        unlockedAt: progress >= maxProgress ? new Date().toISOString() : undefined
      };
      achievements.push(achievement);
    }
    
    await this.saveGamificationData(userId, { achievements });
    
    return achievement;
  }
}

export const gamificationService = GamificationService.getInstance();
export type { GamificationData, Achievement };