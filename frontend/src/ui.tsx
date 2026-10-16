import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from './theme';

export function Screen({
  title,
  subtitle,
  children,
  scroll = true,
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  scroll?: boolean;
}) {
  const content = (
    <View style={[styles.content, !scroll && styles.contentFill]}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {scroll ? <ScrollView keyboardShouldPersistTaps="handled">{content}</ScrollView> : content}
    </SafeAreaView>
  );
}

export function Panel({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.panel, style]}>{children}</View>;
}

export const Field = React.forwardRef<TextInput, TextInputProps>(function Field(props, ref) {
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={colors.muted}
      {...props}
      style={[styles.field, props.style]}
    />
  );
});

export function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  icon,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, (disabled || loading) && styles.disabled]}
    >
      {loading ? <ActivityIndicator color={colors.text} /> : (
        <>
          {icon ? <Ionicons name={icon} size={19} color={colors.text} /> : null}
          <Text style={styles.primaryButtonText}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={styles.sectionText}>{children}</Text>
      {action}
    </View>
  );
}

export function InlineNotice({ children, tone = 'error' }: { children: React.ReactNode; tone?: 'error' | 'info' }) {
  return (
    <View style={[styles.notice, tone === 'error' ? styles.noticeError : styles.noticeInfo]}>
      <Text style={styles.noticeText}>{children}</Text>
    </View>
  );
}

export function LoadingState({ label = 'Carregando...' }: { label?: string }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.primaryLight} />
      <Text style={styles.subtitle}>{label}</Text>
    </View>
  );
}

export function EmptyState({ label }: { label: string }) {
  return (
    <View style={styles.empty}>
      <Ionicons name="file-tray-outline" size={28} color={colors.muted} />
      <Text style={styles.subtitle}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 36, gap: 14 },
  contentFill: { flex: 1 },
  title: { color: colors.text, fontSize: 27, fontWeight: '800', letterSpacing: 0.2 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  panel: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 20, padding: 16, gap: 12 },
  field: { color: colors.text, backgroundColor: colors.surfaceLight, borderWidth: 1, borderColor: colors.border, borderRadius: 13, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15 },
  primaryButton: { minHeight: 50, borderRadius: 15, backgroundColor: colors.primary, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9 },
  primaryButtonText: { color: colors.text, fontSize: 15, fontWeight: '700' },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.55 },
  sectionTitle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 },
  sectionText: { color: colors.text, fontSize: 17, fontWeight: '700' },
  notice: { padding: 12, borderRadius: 12 },
  noticeError: { backgroundColor: colors.dangerSoft },
  noticeInfo: { backgroundColor: 'rgba(138,43,226,0.15)' },
  noticeText: { color: colors.text, lineHeight: 19 },
  loading: { flex: 1, minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: 12 },
  empty: { alignItems: 'center', padding: 24, gap: 8 },
});
