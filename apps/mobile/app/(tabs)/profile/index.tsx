import { ScrollView, View, Text, TouchableOpacity, TextInput, Alert, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/services/api";
import { useAuthStore } from "@/store/authStore";

export default function Profile() {
  const { user, logout } = useAuthStore();
  const queryClient = useQueryClient();
  const [telegramId, setTelegramId] = useState("");
  const [editMode, setEditMode] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["health-profile"],
    queryFn: () => api.get("/users/me/health-profile").then((r) => r.data),
  });

  const linkTelegramMutation = useMutation({
    mutationFn: (id: number) => api.post("/telegram/link", { telegram_id: id }),
    onSuccess: () => Alert.alert("✅", "Telegram підключено! Відкрий бот @YourMedcareBot та напиши /start"),
    onError: () => Alert.alert("Помилка", "Не вдалось підключити Telegram"),
  });

  const handleLinkTelegram = () => {
    const id = parseInt(telegramId);
    if (isNaN(id)) { Alert.alert("Помилка", "Введи числовий Telegram ID"); return; }
    linkTelegramMutation.mutate(id);
  };

  const handleLogout = () => {
    Alert.alert("Вихід", "Ти впевнений?", [
      { text: "Скасувати" },
      { text: "Вийти", style: "destructive", onPress: logout },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        <Text className="text-2xl font-bold text-gray-900 mb-6">👤 Профіль</Text>

        {/* User card */}
        <View className="bg-white rounded-3xl p-6 mb-4 border border-gray-100">
          <View className="items-center mb-4">
            <View className="w-20 h-20 rounded-full bg-blue-100 items-center justify-center mb-3">
              <Text className="text-4xl">{user?.avatar_url ? "" : "👤"}</Text>
            </View>
            <Text className="text-xl font-bold text-gray-900">{user?.name}</Text>
            <Text className="text-base text-gray-500">{user?.email}</Text>
          </View>

          {profile && (
            <View className="flex-row justify-around border-t border-gray-100 pt-4">
              <View className="items-center">
                <Text className="text-xl font-bold text-gray-900">{profile.height_cm || "—"}</Text>
                <Text className="text-sm text-gray-500">Зріст (см)</Text>
              </View>
              <View className="items-center">
                <Text className="text-xl font-bold text-gray-900">{profile.weight_kg || "—"}</Text>
                <Text className="text-sm text-gray-500">Вага (кг)</Text>
              </View>
              <View className="items-center">
                <Text className="text-xl font-bold text-gray-900">{profile.blood_type || "—"}</Text>
                <Text className="text-sm text-gray-500">Кров</Text>
              </View>
            </View>
          )}
        </View>

        {/* Telegram */}
        <View className="bg-white rounded-2xl p-5 mb-4 border border-gray-100">
          <Text className="text-base font-semibold text-gray-700 mb-3">📱 Telegram</Text>
          {user?.telegram_id ? (
            <View className="flex-row items-center gap-3">
              <View className="w-3 h-3 rounded-full bg-green-500" />
              <Text className="text-base text-gray-700">Підключено: {user.telegram_id}</Text>
            </View>
          ) : (
            <View className="gap-3">
              <Text className="text-sm text-gray-500">
                Підключи Telegram для щоденних опитувань та сповіщень
              </Text>
              <Text className="text-sm text-gray-500">
                1. Відкрий @YourMedcareBot і напиши /start{"\n"}
                2. Скопіюй свій Telegram ID{"\n"}
                3. Введи його нижче
              </Text>
              <TextInput
                className="border-2 border-gray-200 rounded-xl px-4 py-3 text-base"
                placeholder="Telegram ID (числа)"
                value={telegramId}
                onChangeText={setTelegramId}
                keyboardType="number-pad"
              />
              <TouchableOpacity
                className="bg-blue-500 rounded-xl py-3 items-center"
                onPress={handleLinkTelegram}
              >
                <Text className="text-white font-semibold">Підключити</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Health Profile Summary */}
        {profile && (
          <View className="bg-white rounded-2xl p-5 mb-4 border border-gray-100">
            <Text className="text-base font-semibold text-gray-700 mb-3">🏥 Профіль здоров'я</Text>

            {profile.chronic_conditions?.length > 0 && (
              <View className="mb-3">
                <Text className="text-sm text-gray-500 mb-1">Хронічні хвороби:</Text>
                <Text className="text-base text-gray-700">{profile.chronic_conditions.join(", ")}</Text>
              </View>
            )}
            {profile.allergies?.length > 0 && (
              <View className="mb-3">
                <Text className="text-sm text-gray-500 mb-1">Алергії:</Text>
                <Text className="text-base text-gray-700">{profile.allergies.join(", ")}</Text>
              </View>
            )}

            <TouchableOpacity className="border border-blue-300 rounded-xl py-3 items-center">
              <Text className="text-blue-500 font-semibold">✏️ Редагувати профіль</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Logout */}
        <TouchableOpacity
          className="bg-red-50 rounded-2xl py-4 items-center mb-6 border border-red-100"
          onPress={handleLogout}
        >
          <Text className="text-red-500 font-semibold text-base">🚪 Вийти з акаунту</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
