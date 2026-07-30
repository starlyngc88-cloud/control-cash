import { createClient } from "@supabase/supabase-js"
import * as SecureStore from "expo-secure-store"
import { Platform } from "react-native"

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? ""
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ""
const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (!supabaseConfigured) {
  console.error("[KellyCash][Supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY.")
}

const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    try {
      return await SecureStore.getItemAsync(key)
    } catch (error) {
      console.error("[KellyCash][Supabase] SecureStore getItem failed", { key, error })
      return null
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await SecureStore.setItemAsync(key, value)
    } catch (error) {
      console.error("[KellyCash][Supabase] SecureStore setItem failed", { key, error })
    }
  },
  removeItem: async (key: string) => {
    try {
      await SecureStore.deleteItemAsync(key)
    } catch (error) {
      console.error("[KellyCash][Supabase] SecureStore removeItem failed", { key, error })
    }
  },
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage:
      Platform.OS === "web"
        ? typeof window !== "undefined"
          ? window.localStorage
          : undefined
        : ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

export function assertSupabaseConfigured() {
  if (!supabaseConfigured) {
    throw new Error("Supabase env is not configured for mobile. Define EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.")
  }
}
