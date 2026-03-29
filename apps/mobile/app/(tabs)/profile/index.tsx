import {
  ScrollView, View, Text, TouchableOpacity, TextInput, Alert, Image, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
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
      Alert.alert("Готово", "Telegram підключено! Відкрий бот @My_DonHuan_Assistant_ally_bot та напиши /start");
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
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>

        {/* Avatar Header with Gradient */}
        <LinearGradient
          colors={["#3b82f6", "#2563eb", "#1e40af"]}
          className="pt-6 pb-10 px-6 items-center"
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Settings gear */}
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/profile/settings")}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 items-center justify-center"
            activeOpacity={0.7}
          >
            <Text className="text-lg">⚙️</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handlePickAvatar} className="relative mb-3">
            {user?.avatar_url ? (
              <Image
                source={{ uri: user.avatar_url }}
                className="w-24 h-24 rounded-full border-4 border-white/30"
              />
            ) : (
              <View className="w-24 h-24 rounded-full bg-white/20 items-center justify-center border-4 border-white/30">
                <Text className="text-5xl">{genderEmoji}</Text>
              </View>
            )}
            {avatarMutation.isPending ? (
              <View className="absolute bottom-0 right-0 bg-white rounded-full p-1.5">
                <ActivityIndicator size="small" color="#3b82f6" />
              </View>
            ) : (
              <View className="absolute bottom-0 right-0 bg-white rounded-full w-8 h-8 items-center justify-center"
                style={{ elevation: 2 }}>
                <Text className="text-sm">📷</Text>
              </View>
            )}
          </TouchableOpacity>
          <Text className="text-xl font-bold text-white">{user?.name}</Text>
          <Text className="text-sm text-blue-200">{user?.email}</Text>
          {age && (
            <Text className="text-sm text-blue-200 mt-0.5">
              {age} років {userProfile?.location_city ? `· ${userProfile.location_city}` : ""}
            </Text>
          )}
        </LinearGradient>

        {/* Stats Card — overlapping the gradient */}
        <View className="px-4 -mt-6">
          {profile && (
            <View
              className="bg-white rounded-2xl p-4 mb-4 flex-row justify-around"
              style={{ elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 }}
            >
              <View className="items-center">
                <Text className="text-xl font-bold text-gray-900">{profile.height_cm || "—"}</Text>
                <Text className="text-xs text-gray-400">Зріст, см</Text>
              </View>
              <View className="w-px bg-gray-100" />
              <View className="items-center">
                <Text className="text-xl font-bold text-gray-900">{profile.weight_kg || "—"}</Text>
                <Text className="text-xs text-gray-400">Вага, кг</Text>
              </View>
              <View className="w-px bg-gray-100" />
              <View className="items-center">
                <Text className="text-xl font-bold text-gray-900">{profile.blood_type || "—"}</Text>
                <Text className="text-xs text-gray-400">Кров</Text>
              </View>
            </View>
          )}

          {/* Edit Profile */}
          <TouchableOpacity
            className="bg-white rounded-2xl py-3.5 items-center mb-4 border border-gray-100"
            onPress={() => router.push("/(tabs)/profile/edit")}
            activeOpacity={0.7}
            style={{ elevation: 1 }}
          >
            <Text className="text-blue-500 font-semibold">Редагувати профіль</Text>
          </TouchableOpacity>

          {/* Quick Actions */}
          <View className="flex-row gap-3 mb-3">
            {[
              { route: "/(tabs)/profile/history", icon: "📊", label: "Історія", colors: ["#f5f3ff", "#ede9fe"] as [string, string], text: "text-violet-700" },
              { route: "/(tabs)/profile/health", icon: "🏥", label: "Здоров'я", colors: ["#f0fdf4", "#dcfce7"] as [string, string], text: "text-emerald-700" },
              { route: "/(tabs)/profile/reminders", icon: "💊", label: "Ліки", colors: ["#fff1f2", "#ffe4e6"] as [string, string], text: "text-rose-700" },
            ].map((item) => (
              <TouchableOpacity key={item.route} className="flex-1" onPress={() => router.push(item.route as any)} activeOpacity={0.7}>
                <LinearGradient
                  colors={item.colors}
                  className="rounded-2xl py-4 items-center"
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text className="text-2xl mb-1">{item.icon}</Text>
                  <Text className={`text-sm font-semibold ${item.text}`}>{item.label}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>

          {/* Telegram */}
          <View
            className="bg-white rounded-2xl p-5 mb-4"
            style={{ elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 }}
          >
            <View className="flex-row items-center gap-2 mb-3">
              <View className="w-8 h-8 rounded-xl bg-sky-50 items-center justify-center">
                <Text className="text-base">📱</Text>
              </View>
              <Text className="text-base font-semibold text-gray-700">Telegram</Text>
            </View>
            {user?.telegram_id ? (
              <View className="flex-row items-center gap-3 bg-emerald-50 rounded-xl p-3">
                <View className="w-3 h-3 rounded-full bg-emerald-500" />
                <Text className="text-base text-emerald-700 font-medium">Підключено: {user.telegram_id}</Text>
              </View>
            ) : (
              <View className="gap-3">
                <Text className="text-sm text-gray-500 leading-5">
                  Підключи Telegram для щоденних опитувань та сповіщень
                </Text>
                <View className="bg-gray-50 rounded-xl p-3">
                  <Text className="text-sm text-gray-500 leading-5">
                    1. Відкрий @My_DonHuan_Assistant_ally_bot{"\n"}
                    2. Напиши /start та скопіюй свій ID{"\n"}
                    3. Введи його нижче
                  </Text>
                </View>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base"
                  placeholder="Telegram ID (числа)"
                  value={telegramId}
                  onChangeText={setTelegramId}
                  keyboardType="number-pad"
                />
                <TouchableOpacity
                  className="bg-sky-500 rounded-xl py-3 items-center"
                  onPress={handleLinkTelegram}
                  disabled={linkTelegramMutation.isPending}
                  activeOpacity={0.8}
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
            <View
              className="bg-white rounded-2xl p-5 mb-4"
              style={{ elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 }}
            >
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center gap-2">
                  <View className="w-8 h-8 rounded-xl bg-emerald-50 items-center justify-center">
                    <Text className="text-base">🏥</Text>
                  </View>
                  <Text className="text-base font-semibold text-gray-700">Профіль здоров'я</Text>
                </View>
                <TouchableOpacity onPress={() => router.push("/(tabs)/profile/health")}>
                  <Text className="text-blue-500 text-sm font-medium">Змінити</Text>
                </TouchableOpacity>
              </View>

              {profile.chronic_conditions?.length > 0 && (
                <View className="mb-3">
                  <Text className="text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Хронічні</Text>
                  <View className="flex-row flex-wrap gap-1.5">
                    {profile.chronic_conditions.map((c: string) => (
                      <View key={c} className="bg-red-50 rounded-full px-3 py-1 border border-red-100">
                        <Text className="text-red-700 text-sm">{c}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {profile.allergies?.length > 0 && (
                <View className="mb-3">
                  <Text className="text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Алергії</Text>
                  <View className="flex-row flex-wrap gap-1.5">
                    {profile.allergies.map((a: string) => (
                      <View key={a} className="bg-amber-50 rounded-full px-3 py-1 border border-amber-100">
                        <Text className="text-amber-700 text-sm">{a}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {profile.current_medications?.length > 0 && (
                <View className="mb-3">
                  <Text className="text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Ліки</Text>
                  <View className="flex-row flex-wrap gap-1.5">
                    {profile.current_medications.map((m: string) => (
                      <View key={m} className="bg-blue-50 rounded-full px-3 py-1 border border-blue-100">
                        <Text className="text-blue-700 text-sm">{m}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {profile.health_goals?.length > 0 && (
                <View className="mb-2">
                  <Text className="text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Цілі</Text>
                  <View className="flex-row flex-wrap gap-1.5">
                    {profile.health_goals.map((g: string) => (
                      <View key={g} className="bg-emerald-50 rounded-full px-3 py-1 border border-emerald-100">
                        <Text className="text-emerald-700 text-sm">{g}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {!profile.chronic_conditions?.length &&
               !profile.allergies?.length &&
               !profile.health_goals?.length && (
                <Text className="text-sm text-gray-400 text-center py-2">
                  Натисни "Змінити" щоб заповнити профіль здоров'я
                </Text>
              )}
            </View>
          )}

          {/* Logout */}
          <TouchableOpacity
            className="bg-white rounded-2xl py-4 items-center mb-6 border border-red-100"
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Text className="text-red-400 font-semibold text-base">Вийти з акаунту</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
