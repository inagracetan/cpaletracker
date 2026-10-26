import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppStateData, SyncStatus } from '../../types';

export class SupabaseService {
  private static client: SupabaseClient | null = null;
  private static isConfigured = false;

  public static initialize(supabaseUrl?: string, supabaseAnonKey?: string): boolean {
    const url = supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL;
    const key = supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    if (url && key && url.startsWith('http')) {
      try {
        this.client = createClient(url, key, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
          }
        });
        this.isConfigured = true;
        return true;
      } catch (e) {
        console.warn('Supabase initialization error:', e);
      }
    }
    this.isConfigured = false;
    return false;
  }

  public static isCloudSyncConfigured(): boolean {
    return this.isConfigured && this.client !== null;
  }

  public static async syncUserData(state: AppStateData): Promise<{ status: SyncStatus; message?: string }> {
    if (!this.client || !this.isConfigured) {
      return { status: 'Saved on this device', message: 'Cloud sync is optional and not currently connected.' };
    }

    try {
      const { data: authData } = await this.client.auth.getUser();
      if (!authData?.user) {
        return { status: 'Saved on this device', message: 'Log in to sync your review progress across devices.' };
      }

      const userId = authData.user.id;
      const payload = {
        user_id: userId,
        updated_at: new Date().toISOString(),
        profile: state.userProfile,
        exam_plan: state.examPlan,
        weekly_schedule: state.weeklySchedule,
        work_period: state.workPeriod,
        rest_days: state.restDays,
        study_materials: state.studyMaterials,
        topics: state.topics,
        sessions: state.sessions,
        deadlines: state.deadlines,
        practice_attempts: state.practiceAttempts,
        preferences: state.preferences,
      };

      const { error } = await this.client
        .from('cpale_user_plans')
        .upsert(payload, { onConflict: 'user_id' });

      if (error) {
        return { status: 'Sync error', message: error.message };
      }

      return { status: 'Synced', message: 'Changes synchronized to Supabase Cloud.' };
    } catch (e: any) {
      return { status: 'Sync error', message: e?.message || 'Network error during synchronization.' };
    }
  }

  public static async pullCloudData(): Promise<Partial<AppStateData> | null> {
    if (!this.client || !this.isConfigured) return null;

    try {
      const { data: authData } = await this.client.auth.getUser();
      if (!authData?.user) return null;

      const { data, error } = await this.client
        .from('cpale_user_plans')
        .select('*')
        .eq('user_id', authData.user.id)
        .single();

      if (error || !data) return null;

      return {
        userProfile: data.profile,
        examPlan: data.exam_plan,
        weeklySchedule: data.weekly_schedule,
        workPeriod: data.work_period,
        restDays: data.rest_days,
        studyMaterials: data.study_materials,
        topics: data.topics,
        sessions: data.sessions,
        deadlines: data.deadlines,
        practiceAttempts: data.practice_attempts,
        preferences: data.preferences,
      };
    } catch (e) {
      console.warn('Error pulling cloud data:', e);
      return null;
    }
  }
}
