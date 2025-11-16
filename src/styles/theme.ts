export const theme = {
  colors: {
    background: '#f5f5f5',
    primary: '#1976d2',
    text: '#1a1a1a',
    textSecondary: '#666666',
    infoBackground: '#e3f2fd',
    // Additional colors found in the codebase
    white: '#ffffff',
    textTertiary: '#333',
    borderLight: '#f0f0f0',
    trackInactive: '#e0e0e0',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
} as const;

export type Theme = typeof theme; 