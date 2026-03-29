/**
 * Empty state placeholder with emoji, title, and optional action button.
 */

import { View, Text, TouchableOpacity } from "react-native";
import { useTheme } from "@/store/themeStore";

interface Props {
  emoji: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ emoji, title, subtitle, actionLabel, onAction }: Props) {
  const { colors } = useTheme();
  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <Text className="text-4xl mb-4">{emoji}</Text>
      <Text className="text-lg font-semibold text-center mb-2" style={{ color: colors.text }}>
        {title}
      </Text>
      {subtitle && (
        <Text className="text-sm text-center mb-4" style={{ color: colors.textSecondary }}>
          {subtitle}
        </Text>
      )}
      {actionLabel && onAction && (
        <TouchableOpacity
          onPress={onAction}
          className="rounded-xl px-6 py-3 mt-2"
          style={{ backgroundColor: colors.primary }}
          activeOpacity={0.8}
        >
          <Text className="text-white font-semibold text-sm">{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
