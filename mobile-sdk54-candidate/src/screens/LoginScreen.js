import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import { parseApiError } from '../api/parseApiError';
import { colors, radius, shadow, spacing, typography } from '../theme';
import { BrandMark, Screen } from '../components/UI';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!email || !password) {
      setError('Enter your email and password.');
      return;
    }
    setIsSubmitting(true);
    try {
      await login({ email: email.trim().toLowerCase(), password });
    } catch (err) {
      setError(parseApiError(err, 'Login failed. Check your connection and try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <View style={styles.brand}>
        <BrandMark size={70}/>
        <Text style={styles.title}>Urban Sentinel</Text>
        <Text style={styles.subtitle}>Sign in to receive emergency alerts</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={isSubmitting} activeOpacity={0.85}>
          {isSubmitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Log In</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.linkWrap}>
          <Text style={styles.link}>
            Don't have an account? <Text style={styles.linkStrong}>Register</Text>
          </Text>
        </TouchableOpacity>
      </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl, maxWidth: 560, width: '100%', alignSelf: 'center' },
  brand: { alignItems: 'center', marginBottom: spacing.xxxl },
  title: { ...typography.h1, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs, textAlign: 'center' },
  form: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  label: { ...typography.small, color: colors.textSecondary, marginBottom: spacing.xs, marginTop: spacing.md },
  input: {
    backgroundColor: colors.background,
    color: colors.textPrimary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: 13,
    fontSize: 15,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  errorText: { color: colors.danger, fontSize: 13, flex: 1 },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  buttonText: { color: colors.white, fontWeight: '600', fontSize: 16 },
  linkWrap: { marginTop: spacing.lg, alignItems: 'center' },
  link: { color: colors.textSecondary, fontSize: 14 },
  linkStrong: { color: colors.primary, fontWeight: '600' },
});
