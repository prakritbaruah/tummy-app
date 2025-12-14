import { MD3LightTheme, type MD3Theme } from 'react-native-paper';
import {
  DefaultTheme as NavigationDefaultTheme,
  type Theme as NavigationTheme,
} from '@react-navigation/native';

const primaryFont = 'NunitoRegular';
const primaryFontSemiBold = 'NunitoSemiBold';
const primaryFontBold = 'NunitoBold';
const accentFont = 'LeagueSpartanBold';

export const palette = {
  background: '#fffcf7',
  surface: '#ffffff',
  heading: '#484274',
  text: '#343133',
  muted: '#6f697e',
  primary: '#9995d8', // pastel purple
  secondary: '#eca7dd', // pastel pink
  border: '#e6dfd4',
  trackInactive: '#d8d1c5',
  infoBackground: '#f4efff',
  white: '#ffffff',
} as const;

const paperFonts = {
  ...MD3LightTheme.fonts,
  displayLarge: { ...MD3LightTheme.fonts.displayLarge, fontFamily: accentFont },
  displayMedium: { ...MD3LightTheme.fonts.displayMedium, fontFamily: accentFont },
  displaySmall: { ...MD3LightTheme.fonts.displaySmall, fontFamily: accentFont },
  headlineLarge: { ...MD3LightTheme.fonts.headlineLarge, fontFamily: primaryFontBold },
  headlineMedium: { ...MD3LightTheme.fonts.headlineMedium, fontFamily: primaryFontBold },
  headlineSmall: { ...MD3LightTheme.fonts.headlineSmall, fontFamily: primaryFontBold },
  titleLarge: { ...MD3LightTheme.fonts.titleLarge, fontFamily: primaryFontSemiBold },
  titleMedium: { ...MD3LightTheme.fonts.titleMedium, fontFamily: primaryFontSemiBold },
  titleSmall: { ...MD3LightTheme.fonts.titleSmall, fontFamily: primaryFontSemiBold },
  labelLarge: { ...MD3LightTheme.fonts.labelLarge, fontFamily: primaryFontSemiBold },
  labelMedium: { ...MD3LightTheme.fonts.labelMedium, fontFamily: primaryFontSemiBold },
  labelSmall: { ...MD3LightTheme.fonts.labelSmall, fontFamily: primaryFontSemiBold },
  bodyLarge: { ...MD3LightTheme.fonts.bodyLarge, fontFamily: primaryFont },
  bodyMedium: { ...MD3LightTheme.fonts.bodyMedium, fontFamily: primaryFont },
  bodySmall: { ...MD3LightTheme.fonts.bodySmall, fontFamily: primaryFont },
} satisfies typeof MD3LightTheme.fonts;

export const theme = {
  colors: {
    background: palette.background,
    surface: palette.surface,
    card: palette.surface,
    primary: palette.primary,
    primaryStrong: palette.heading,
    text: palette.text,
    textHeading: palette.heading,
    textSecondary: palette.muted,
    infoBackground: palette.infoBackground,
    white: palette.white,
    border: palette.border,
    trackInactive: palette.trackInactive,
    highlight: palette.secondary,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  fonts: {
    body: primaryFont,
    bodyBold: primaryFontBold,
    accent: accentFont,
  },
} as const;

export const paperTheme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: palette.primary,
    secondary: palette.secondary,
    background: palette.background,
    surface: palette.surface,
    surfaceDisabled: '#f1ecf3',
    onSurface: palette.text,
    onSurfaceVariant: palette.heading,
    onPrimary: palette.white,
    onSecondary: palette.heading,
    outline: palette.border,
    outlineVariant: palette.trackInactive,
    elevation: { ...MD3LightTheme.colors.elevation },
  },
  fonts: paperFonts,
};

export const navigationTheme: NavigationTheme = {
  ...NavigationDefaultTheme,
  colors: {
    ...NavigationDefaultTheme.colors,
    primary: palette.primary,
    background: palette.background,
    card: palette.surface,
    text: palette.text,
    border: palette.border,
    notification: palette.secondary,
  },
};

export type Theme = typeof theme;