/**
 * Database types.
 *
 * ⚠️ PLACEHOLDER — replace with generated types once the migrations are live:
 *
 *     npx supabase gen types typescript \
 *       --project-id loklokibqsazuswrcffw > src/lib/types/database.ts
 *
 * Hand-writing these permanently is a losing game: they drift from the schema
 * silently, and a drifted type is worse than no type because it tells you a
 * column exists when it does not. This file covers only what Week 1 touches.
 */

export type AccountType = "entertainer" | "venue";
export type UserRole = "user" | "admin";
export type AccountStatus = "active" | "suspended" | "deleted";

export type Profile = {
  id: string;
  account_type: AccountType;
  role: UserRole;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  location_lat: number | null;
  location_lng: number | null;
  location_text: string | null;
  onboarding_complete: boolean;
  status: AccountStatus;
  created_at: string;
  updated_at: string;
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & Pick<Profile, "id" | "account_type" | "full_name" | "email">;
        Update: Partial<Profile>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      account_type: AccountType;
      user_role: UserRole;
      account_status: AccountStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
