import { useEffect, useRef } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Notifications from "expo-notifications";
import { useAuthStore } from "@/store/authStore";
import { registerForPushNotifications } from "@/services/notifications";
import { asyncStoragePersister } from "@/services/queryPersister";
import { useColorScheme } from "react-native";
import { ThemeProvider, useThemeStore, useTheme } from "@/store/themeStore";
import { ErrorBoundary, NetworkBanner } from "@/components/ui";
import "../global.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      // Keep data in cache for 24 hours for offline access
      gcTime: 1000 * 60 * 60 * 24,
    },
  },
});

function AppContent() {
  const { loadUser, isAuthenticated } = useAuthStore();
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    loadUser();
  }, []);

  // Register push notifications when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    registerForPushNotifications();

    // Listen for incoming notifications (foreground)
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log("Notification received:", notification.request.content.title);
      }
    );

    // Listen for notification taps
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        console.log("Notification tapped:", data);
        // Navigation handled by expo-router deep links if needed
      }
    );

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [isAuthenticated]);

  const { theme } = useThemeStore();
  const systemScheme = useColorScheme();
  const isDark = theme === "dark" || (theme === "system" && systemScheme === "dark");

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister: asyncStoragePersister,
          maxAge: 1000 * 60 * 60 * 24, // 24 hours
          buster: "v1",
        }}
      >
        <StatusBar style={isDark ? "light" : "dark"} />
        <NetworkBanner />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </PersistQueryClientProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </ErrorBoundary>
  );
}
