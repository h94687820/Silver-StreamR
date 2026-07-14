import { createContext, useContext, useEffect, useState } from "react";
import { useGetSettings, useUpdateSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { I18nContext, type Lang } from "@/lib/i18n";

type ThemeMode = "auto" | "light" | "dark";

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  accent: string;
  setAccent: (accent: string) => void;
  language: Lang;
  setLanguage: (lang: Lang) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { data: settings } = useGetSettings({
    query: {
      queryKey: getGetSettingsQueryKey(),
      staleTime: Infinity,
    }
  });
  
  const updateSettings = useUpdateSettings();

  const [mode, setModeState] = useState<ThemeMode>("auto");
  const [accent, setAccentState] = useState<string>("blue");
  const [language, setLanguageState] = useState<Lang>("ar");

  useEffect(() => {
    if (settings) {
      setModeState(settings.theme as ThemeMode || "auto");
      setAccentState(settings.accentColor || "blue");
      setLanguageState(settings.language as Lang || "ar");
    }
  }, [settings]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.setAttribute("dir", language === "ar" ? "rtl" : "ltr");
    root.setAttribute("lang", language);
    root.setAttribute("data-accent", accent);

    const applyMode = () => {
      root.classList.remove("light", "dark");
      if (mode === "auto") {
        const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
        root.classList.add(systemTheme);
      } else {
        root.classList.add(mode);
      }
    };

    applyMode();

    if (mode === "auto") {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      media.addEventListener("change", applyMode);
      return () => media.removeEventListener("change", applyMode);
    }

    return undefined;
  }, [mode, accent, language]);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    if (settings) updateSettings.mutate({ data: { theme: newMode as any } });
  };

  const setAccent = (newAccent: string) => {
    setAccentState(newAccent);
    if (settings) updateSettings.mutate({ data: { accentColor: newAccent as any } });
  };

  const setLanguage = (newLang: Lang) => {
    setLanguageState(newLang);
    if (settings) updateSettings.mutate({ data: { language: newLang as any } });
  };

  return (
    <ThemeContext.Provider value={{ mode, setMode, accent, setAccent, language, setLanguage }}>
      <I18nContext.Provider value={language}>
        {children}
      </I18nContext.Provider>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
