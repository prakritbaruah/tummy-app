import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { authService } from '../../services/authService';

interface EmailVerificationScreenProps {
  email: string;
  onBackToLogin: () => void;
}

export const EmailVerificationScreen: React.FC<EmailVerificationScreenProps> = ({ 
  email, 
  onBackToLogin 
}) => {
  const [isResending, setIsResending] = useState(false);

  const handleResendConfirmation = async () => {
    setIsResending(true);
    try {
      const { error } = await authService.resendConfirmation(email);
      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert(
          'Email Sent', 
          'We\'ve sent you another confirmation email. Please check your inbox and spam folder.'
        );
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to resend confirmation email. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>📧</Text>
        
        <Text style={styles.title}>Check Your Email</Text>
        
        <Text style={styles.subtitle}>
          We've sent a confirmation email to:
        </Text>
        
        <Text style={styles.email}>{email}</Text>
        
        <Text style={styles.message}>
          Click the link in the email to verify your account. 
          If you don't see the email, check your spam folder.
        </Text>

        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.resendButton, isResending && styles.buttonDisabled]}
            onPress={handleResendConfirmation}
            disabled={isResending}
          >
            {isResending ? (
              <ActivityIndicator color="#007AFF" size="small" />
            ) : (
              <Text style={styles.resendText}>Resend Email</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={onBackToLogin}
          >
            <Text style={styles.backText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.helpSection}>
          <Text style={styles.helpTitle}>Having trouble?</Text>
          <Text style={styles.helpText}>
            • Check your spam/junk folder{'\n'}
            • Make sure {email} is correct{'\n'}
            • Try resending the confirmation email{'\n'}
            • Contact support if issues persist
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  icon: {
    fontSize: 64,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  email: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    textAlign: 'center',
    marginBottom: 24,
  },
  message: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  actionContainer: {
    width: '100%',
    marginBottom: 32,
  },
  resendButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
    minHeight: 48,
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  resendText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  backText: {
    color: '#666',
    fontSize: 14,
  },
  helpSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
    textAlign: 'left',
  },
}); 