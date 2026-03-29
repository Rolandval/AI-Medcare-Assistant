/**
 * Offline banner — shows when the device has no internet connection.
 * Uses react-native NetInfo to detect connectivity changes.
 */

import { useEffect, useState } from "react";
import { View, Text, Animated } from "react-native";
import NetInfo from "@react-native-community/netinfo";

export function NetworkBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [opacity] = useState(new Animated.Value(0));

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const offline = !(state.isConnected && state.isInternetReachable !== false);
      setIsOffline(offline);
      Animated.timing(opacity, {
        toValue: offline ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });

    return () => unsubscribe();
  }, []);

  if (!isOffline) return null;

  return (
    <Animated.View
      style={{ opacity }}
      className="absolute top-0 left-0 right-0 z-50"
    >
      <View className="bg-amber-500 px-4 py-2 flex-row items-center justify-center">
        <Text className="text-white text-xs font-semibold">
          📡 Немає з'єднання — показано збережені дані
        </Text>
      </View>
    </Animated.View>
  );
}
