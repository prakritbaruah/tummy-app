import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Card } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { theme } from '../styles';

interface EmailConfirmationRouteParams {
  email: string;
}

export default function EmailConfirmationScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { email } = (route.params as EmailConfirmationRouteParams) || { email: '' };

  const navigateToLogin = () => {
    (navigation as any).navigate('Login');
  };

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>✉️</Text>
        </View>

        <Text variant="headlineLarge" style={styles.title}>
          Check Your Email
        </Text>

        <Text variant="bodyLarge" style={styles.subtitle}>
          We've sent a confirmation link to
        </Text>

        {email && (
          <Text variant="titleMedium" style={styles.email}>
            {email}
          </Text>
        )}

        <Card style={styles.infoCard}>
          <Card.Content>
            <Text variant="bodyMedium" style={styles.infoText}>
              Please check your email and click the confirmation link to activate your account.
            </Text>
            <Text variant="bodySmall" style={styles.infoSubtext}>
              After confirming, you can sign in to your account.
            </Text>
          </Card.Content>
        </Card>

        <View style={styles.helpContainer}>
          <Text variant="bodySmall" style={styles.helpText}>
            Didn't receive the email? Check your spam folder or try signing up again.
          </Text>
        </View>

        <Button
          mode="contained"
          onPress={navigateToLogin}
          style={styles.button}
        >
          Go to Sign In
        </Button>

        <Button
          mode="text"
          onPress={() => (navigation as any).navigate('SignUp')}
          style={styles.backButton}
        >
          Back to Sign Up
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  icon: {
    fontSize: 64,
  },
  title: {
    textAlign: 'center',
    marginBottom: theme.spacing.md,
    color: theme.colors.textHeading,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
    color: theme.colors.textSecondary,
  },
  email: {
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  infoCard: {
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.infoBackground,
  },
  infoText: {
    marginBottom: theme.spacing.sm,
    color: theme.colors.text,
  },
  infoSubtext: {
    color: theme.colors.textSecondary,
  },
  helpContainer: {
    marginBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.md,
  },
  helpText: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  button: {
    marginBottom: theme.spacing.md,
  },
  backButton: {
    marginTop: theme.spacing.sm,
  },
});
