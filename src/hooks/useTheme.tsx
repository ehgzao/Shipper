import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Theme = "light" | "dark" | "system";

export const useTheme = () => {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("theme") as Theme;
      if (stored) return stored;
    }
    return "system";
  });

  const getEffectiveTheme = useCallback((t: Theme): "light" | "dark" => {
    if (t === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return t;
  }, []);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    const effectiveTheme = getEffectiveTheme(theme);
    
    if (effectiveTheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme, getEffectiveTheme]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== "system") return;
    
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const root = document.documentElement;
      if (mediaQuery.matches) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    };
    
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [theme]);

  // Load theme from database on mount
  useEffect(() => {
    const loadTheme = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from("profiles")
        .select("theme_preference")
        .eq("id", user.id)
        .maybeSingle();
      
      if (data?.theme_preference) {
        setThemeState(data.theme_preference as Theme);
      }
    };
    
    loadTheme();
  }, [user]);

  const setTheme = useCallback(async (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("theme", newTheme);
    
    if (user) {
      await supabase
        .from("profiles")
        .update({ theme_preference: newTheme })
        .eq("id", user.id);
    }
  }, [user]);

  const toggleTheme = useCallback(() => {
    const effectiveTheme = getEffectiveTheme(theme);
    const newTheme: Theme = effectiveTheme === "dark" ? "light" : "dark";
    setTheme(newTheme);
  }, [theme, setTheme, getEffectiveTheme]);

  return { 
    theme, 
    setTheme, 
    toggleTheme, 
    effectiveTheme: getEffectiveTheme(theme) 
  };
};
