/**
 * Full-screen centered loading spinner with optional message.
 */

import { View, Text, ActivityIndicator } from "react-native";
import { useTheme } from "@/store/themeStore";

interface Props {
  message?: string;
}

export function LoadingScreen({ message }: Props) {
  const { colors } = useTheme();
  return (
    <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.bg }}>
      <ActivityIndicator size="large" color={colors.primary} />
      {message && (
        <Text className="mt-4 text-base" style={{ color: colors.textSecondary }}>
          {message}
        </Text>
      )}
    </View>
  );
}
