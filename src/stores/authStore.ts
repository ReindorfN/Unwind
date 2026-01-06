import { create } from 'zustand';
import { supabase, type Profile } from '../lib/supabase';

interface AuthState {
  user: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  loadUser: () => Promise<void>;
  saveUserGamificationData: (data: any) => Promise<void>;
  loadUserGamificationData: () => Promise<any>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        *,
        therapist:therapists(verified)
        `)
      .eq('id', data.user.id)
      .maybeSingle();
      
    if (profileError) {
      console.error('Error loading profile during sign in:', profileError);
      throw new Error('Error loading user profile. Please try again.');
    }
    
    if (!profile) {
      // Create profile if it doesn't exist
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          full_name: data.user.user_metadata?.full_name || '',
          email: data.user.email || '',
          role: data.user.user_metadata?.role || 'user'
        })
        .select(`
          *,
          therapist:therapists(verified)
        `)
        .single();
        
      if (createError) {
        console.error('Error creating profile during sign in:', createError);
        throw new Error('Error creating user profile. Please contact support.');
      }
      
      set({ user: newProfile });
      if (newProfile) {
        localStorage.setItem('current_user_id', newProfile.id);
      }
      return;
    }
    
    // Check if therapist is verified
    if (profile.role === 'therapist') {
      const isVerified = profile.therapist?.verified;
      if (!isVerified) {
        // Sign out the user immediately
        await supabase.auth.signOut();
        throw new Error('Your therapist account is pending verification. You will be notified via email once your credentials have been reviewed and approved.');
      }
    }
      
    set({ user: profile });
    
    // Store current user ID for user-specific localStorage
    localStorage.setItem('current_user_id', profile.id);
  },
  
  signUp: async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin + '/login',
        data: {
          full_name: fullName,
          role: 'user' // Explicitly set role in metadata
        },
      },
    });
    
    if (error) throw error;
    
    // Profile creation is handled automatically by database trigger
    // No need to manually create profile here
  },
  
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    set({ user: null });
    localStorage.removeItem('current_user_id');
    // Redirect to index page after sign out
    window.location.href = '/login';
  },
  
  loadUser: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        set({ user: null, loading: false });
        localStorage.removeItem('current_user_id');
        return;
      }
      
      // Get profile data
      const { data: profile, error } = await supabase
        .from('profiles')
        .select(`
          *,
          therapist:therapists(*)
        `)
        .eq('id', session.user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading profile:', error);
        set({ user: null, loading: false });
        localStorage.removeItem('current_user_id');
        return;
      }
      
      // If no profile found, rely on database trigger to create it
      if (!profile) {
        // Profile not found - this might be a timing issue where the database trigger
        // hasn't created the profile yet. Set user to null and let the trigger handle it.
        console.warn('Profile not found for authenticated user. Database trigger should create it.');
        set({ user: null, loading: false });
        localStorage.removeItem('current_user_id');
        return;
      }

      // If user is a therapist, check if they're verified
      if (profile.role === 'therapist' && profile.therapist) {
        // If not verified, check if they have a pending application
        if (!profile.therapist.verified) {
          const { data: application } = await supabase
            .from('therapist_applications')
            .select('application_status')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          // If application is approved but therapist record not updated, update it
          if (application?.application_status === 'approved') {
            await supabase
              .from('therapists')
              .update({ verified: true })
              .eq('id', session.user.id);
              
            // Update the profile object
            if (profile.therapist) {
              profile.therapist.verified = true;
            }
          }
        }
      }
        
      set({ user: profile, loading: false });
      
      // Store current user ID for user-specific localStorage
      if (profile) {
        localStorage.setItem('current_user_id', profile.id);
      }
    } catch (error) {
      console.error('Error loading user:', error);
      set({ user: null, loading: false });
      localStorage.removeItem('current_user_id');
    }
  },

  saveUserGamificationData: async (data: any) => {
    const { user } = get();
    if (!user) return;

    try {
      // Save to database
      const { error } = await supabase
        .from('user_gamification')
        .upsert({
          user_id: user.id,
          points: data.points,
          level: data.level,
          streak: data.streak,
          achievements: data.achievements,
          last_activity_date: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving gamification data:', error);
    }
  },

  loadUserGamificationData: async () => {
    const { user } = get();
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('user_gamification')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return data;
    } catch (error) {
      console.error('Error loading gamification data:', error);
      return null;
    }
  },
}));