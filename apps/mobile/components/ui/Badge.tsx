/**
 * Small badge/tag component for status indicators.
 */

import { View, Text } from "react-native";

type BadgeVariant = "success" | "warning" | "danger" | "info" | "neutral";

interface Props {
  label: string;
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  success: { bg: "#dcfce7", text: "#16a34a" },
  warning: { bg: "#fef9c3", text: "#ca8a04" },
  danger: { bg: "#fee2e2", text: "#dc2626" },
  info: { bg: "#dbeafe", text: "#2563eb" },
  neutral: { bg: "#f3f4f6", text: "#6b7280" },
};

export function Badge({ label, variant = "neutral" }: Props) {
  const colors = variantStyles[variant];
  return (
    <View className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: colors.bg }}>
      <Text className="text-xs font-medium" style={{ color: colors.text }}>
        {label}
      </Text>
    </View>
  );
}
