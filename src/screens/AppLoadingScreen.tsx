import React from 'react';
import { View, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { theme } from '@/styles';

export default function AppLoadingScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Image 
          source={require('../../assets/icon.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        <Text variant="displayLarge" style={styles.title}>
          tummy
        </Text>
      </View>
      <ActivityIndicator 
        size="small" 
        color={theme.colors.primary} 
        style={styles.loader}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: theme.spacing.lg,
  },
  title: {
    color: theme.colors.primaryStrong,
    fontFamily: theme.fonts.bodyBold,
  },
  loader: {
    position: 'absolute',
    bottom: theme.spacing.xl * 3,
  },
});

