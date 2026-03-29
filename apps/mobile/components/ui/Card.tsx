/**
 * Reusable card wrapper with theme-aware styling.
 */

import { View, ViewProps } from "react-native";
import { useTheme } from "@/store/themeStore";

interface Props extends ViewProps {
  variant?: "default" | "outlined" | "elevated";
  children: React.ReactNode;
}

export function Card({ variant = "default", children, style, ...rest }: Props) {
  const { colors } = useTheme();

  const base = {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    padding: 16,
  };

  const variants = {
    default: {
      borderWidth: 1,
      borderColor: colors.border,
    },
    outlined: {
      borderWidth: 1.5,
      borderColor: colors.primary + "40",
    },
    elevated: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
  };

  return (
    <View style={[base, variants[variant], style]} {...rest}>
      {children}
    </View>
  );
}
