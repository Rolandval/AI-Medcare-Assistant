import { ScrollView, View, Text, TouchableOpacity, TextInput, Alert, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "@/services/api";
import { useAuthStore } from "@/store/authStore";

function MemberCard({ member }: { member: any }) {
  const age = member.birth_date
    ? new Date().getFullYear() - new Date(member.birth_date).getFullYear()
    : null;

  const emoji = member.gender === "female" ? "👩" : "👨";
  const colors: [string, string] = member.gender === "female" ? ["#fdf2f8", "#fce7f3"] : ["#eff6ff", "#dbeafe"];

  return (
    <View
      className="bg-white rounded-2xl p-4 mb-2.5"
      style={{ elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 }}
    >
      <View className="flex-row items-center gap-3">
        <LinearGradient colors={colors} className="w-12 h-12 rounded-2xl items-center justify-center">
          <Text className="text-2xl">{emoji}</Text>
        </LinearGradient>
        <View className="flex-1">
          <Text className="text-base font-semibold text-gray-900">{member.name}</Text>
          {age && <Text className="text-xs text-gray-400">{age} років</Text>}
        </View>
        <View className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
      </View>
    </View>
  );
}

function WeekMenuSection({ menu }: { menu: any }) {
  const days: Record<string, string> = {
    monday: "Понеділок", tuesday: "Вівторок", wednesday: "Середа",
    thursday: "Четвер", friday: "П'ятниця", saturday: "Субота", sunday: "Неділя",
  };

  const menuData = menu?.menu_data || {};

  return (
    <View className="mb-4">
      <Text className="text-lg font-bold text-gray-900 mb-3">Меню тижня</Text>
      {Object.entries(days).map(([key, label]) => {
        const dayMenu = menuData[key];
        if (!dayMenu) return null;
        return (
          <View
            key={key}
            className="bg-white rounded-2xl p-4 mb-2"
            style={{ elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 }}
          >
            <Text className="text-sm font-bold text-gray-700 mb-2">{label}</Text>
            <View className="gap-1.5">
              {dayMenu.breakfast && (
                <View className="flex-row items-center gap-2">
                  <View className="w-6 h-6 rounded-lg bg-amber-50 items-center justify-center">
                    <Text className="text-xs">🌅</Text>
                  </View>
                  <Text className="text-sm text-gray-600 flex-1">{dayMenu.breakfast.name}</Text>
                </View>
              )}
              {dayMenu.lunch && (
                <View className="flex-row items-center gap-2">
                  <View className="w-6 h-6 rounded-lg bg-orange-50 items-center justify-center">
                    <Text className="text-xs">☀️</Text>
                  </View>
                  <Text className="text-sm text-gray-600 flex-1">{dayMenu.lunch.name}</Text>
                </View>
              )}
              {dayMenu.dinner && (
                <View className="flex-row items-center gap-2">
                  <View className="w-6 h-6 rounded-lg bg-blue-50 items-center justify-center">
                    <Text className="text-xs">🌙</Text>
                  </View>
                  <Text className="text-sm text-gray-600 flex-1">{dayMenu.dinner.name}</Text>
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

export default function Family() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [familyName, setFamilyName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  const { data: family, isRefetching, refetch } = useQuery({
    queryKey: ["family"],
    queryFn: () => api.get("/family/me").then((r) => r.data),
    enabled: !!user?.family_id,
  });

  const { data: menu } = useQuery({
    queryKey: ["family-menu"],
    queryFn: () => api.get("/family/menu/current").then((r) => r.data),
    enabled: !!user?.family_id,
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => api.post("/family/create", { name }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["family"] }); setShowCreate(false); },
    onError: () => Alert.alert("Помилка", "Не вдалось створити сім'ю"),
  });

  const joinMutation = useMutation({
    mutationFn: (code: string) => api.post("/family/join", { invite_code: code }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["family"] }); setShowJoin(false); },
    onError: () => Alert.alert("Помилка", "Невірний код запрошення"),
  });

  const generateMenuMutation = useMutation({
    mutationFn: () => api.post("/family/menu/generate"),
    onSuccess: () => Alert.alert("Готово", "Меню генерується! Зайди за 30 секунд."),
  });

  if (!user?.family_id) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 px-6 pt-8">
          <Text className="text-2xl font-bold text-gray-900 mb-1">Сім'я</Text>
          <Text className="text-sm text-gray-400 mb-8">Створи або приєднайся до сім'ї</Text>

          {!showCreate && !showJoin && (
            <View className="gap-4 items-center pt-8">
              <View className="w-24 h-24 rounded-full bg-blue-50 items-center justify-center mb-4">
                <Text className="text-5xl">👨‍👩‍👧‍👦</Text>
              </View>
              <Text className="text-base text-gray-500 text-center mb-6 px-4">
                Об'єднайтесь у сім'ю, щоб AI складав меню для всіх та слідкував за здоров'ям
              </Text>
              <TouchableOpacity className="w-full" onPress={() => setShowCreate(true)} activeOpacity={0.8}>
                <LinearGradient
                  colors={["#3b82f6", "#2563eb"]}
                  className="rounded-2xl py-4 items-center"
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text className="text-white text-lg font-bold">Створити сім'ю</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                className="w-full bg-white border border-gray-200 rounded-2xl py-4 items-center"
                onPress={() => setShowJoin(true)}
                activeOpacity={0.7}
              >
                <Text className="text-gray-700 text-lg font-semibold">Приєднатись за кодом</Text>
              </TouchableOpacity>
            </View>
          )}

          {showCreate && (
            <View
              className="bg-white rounded-2xl p-5 gap-4"
              style={{ elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 }}
            >
              <Text className="text-lg font-bold text-gray-900">Нова сім'я</Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-base"
                placeholder="Наприклад: Сім'я Іваненко"
                value={familyName}
                onChangeText={setFamilyName}
              />
              <View className="flex-row gap-3">
                <TouchableOpacity
                  className="flex-1 border border-gray-200 rounded-xl py-3 items-center"
                  onPress={() => setShowCreate(false)}
                >
                  <Text className="text-gray-500 font-semibold">Скасувати</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 bg-blue-500 rounded-xl py-3 items-center"
                  onPress={() => createMutation.mutate(familyName)}
                >
                  <Text className="text-white font-bold">Створити</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {showJoin && (
            <View
              className="bg-white rounded-2xl p-5 gap-4"
              style={{ elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 }}
            >
              <Text className="text-lg font-bold text-gray-900">Приєднатись</Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-base"
                placeholder="Введи код від адміна сім'ї"
                value={inviteCode}
                onChangeText={setInviteCode}
                autoCapitalize="none"
              />
              <View className="flex-row gap-3">
                <TouchableOpacity
                  className="flex-1 border border-gray-200 rounded-xl py-3 items-center"
                  onPress={() => setShowJoin(false)}
                >
                  <Text className="text-gray-500 font-semibold">Скасувати</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 bg-blue-500 rounded-xl py-3 items-center"
                  onPress={() => joinMutation.mutate(inviteCode)}
                >
                  <Text className="text-white font-bold">Приєднатись</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <Text className="text-2xl font-bold text-gray-900 mb-1">
          {family?.name || "Сім'я"}
        </Text>
        {user.is_family_admin && family?.invite_code && (
          <View className="flex-row items-center gap-2 mb-5">
            <Text className="text-sm text-gray-400">Код:</Text>
            <View className="bg-blue-50 rounded-lg px-2.5 py-1">
              <Text className="text-sm font-bold text-blue-600">{family.invite_code}</Text>
            </View>
          </View>
        )}

        {/* Members */}
        <Text className="text-lg font-bold text-gray-900 mb-3">Учасники</Text>
        {family?.members?.map((m: any) => <MemberCard key={m.id} member={m} />)}

        <View className="h-4" />

        {/* Menu */}
        {menu ? (
          <>
            <WeekMenuSection menu={menu} />
            <TouchableOpacity
              className="border border-dashed border-blue-300 rounded-2xl py-3.5 items-center mb-4 bg-blue-50/50"
              onPress={() => generateMenuMutation.mutate()}
              activeOpacity={0.7}
            >
              <Text className="text-blue-500 font-semibold text-sm">Перегенерувати меню</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity className="mb-4" onPress={() => generateMenuMutation.mutate()} activeOpacity={0.8}>
            <LinearGradient
              colors={["#3b82f6", "#2563eb"]}
              className="rounded-2xl py-4 items-center"
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text className="text-white font-bold text-base">Згенерувати меню на тиждень</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
