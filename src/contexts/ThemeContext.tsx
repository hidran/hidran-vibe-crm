/*
 * ThemeContext - Theme and color palette management for the application
 *
 * This context manages both dark/light theme mode and color palette selection,
 * providing a complete theming solution with persistence. The theme system
 * uses CSS variables that are dynamically applied to the document root.
 *
 * THEME MODES:
 * - light: Light mode with light backgrounds
 * - dark: Dark mode with dark backgrounds
 *
 * COLOR PALETTES:
 * - verdant: Green theme (default)
 * - ocean: Blue theme
 * - sunset: Orange theme
 * - purple: Purple theme
 * - rose: Pink theme
 * - custom: User-defined color (HSL format)
 *
 * PERSISTENCE:
 * All theme settings are stored in localStorage and restored on mount:
 * - theme: "light" | "dark"
 * - palette: One of the ColorPalette options
 * - customColor: HSL string (e.g., "161 93% 30%")
 *
 * INITIALIZATION:
 * - Theme: Checks localStorage → system preference → defaults to "light"
 * - Palette: Checks localStorage → defaults to "verdant"
 * - Custom Color: Checks localStorage → defaults to "161 93% 30%" (teal)
 *
 * CSS VARIABLES:
 * The theme system modifies document.documentElement:
 * - Adds/removes "light" or "dark" class
 * - Sets data-palette attribute
 * - For custom palette, sets CSS variables: --primary, --ring, --sidebar-primary, --sidebar-ring
 *
 * INVARIANTS:
 * - Theme is always either "light" or "dark" (never null/undefined)
 * - Palette is always one of the defined ColorPalette values
 * - Custom color is always in HSL format (space-separated: "H S% L%")
 * - Changes are immediately persisted to localStorage
 * - CSS is applied via useEffect after state updates
 *
 * USAGE:
 *   const { theme, setTheme, palette, setPalette } = useTheme();
 *   setTheme("dark");
 *   setPalette("ocean");
 */

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type ColorPalette = "verdant" | "ocean" | "sunset" | "purple" | "rose" | "custom";

export interface ThemeContextType {
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
  palette: ColorPalette;
  setPalette: (palette: ColorPalette) => void;
  customColor: string;         // HSL format: "H S% L%"
  setCustomColor: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/*
 * useTheme - Hook to access theme context
 *
 * Must be used within a ThemeProvider. Throws error if used outside
 * the provider hierarchy to catch configuration mistakes early.
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  /*
   * Theme state initialization
   *
   * PRIORITY:
   * 1. localStorage value (if "light" or "dark")
   * 2. System preference (prefers-color-scheme media query)
   * 3. Default to "light"
   *
   * NOTE: Only runs on client (typeof window !== "undefined" check)
   */
  const [theme, setThemeState] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("theme");
      if (stored === "light" || stored === "dark") return stored;
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "light";
  });

  /*
   * Color palette state initialization
   *
   * Loads from localStorage or defaults to "verdant" (green theme)
   */
  const [palette, setPaletteState] = useState<ColorPalette>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("palette") as ColorPalette;
      if (stored) return stored;
    }
    return "verdant";
  });

  /*
   * Custom color state initialization
   *
   * HSL format (space-separated): "H S% L%"
   * Default: "161 93% 30%" (teal color)
   */
  const [customColor, setCustomColorState] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("customColor") || "161 93% 30%";
    }
    return "161 93% 30%";
  });

  /*
   * Update theme and persist to localStorage
   *
   * SIDE EFFECT: useEffect below will apply the theme class to DOM
   */
  const setTheme = (newTheme: "light" | "dark") => {
    setThemeState(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  /*
   * Update palette and persist to localStorage
   *
   * SIDE EFFECT: useEffect below will apply palette attribute and CSS variables
   */
  const setPalette = (newPalette: ColorPalette) => {
    setPaletteState(newPalette);
    localStorage.setItem("palette", newPalette);
  };

  /*
   * Update custom color and persist to localStorage
   *
   * SIDE EFFECT: useEffect below will apply custom color if palette is "custom"
   */
  const setCustomColor = (color: string) => {
    setCustomColorState(color);
    localStorage.setItem("customColor", color);
  };

  /*
   * Apply theme class to document root
   *
   * BEHAVIOR:
   * - Removes both "light" and "dark" classes
   * - Adds the current theme class
   * - Runs on mount and whenever theme changes
   *
   * This allows CSS rules like `.dark .some-class` to work
   */
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
  }, [theme]);

  /*
   * Apply color palette to document root
   *
   * BEHAVIOR:
   * - Sets data-palette attribute for CSS selectors
   * - For "custom" palette: Sets CSS variables for primary colors
   * - For preset palettes: Removes CSS variables (uses CSS defaults)
   *
   * CSS VARIABLES SET (custom palette only):
   * - --primary: Main brand color
   * - --ring: Focus ring color
   * - --sidebar-primary: Sidebar brand color
   * - --sidebar-ring: Sidebar focus ring color
   *
   * All values use the customColor HSL string
   */
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-palette", palette);

    if (palette === "custom") {
      /* Apply custom color to primary CSS variables */
      root.style.setProperty("--primary", customColor);
      root.style.setProperty("--ring", customColor);
      root.style.setProperty("--sidebar-primary", customColor);
      root.style.setProperty("--sidebar-ring", customColor);
    } else {
      /* Remove custom properties to use CSS defaults for preset palettes */
      root.style.removeProperty("--primary");
      root.style.removeProperty("--ring");
      root.style.removeProperty("--sidebar-primary");
      root.style.removeProperty("--sidebar-ring");
    }
  }, [palette, customColor]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        palette,
        setPalette,
        customColor,
        setCustomColor,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
