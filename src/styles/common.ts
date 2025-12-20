import { StyleSheet } from 'react-native';
import { theme } from '@/styles/theme';

export const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
  },
  title: {
    marginBottom: theme.spacing.md,
    textAlign: 'center',
    color: theme.colors.textHeading,
  },
  card: {
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
} as const); 