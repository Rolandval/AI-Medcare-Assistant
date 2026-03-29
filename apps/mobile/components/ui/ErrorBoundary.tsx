/**
 * React Error Boundary for graceful crash handling.
 * Wraps screen content and shows fallback UI on unhandled errors.
 */

import React, { Component, ReactNode } from "react";
import { View, Text, TouchableOpacity } from "react-native";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <View className="flex-1 items-center justify-center bg-white px-8">
          <Text className="text-4xl mb-4">😵</Text>
          <Text className="text-lg font-bold text-gray-900 text-center mb-2">
            Щось пішло не так
          </Text>
          <Text className="text-sm text-gray-500 text-center mb-6">
            Спробуй ще раз або перезапусти додаток
          </Text>
          <TouchableOpacity
            onPress={this.handleRetry}
            className="bg-blue-500 rounded-xl px-6 py-3"
            activeOpacity={0.8}
          >
            <Text className="text-white font-semibold">Спробувати ще</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}
