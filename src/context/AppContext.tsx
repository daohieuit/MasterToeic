'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/utils/supabase';

type Theme = 'light' | 'dark';
type Language = 'en' | 'vi';

interface AppContextType {
  theme: Theme;
  toggleTheme: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  adminApiKey: string;
  setAdminApiKey: (key: string) => void;
  adminBaseUrl: string;
  setAdminBaseUrl: (url: string) => void;
  // Supabase Auth and Sync variables
  user: any;
  isAdmin: boolean;
  isDbConfigured: boolean;
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');
  const [language, setLanguage] = useState<Language>('vi');
  const [adminApiKey, setAdminApiKeyState] = useState<string>('');
  const [adminBaseUrl, setAdminBaseUrlState] = useState<string>('http://localhost:8081/v1');
  
  // Auth state
  const [user, setUser] = useState<any>(null);
  const isDbConfigured = isSupabaseConfigured();
  const isAdmin = user?.user_metadata?.role === 'admin';

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme;
    const savedLang = localStorage.getItem('language') as Language;
    const savedApiKey = localStorage.getItem('admin_api_key') || '';
    const savedBaseUrl = localStorage.getItem('admin_base_url') || 'http://localhost:8081/v1';

    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
    }

    if (savedLang) setLanguage(savedLang);
    if (savedApiKey) setAdminApiKeyState(savedApiKey);
    if (savedBaseUrl) setAdminBaseUrlState(savedBaseUrl);

    // Initialize Supabase Auth
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  // Sync admin config from Supabase database when user changes
  useEffect(() => {
    const syncConfigFromDb = async () => {
      if (user && supabase) {
        try {
          const { data, error } = await supabase
            .from('admin_config')
            .select('*');
          
          if (!error && data) {
            const apiKeyItem = data.find((item: any) => item.key === 'gemini_api_key');
            const baseUrlItem = data.find((item: any) => item.key === 'gemini_base_url');
            
            if (apiKeyItem) {
              setAdminApiKeyState(apiKeyItem.value);
              localStorage.setItem('admin_api_key', apiKeyItem.value);
            }
            if (baseUrlItem) {
              setAdminBaseUrlState(baseUrlItem.value);
              localStorage.setItem('admin_base_url', baseUrlItem.value);
            }
          }
        } catch (e) {
          console.error('Failed to sync admin config from database:', e);
        }
      }
    };

    syncConfigFromDb();
  }, [user]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('language', lang);
  };

  const setAdminApiKey = async (key: string) => {
    setAdminApiKeyState(key);
    localStorage.setItem('admin_api_key', key);

    // Sync to Supabase if logged in as admin
    if (user?.user_metadata?.role === 'admin' && supabase) {
      try {
        await supabase
          .from('admin_config')
          .upsert({ key: 'gemini_api_key', value: key });
      } catch (e) {
        console.error('Failed to sync API key to Supabase:', e);
      }
    }
  };

  const setAdminBaseUrl = async (url: string) => {
    setAdminBaseUrlState(url);
    localStorage.setItem('admin_base_url', url);

    // Sync to Supabase if logged in as admin
    if (user?.user_metadata?.role === 'admin' && supabase) {
      try {
        await supabase
          .from('admin_config')
          .upsert({ key: 'gemini_base_url', value: url });
      } catch (e) {
        console.error('Failed to sync Base URL to Supabase:', e);
      }
    }
  };

  const logout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
      setUser(null);
    }
  };

  return (
    <AppContext.Provider
      value={{
        theme,
        toggleTheme,
        language,
        setLanguage: handleSetLanguage,
        adminApiKey,
        setAdminApiKey,
        adminBaseUrl,
        setAdminBaseUrl,
        user,
        isAdmin,
        isDbConfigured,
        logout
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
