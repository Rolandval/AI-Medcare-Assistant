import {
  ScrollView, View, Text, TouchableOpacity, TextInput, Alert, Image, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { api } from "@/services/api";
import { useAuthStore } from "@/store/authStore";

export default function Profile() {
  const { user, logout, loadUser } = useAuthStore();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [telegramId, setTelegramId] = useState("");

  const { data: profile } = useQuery({
    queryKey: ["health-profile"],
    queryFn: () => api.get("/users/me/health-profile").then((r) => r.data),
  });

  const { data: userProfile } = useQuery({
    queryKey: ["user-profile"],
    queryFn: () => api.get("/users/me").then((r) => r.data),
  });

  const linkTelegramMutation = useMutation({
    mutationFn: (id: number) => api.post("/telegram/link", { telegram_id: id }),
    onSuccess: async () => {
      await loadUser();
      Alert.alert("✅", "Telegram підключено! Відкрий бот @My_DonHuan_Assistant_ally_bot та напиши /start");
    },
    onError: () => Alert.alert("Помилка", "Не вдалось підключити Telegram"),
  });

  const avatarMutation = useMutation({
    mutationFn: async (uri: string) => {
      const formData = new FormData();
      const filename = uri.split("/").pop() || "avatar.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : "image/jpeg";
      formData.append("file", { uri, name: filename, type } as any);
      return api.post("/users/me/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: async () => {
      await loadUser();
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      Alert.alert("✅", "Фото оновлено!");
    },
    onError: () => Alert.alert("Помилка", "Не вдалось завантажити фото"),
  });

  const handlePickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      avatarMutation.mutate(result.assets[0].uri);
    }
  };

  const handleLinkTelegram = () => {
    const id = parseInt(telegramId);
    if (isNaN(id)) {
      Alert.alert("Помилка", "Введи числовий Telegram ID");
      return;
    }
    linkTelegramMutation.mutate(id);
  };

  const handleLogout = () => {
    Alert.alert("Вихід", "Ти впевнений?", [
      { text: "Скасувати" },
      { text: "Вийти", style: "destructive", onPress: logout },
    ]);
  };

  const age = userProfile?.birth_date
    ? new Date().getFullYear() - new Date(userProfile.birth_date).getFullYear()
    : null;

  const genderEmoji =
    userProfile?.gender === "female" ? "👩" : userProfile?.gender === "male" ? "👨" : "👤";

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        <Text className="text-2xl font-bold text-gray-900 mb-6">👤 Профіль</Text>

        {/* User card with avatar */}
        <View className="bg-white rounded-3xl p-6 mb-4 border border-gray-100">
          <View className="items-center mb-4">
            <TouchableOpacity onPress={handlePickAvatar} className="relative mb-3">
              {user?.avatar_url ? (
                <Image
                  source={{ uri: user.avatar_url }}
                  className="w-24 h-24 rounded-full"
                />
              ) : (
                <View className="w-24 h-24 rounded-full bg-blue-100 items-center justify-center">
                  <Text className="text-5xl">{genderEmoji}</Text>
                </View>
              )}
              {avatarMutation.isPending ? (
                <View className="absolute bottom-0 right-0 bg-white rounded-full p-1.5 border border-gray-200">
                  <ActivityIndicator size="small" color="#3b82f6" />
                </View>
              ) : (
                <View className="absolute bottom-0 right-0 bg-blue-500 rounded-full p-1.5">
                  <Text className="text-white text-xs">📷</Text>
                </View>
              )}
            </TouchableOpacity>
            <Text className="text-xl font-bold text-gray-900">{user?.name}</Text>
            <Text className="text-base text-gray-500">{user?.email}</Text>
            {age && (
              <Text className="text-sm text-gray-400 mt-1">
                {age} років • {userProfile?.location_city || ""}
              </Text>
            )}
          </View>

          {/* Stats row */}
          {profile && (
            <View className="flex-row justify-around border-t border-gray-100 pt-4">
              <View className="items-center">
                <Text className="text-xl font-bold text-gray-900">{profile.height_cm || "—"}</Text>
                <Text className="text-sm text-gray-500">Зріст</Text>
              </View>
              <View className="items-center">
                <Text className="text-xl font-bold text-gray-900">{profile.weight_kg || "—"}</Text>
                <Text className="text-sm text-gray-500">Вага</Text>
              </View>
              <View className="items-center">
                <Text className="text-xl font-bold text-gray-900">{profile.blood_type || "—"}</Text>
                <Text className="text-sm text-gray-500">Кров</Text>
              </View>
            </View>
          )}

          {/* Edit profile button */}
          <TouchableOpacity
            className="mt-4 border border-blue-300 rounded-xl py-3 items-center"
            onPress={() => router.push("/(tabs)/profile/edit")}
          >
            <Text className="text-blue-500 font-semibold">✏️ Редагувати профіль</Text>
          </TouchableOpacity>
        </View>

        {/* Quick actions */}
        <View className="flex-row gap-3 mb-3">
          <TouchableOpacity
            className="flex-1 bg-purple-50 rounded-2xl py-4 items-center border border-purple-100"
            onPress={() => router.push("/(tabs)/profile/history")}
          >
            <Text className="text-2xl mb-1">📊</Text>
            <Text className="text-sm font-semibold text-purple-700">Історія</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-green-50 rounded-2xl py-4 items-center border border-green-100"
            onPress={() => router.push("/(tabs)/profile/health")}
          >
            <Text className="text-2xl mb-1">🏥</Text>
            <Text className="text-sm font-semibold text-green-700">Здоров'я</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          className="bg-red-50 rounded-2xl py-4 items-center border border-red-100 mb-4 flex-row justify-center gap-2"
          onPress={() => router.push("/(tabs)/profile/reminders")}
        >
          <Text className="text-2xl">💊</Text>
          <Text className="text-sm font-semibold text-red-700">Нагадування про ліки</Text>
        </TouchableOpacity>

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
                1. Відкрий @My_DonHuan_Assistant_ally_bot і напиши /start{"\n"}
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
                disabled={linkTelegramMutation.isPending}
              >
                {linkTelegramMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-semibold">Підключити</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Health Profile Summary */}
        {profile && (
          <View className="bg-white rounded-2xl p-5 mb-4 border border-gray-100">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-base font-semibold text-gray-700">🏥 Профіль здоров'я</Text>
              <TouchableOpacity onPress={() => router.push("/(tabs)/profile/health")}>
                <Text className="text-blue-500 text-sm">Редагувати →</Text>
              </TouchableOpacity>
            </View>

            {profile.chronic_conditions?.length > 0 && (
              <View className="mb-3">
                <Text className="text-sm text-gray-500 mb-1">Хронічні хвороби:</Text>
                <View className="flex-row flex-wrap gap-1.5">
                  {profile.chronic_conditions.map((c: string) => (
                    <View key={c} className="bg-red-50 rounded-full px-3 py-1">
                      <Text className="text-red-700 text-sm">{c}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {profile.allergies?.length > 0 && (
              <View className="mb-3">
                <Text className="text-sm text-gray-500 mb-1">Алергії:</Text>
                <View className="flex-row flex-wrap gap-1.5">
                  {profile.allergies.map((a: string) => (
                    <View key={a} className="bg-amber-50 rounded-full px-3 py-1">
                      <Text className="text-amber-700 text-sm">{a}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {profile.current_medications?.length > 0 && (
              <View className="mb-3">
                <Text className="text-sm text-gray-500 mb-1">Ліки:</Text>
                <View className="flex-row flex-wrap gap-1.5">
                  {profile.current_medications.map((m: string) => (
                    <View key={m} className="bg-blue-50 rounded-full px-3 py-1">
                      <Text className="text-blue-700 text-sm">{m}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {profile.health_goals?.length > 0 && (
              <View className="mb-2">
                <Text className="text-sm text-gray-500 mb-1">Цілі:</Text>
                <View className="flex-row flex-wrap gap-1.5">
                  {profile.health_goals.map((g: string) => (
                    <View key={g} className="bg-green-50 rounded-full px-3 py-1">
                      <Text className="text-green-700 text-sm">{g}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {!profile.chronic_conditions?.length &&
             !profile.allergies?.length &&
             !profile.health_goals?.length && (
              <Text className="text-sm text-gray-400 text-center py-2">
                Натисни "Редагувати" щоб заповнити профіль здоров'я
              </Text>
            )}
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
