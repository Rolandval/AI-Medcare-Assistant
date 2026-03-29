import { useState } from "react";
import {
  ScrollView, View, Text, TouchableOpacity, Switch, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import { useTheme, useThemeStore, ThemeMode } from "@/store/themeStore";

// ---- Section Header ----
function SectionHeader({ title }: { title: string }) {
  const { colors } = useTheme();
  return (
    <Text
      className="text-xs font-semibold uppercase tracking-wider px-1 mb-2 mt-5"
      style={{ color: colors.textMuted }}
    >
      {title}
    </Text>
  );
}

// ---- Row Item ----
function SettingsRow({
  icon, label, value, onPress, danger,
}: {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
      className="flex-row items-center py-3.5 px-4"
      style={{ backgroundColor: colors.bgCard, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}
    >
      <Text className="text-base mr-3">{icon}</Text>
      <Text className="flex-1 text-base" style={{ color: danger ? colors.danger : colors.text }}>
        {label}
      </Text>
      {value && (
        <Text className="text-sm mr-2" style={{ color: colors.textMuted }}>
          {value}
        </Text>
      )}
      {onPress && <Text style={{ color: colors.textMuted }}>›</Text>}
    </TouchableOpacity>
  );
}

// ---- Toggle Row ----
function ToggleRow({
  icon, label, value, onToggle,
}: {
  icon: string;
  label: string;
  value: boolean;
  onToggle: (v: boolean) => void;
}) {
  const { colors } = useTheme();
  return (
    <View
      className="flex-row items-center py-3 px-4"
      style={{ backgroundColor: colors.bgCard, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}
    >
      <Text className="text-base mr-3">{icon}</Text>
      <Text className="flex-1 text-base" style={{ color: colors.text }}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.border, true: "#93c5fd" }}
        thumbColor={value ? colors.primary : "#f4f3f4"}
      />
    </View>
  );
}

// ---- Theme Selector ----
function ThemeSelector() {
  const { colors, isDark } = useTheme();
  const { theme, setTheme } = useThemeStore();

  const options: { key: ThemeMode; label: string; icon: string }[] = [
    { key: "light", label: "Світла", icon: "☀️" },
    { key: "dark", label: "Темна", icon: "🌙" },
    { key: "system", label: "Системна", icon: "📱" },
  ];

  return (
    <View
      className="flex-row items-center py-3 px-4"
      style={{ backgroundColor: colors.bgCard }}
    >
      <Text className="text-base mr-3">🎨</Text>
      <Text className="flex-1 text-base" style={{ color: colors.text }}>Тема</Text>
      <View className="flex-row rounded-lg overflow-hidden" style={{ borderWidth: 1, borderColor: colors.border }}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            onPress={() => setTheme(opt.key)}
            className="px-3 py-1.5"
            style={{
              backgroundColor: theme === opt.key ? colors.primary : "transparent",
            }}
          >
            <Text
              className="text-xs font-medium"
              style={{ color: theme === opt.key ? "#ffffff" : colors.textSecondary }}
            >
              {opt.icon} {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function Settings() {
  const router = useRouter();
  const { user, logout, loadUser } = useAuthStore();
  const queryClient = useQueryClient();
  const { colors } = useTheme();

  const { data: prefs } = useQuery({
    queryKey: ["user-prefs"],
    queryFn: () => api.get("/users/me").then((r) => r.data),
  });

  const [notifications, setNotifications] = useState(true);
  const [surveyReminders, setSurveyReminders] = useState(true);
  const [medicationReminders, setMedicationReminders] = useState(true);
  const [aiCards, setAiCards] = useState(true);

  const updatePrefsMutation = useMutation({
    mutationFn: (payload: any) => api.patch("/users/me", payload),
    onSuccess: () => {
      loadUser();
      queryClient.invalidateQueries({ queryKey: ["user-prefs"] });
    },
  });

  const handleToggleNotifications = (v: boolean) => {
    setNotifications(v);
    updatePrefsMutation.mutate({ notifications_enabled: v });
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Видалити акаунт?",
      "Всі дані буде видалено безповоротно. Ця дія незворотна.",
      [
        { text: "Скасувати" },
        {
          text: "Видалити",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete("/users/me");
              await logout();
            } catch {
              Alert.alert("Помилка", "Не вдалось видалити акаунт");
            }
          },
        },
      ]
    );
  };

  const handleExportData = () => {
    Alert.alert(
      "Експорт даних",
      "Запит на експорт відправлено. Ми надішлемо файл на твою пошту протягом 24 годин.",
      [{ text: "Ок" }]
    );
    api.post("/users/me/export-data").catch(() => {});
  };

  const handleLogout = () => {
    Alert.alert("Вихід", "Ти впевнений?", [
      { text: "Скасувати" },
      { text: "Вийти", style: "destructive", onPress: logout },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="flex-row items-center px-4 pt-4 pb-2">
          <TouchableOpacity onPress={() => router.back()} className="mr-3 py-1">
            <Text className="text-base font-medium" style={{ color: colors.primary }}>← Назад</Text>
          </TouchableOpacity>
          <Text className="text-xl font-bold" style={{ color: colors.text }}>Налаштування</Text>
        </View>

        {/* Appearance */}
        <SectionHeader title="Зовнішній вигляд" />
        <View className="rounded-2xl overflow-hidden mx-4" style={{ borderWidth: 1, borderColor: colors.border }}>
          <ThemeSelector />
        </View>

        {/* Account */}
        <SectionHeader title="Акаунт" />
        <View className="rounded-2xl overflow-hidden mx-4" style={{ borderWidth: 1, borderColor: colors.border }}>
          <SettingsRow
            icon="👤"
            label="Редагувати профіль"
            onPress={() => router.push("/(tabs)/profile/edit")}
          />
          <SettingsRow
            icon="🏥"
            label="Профіль здоров'я"
            onPress={() => router.push("/(tabs)/profile/health")}
          />
          <SettingsRow
            icon="🔑"
            label="Змінити пароль"
            onPress={() =>
              Alert.alert(
                "Зміна пароля",
                "Ми надішлемо посилання для зміни пароля на " + (user?.email || "вашу пошту"),
                [
                  { text: "Скасувати" },
                  {
                    text: "Надіслати",
                    onPress: () => {
                      api.post("/auth/reset-password", { email: user?.email }).catch(() => {});
                      Alert.alert("Готово", "Перевір пошту");
                    },
                  },
                ]
              )
            }
          />
        </View>

        {/* Notifications */}
        <SectionHeader title="Сповіщення" />
        <View className="rounded-2xl overflow-hidden mx-4" style={{ borderWidth: 1, borderColor: colors.border }}>
          <ToggleRow
            icon="🔔"
            label="Сповіщення"
            value={notifications}
            onToggle={handleToggleNotifications}
          />
          <ToggleRow
            icon="📋"
            label="Опитування (ранок/вечір)"
            value={surveyReminders}
            onToggle={setSurveyReminders}
          />
          <ToggleRow
            icon="💊"
            label="Нагадування про ліки"
            value={medicationReminders}
            onToggle={setMedicationReminders}
          />
          <ToggleRow
            icon="🩺"
            label="Картки AI-лікарів"
            value={aiCards}
            onToggle={setAiCards}
          />
        </View>

        {/* Schedule */}
        <SectionHeader title="Розклад" />
        <View className="rounded-2xl overflow-hidden mx-4" style={{ borderWidth: 1, borderColor: colors.border }}>
          <SettingsRow
            icon="🌅"
            label="Ранкове опитування"
            value={`${prefs?.morning_survey_hour || 8}:00`}
            onPress={() => router.push("/(tabs)/profile/edit")}
          />
          <SettingsRow
            icon="🌙"
            label="Вечірнє опитування"
            value={`${prefs?.evening_survey_hour || 21}:00`}
            onPress={() => router.push("/(tabs)/profile/edit")}
          />
          <SettingsRow
            icon="💊"
            label="Нагадування про ліки"
            onPress={() => router.push("/(tabs)/profile/reminders")}
          />
        </View>

        {/* Integrations */}
        <SectionHeader title="Інтеграції" />
        <View className="rounded-2xl overflow-hidden mx-4" style={{ borderWidth: 1, borderColor: colors.border }}>
          <SettingsRow
            icon="📱"
            label="Telegram"
            value={user?.telegram_id ? "Підключено" : "Не підключено"}
            onPress={() => router.push("/(tabs)/profile")}
          />
        </View>

        {/* Data & Privacy */}
        <SectionHeader title="Дані та приватність" />
        <View className="rounded-2xl overflow-hidden mx-4" style={{ borderWidth: 1, borderColor: colors.border }}>
          <SettingsRow
            icon="📦"
            label="Експорт даних"
            onPress={handleExportData}
          />
          <SettingsRow
            icon="🗑️"
            label="Видалити акаунт"
            onPress={handleDeleteAccount}
            danger
          />
        </View>

        {/* About */}
        <SectionHeader title="Про додаток" />
        <View className="rounded-2xl overflow-hidden mx-4" style={{ borderWidth: 1, borderColor: colors.border }}>
          <SettingsRow icon="ℹ️" label="Версія" value="1.0.0" />
          <SettingsRow icon="📄" label="Умови використання" onPress={() => {}} />
          <SettingsRow icon="🔒" label="Політика приватності" onPress={() => {}} />
        </View>

        {/* Logout */}
        <View className="px-4 mt-6 mb-8">
          <TouchableOpacity
            className="rounded-2xl py-4 items-center"
            style={{ backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.danger + "30" }}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Text className="font-semibold text-base" style={{ color: colors.danger }}>
              Вийти з акаунту
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
