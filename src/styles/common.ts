import { StyleSheet } from 'react-native';
import { theme } from './theme';

export const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
  },
  title: {
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  card: {
    marginBottom: theme.spacing.md,
  },
} as const); 