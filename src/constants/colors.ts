// Design System Constants for HisabAI
import { useUIStore } from '../store';

export const DarkColors = {
  // ── Backgrounds ──────────────────────────────────────────────────────────
  bg: {
    primary: '#080810',     // deepest background
    secondary: '#0F0F1A',   // slightly lighter
    card: '#13131F',        // card surface
    cardBorder: '#1E1E30',  // card border
    elevated: '#1A1A28',    // elevated elements
    overlay: 'rgba(8, 8, 16, 0.85)',
    modal: '#0F0F1A',
  },

  // ── Accent / Brand ────────────────────────────────────────────────────────
  accent: {
    primary: '#7C3AED',     // violet primary
    primaryLight: '#8B5CF6',
    primaryDim: 'rgba(124, 58, 237, 0.15)',
    secondary: '#06B6D4',   // cyan secondary
    secondaryDim: 'rgba(6, 182, 212, 0.15)',
  },

  // ── Semantic ──────────────────────────────────────────────────────────────
  semantic: {
    income: '#10B981',      // emerald green
    incomeDim: 'rgba(16, 185, 129, 0.15)',
    expense: '#EF4444',     // red
    expenseDim: 'rgba(239, 68, 68, 0.15)',
    warning: '#F59E0B',     // amber
    warningDim: 'rgba(245, 158, 11, 0.15)',
    danger: '#EF4444',
    dangerDim: 'rgba(239, 68, 68, 0.12)',
    safe: '#10B981',
    safeDim: 'rgba(16, 185, 129, 0.15)',
  },

  // ── Text ──────────────────────────────────────────────────────────────────
  text: {
    primary: '#F0F0FF',
    secondary: '#8888AA',
    tertiary: '#555570',
    inverse: '#080810',
    accent: '#A78BFA',
    income: '#10B981',
    expense: '#F87171',
  },

  // ── Border ────────────────────────────────────────────────────────────────
  border: {
    subtle: '#1E1E30',
    medium: '#2A2A42',
    strong: '#3A3A58',
  },

  // ── Category Colors ───────────────────────────────────────────────────────
  category: {
    home: '#10B981',
    transportation: '#EC4899',
    adda: '#84CC16',
    food: '#06B6D4',
    shopping: '#EAB308',
    restaurant: '#F97316',
    entertainment: '#22C55E',
    phone: '#F472B6',
    lend: '#3B82F6',
    gifts: '#EF4444',
    cigarettes: '#9CA3AF',
    electronics: '#6366F1',
    education: '#F97316',
    beauty: '#FB7185',
    sports: '#A855F7',
    social: '#0EA5E9',
    clothing: '#FCD34D',
    car: '#60A5FA',
    alcohol: '#FBBF24',
    travel: '#FDE68A',
    health: '#34D399',
    pets: '#4ADE80',
    repairs: '#FB923C',
    housing: '#2DD4BF',
    donations: '#F87171',
    lottery: '#C084FC',
    snacks: '#FCD34D',
    kids: '#F9A8D4',
    salary: '#10B981',
    freelance: '#3B82F6',
    business: '#6366F1',
    investment: '#06B6D4',
    gift: '#EF4444',
    refund: '#9CA3AF',
    bonus: '#EAB308',
    interest: '#22C55E',
    other: '#A855F7',
  },
};

export const LightColors: typeof DarkColors = {
  // ── Backgrounds ──────────────────────────────────────────────────────────
  bg: {
    primary: '#F8FAFC',     // crisp light slate background
    secondary: '#EDF2F7',   // secondary light surface
    card: '#FFFFFF',        // pure white card surface
    cardBorder: '#E2E8F0',  // soft border
    elevated: '#FFFFFF',    // elevated elements
    overlay: 'rgba(15, 23, 42, 0.6)',
    modal: '#FFFFFF',
  },

  // ── Accent / Brand ────────────────────────────────────────────────────────
  accent: {
    primary: '#7C3AED',     // violet primary
    primaryLight: '#8B5CF6',
    primaryDim: 'rgba(124, 58, 237, 0.12)',
    secondary: '#0284C7',   // cyan secondary
    secondaryDim: 'rgba(2, 132, 199, 0.12)',
  },

  // ── Semantic ──────────────────────────────────────────────────────────────
  semantic: {
    income: '#059669',      // emerald green
    incomeDim: 'rgba(5, 150, 105, 0.12)',
    expense: '#DC2626',     // red
    expenseDim: 'rgba(220, 38, 38, 0.12)',
    warning: '#D97706',     // amber
    warningDim: 'rgba(217, 119, 6, 0.12)',
    danger: '#DC2626',
    dangerDim: 'rgba(220, 38, 38, 0.12)',
    safe: '#059669',
    safeDim: 'rgba(5, 150, 105, 0.12)',
  },

  // ── Text ──────────────────────────────────────────────────────────────────
  text: {
    primary: '#0F172A',     // deep slate text
    secondary: '#475569',   // slate secondary text
    tertiary: '#94A3B8',    // slate muted text
    inverse: '#FFFFFF',     // white inverse text
    accent: '#6D28D9',
    income: '#059669',
    expense: '#DC2626',
  },

  // ── Border ────────────────────────────────────────────────────────────────
  border: {
    subtle: '#E2E8F0',
    medium: '#CBD5E1',
    strong: '#94A3B8',
  },

  // ── Category Colors ───────────────────────────────────────────────────────
  category: DarkColors.category,
};

export function getThemeColors(theme: 'dark' | 'light' = 'dark'): typeof DarkColors {
  return theme === 'light' ? LightColors : DarkColors;
}

export function useThemeColors(): typeof DarkColors {
  const theme = useUIStore((s) => s.theme);
  return getThemeColors(theme);
}

export const Colors = new Proxy(DarkColors, {
  get(target, prop: string) {
    try {
      const state = useUIStore?.getState ? useUIStore.getState() : null;
      const theme = state?.theme || 'dark';
      const activeColors = getThemeColors(theme);
      return (activeColors as any)[prop] ?? (target as any)[prop];
    } catch {
      return (target as any)[prop];
    }
  }
}) as typeof DarkColors;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  section: 40,
} as const;

export const Radii = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
} as const;

export const Typography = {
  sizes: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    xxl: 30,
    xxxl: 38,
    hero: 48,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
  families: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
    extrabold: 'Inter_800ExtraBold',
  },
} as const;

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  accent: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;

export const TAB_BAR_HEIGHT = 72;
export const HEADER_HEIGHT = 60;
