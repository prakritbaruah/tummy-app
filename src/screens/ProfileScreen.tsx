import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, TextInput, Button, IconButton, HelperText, ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts';
import { theme, paperTheme } from '../styles';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { user, displayName, updateDisplayName, signOut } = useAuth();
  const [name, setName] = useState(displayName ?? '');
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(displayName ?? '');
  }, [displayName]);

  // TODO: stop using hacks, move functions over to lib utils
  const initials = useMemo(() => {
    if (name?.trim()) {
      return name.trim().charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return '?';
  }, [name, user?.email]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name cannot be empty');
      return;
    }

    setError(null);
    setSaving(true);
    try {
      await updateDisplayName(name.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save name');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    setError(null);
    setSigningOut(true);
    try {
      await signOut();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign out');
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            <Text variant="titleLarge" style={styles.avatarText}>
              {initials}
            </Text>
          </View>
          <View style={styles.headerText}>
            <Text variant="headlineSmall" style={styles.title}>Profile</Text>
            <Text variant="bodyMedium" style={styles.subtitle}>Manage your account</Text>
          </View>
        </View>
        <IconButton
          icon="close"
          size={24}
          iconColor={paperTheme.colors.onSurface}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Close profile"
        />
      </View>

      <View style={styles.form}>
        <TextInput
          label="Name"
          mode="outlined"
          value={name}
          onChangeText={setName}
          style={[styles.input, styles.fieldSpacing]}
          autoCapitalize="words"
          disabled={saving || signingOut}
        />
        <TextInput
          label="Email"
          mode="outlined"
          value={user?.email ?? ''}
          style={[styles.input, styles.fieldSpacing]}
          editable={false}
          disabled
        />
        {error && (
          <HelperText type="error" visible style={styles.errorText}>
            {error}
          </HelperText>
        )}
        <Button
          mode="contained"
          onPress={handleSave}
          disabled={saving || signingOut || !name.trim()}
          loading={saving}
          style={styles.saveButton}
        >
          Save changes
        </Button>
      </View>

      <View style={styles.footer}>
        <Button
          mode="outlined"
          textColor={paperTheme.colors.error}
          onPress={handleSignOut}
          disabled={saving || signingOut}
          loading={signingOut}
          icon="logout"
        >
          Sign out
        </Button>
      </View>

      {signingOut && (
        <View style={styles.overlay}>
          <ActivityIndicator animating />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xl,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: theme.spacing.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.highlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { 
    color: theme.colors.white,
    fontFamily: theme.fonts.bodyBold,
  },
  title: {
    color: theme.colors.textHeading,
  },
  subtitle: {
    color: theme.colors.textSecondary,
  },
  form: {
    marginBottom: theme.spacing.lg,
  },
  input: {
    backgroundColor: theme.colors.white,
  },
  fieldSpacing: {
    marginBottom: theme.spacing.md,
  },
  errorText: {
    marginTop: -theme.spacing.sm,
  },
  saveButton: {
    marginTop: theme.spacing.sm,
  },
  footer: {
    marginTop: 'auto',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
});


