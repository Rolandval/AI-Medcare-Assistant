import { ScrollView, View, Text, TouchableOpacity, TextInput, Alert, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/services/api";
import { useAuthStore } from "@/store/authStore";

function MemberCard({ member }: { member: any }) {
  const age = member.birth_date
    ? new Date().getFullYear() - new Date(member.birth_date).getFullYear()
    : null;

  return (
    <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
      <View className="flex-row items-center gap-3">
        <View className="w-12 h-12 rounded-full bg-blue-100 items-center justify-center">
          <Text className="text-2xl">{member.gender === "female" ? "👩" : "👨"}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold text-gray-900">{member.name}</Text>
          {age && <Text className="text-sm text-gray-500">{age} років</Text>}
        </View>
        <View className="w-3 h-3 rounded-full bg-green-500" />
      </View>
    </View>
  );
}

function WeekMenuSection({ menu }: { menu: any }) {
  const today = new Date().toLocaleDateString("uk-UA", { weekday: "long" }).toLowerCase();
  const days: Record<string, string> = {
    monday: "Понеділок", tuesday: "Вівторок", wednesday: "Середа",
    thursday: "Четвер", friday: "П'ятниця", saturday: "Субота", sunday: "Неділя",
  };

  const menuData = menu?.menu_data || {};

  return (
    <View className="mb-6">
      <Text className="text-lg font-bold text-gray-900 mb-3">🍽 Меню тижня</Text>
      {Object.entries(days).map(([key, label]) => {
        const dayMenu = menuData[key];
        if (!dayMenu) return null;
        return (
          <View key={key} className="bg-white rounded-2xl p-4 mb-2 border border-gray-100">
            <Text className="text-base font-semibold text-gray-700 mb-2">{label}</Text>
            <View className="gap-1">
              {dayMenu.breakfast && <Text className="text-sm text-gray-600">🌅 {dayMenu.breakfast.name}</Text>}
              {dayMenu.lunch && <Text className="text-sm text-gray-600">☀️ {dayMenu.lunch.name}</Text>}
              {dayMenu.dinner && <Text className="text-sm text-gray-600">🌙 {dayMenu.dinner.name}</Text>}
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
    onSuccess: () => Alert.alert("✅", "Меню генерується! Зайди за 30 секунд."),
  });

  if (!user?.family_id) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 px-6 pt-8">
          <Text className="text-2xl font-bold text-gray-900 mb-2">👨‍👩‍👧‍👦 Сім'я</Text>
          <Text className="text-base text-gray-500 mb-8">Ти ще не в сім'ї</Text>

          {!showCreate && !showJoin && (
            <View className="gap-4">
              <TouchableOpacity
                className="bg-blue-500 rounded-2xl py-4 items-center"
                onPress={() => setShowCreate(true)}
              >
                <Text className="text-white text-lg font-semibold">➕ Створити сім'ю</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="border-2 border-blue-500 rounded-2xl py-4 items-center"
                onPress={() => setShowJoin(true)}
              >
                <Text className="text-blue-500 text-lg font-semibold">🔗 Приєднатись за кодом</Text>
              </TouchableOpacity>
            </View>
          )}

          {showCreate && (
            <View className="gap-4">
              <Text className="text-lg font-semibold text-gray-700">Назва сім'ї</Text>
              <TextInput
                className="border-2 border-gray-200 rounded-xl px-4 py-4 text-base"
                placeholder="Наприклад: Сім'я Іваненко"
                value={familyName}
                onChangeText={setFamilyName}
              />
              <TouchableOpacity
                className="bg-blue-500 rounded-2xl py-4 items-center"
                onPress={() => createMutation.mutate(familyName)}
              >
                <Text className="text-white text-lg font-semibold">Створити</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowCreate(false)}>
                <Text className="text-gray-400 text-center text-base">Скасувати</Text>
              </TouchableOpacity>
            </View>
          )}

          {showJoin && (
            <View className="gap-4">
              <Text className="text-lg font-semibold text-gray-700">Код запрошення</Text>
              <TextInput
                className="border-2 border-gray-200 rounded-xl px-4 py-4 text-base"
                placeholder="Введи код від адміна сім'ї"
                value={inviteCode}
                onChangeText={setInviteCode}
                autoCapitalize="none"
              />
              <TouchableOpacity
                className="bg-blue-500 rounded-2xl py-4 items-center"
                onPress={() => joinMutation.mutate(inviteCode)}
              >
                <Text className="text-white text-lg font-semibold">Приєднатись</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowJoin(false)}>
                <Text className="text-gray-400 text-center text-base">Скасувати</Text>
              </TouchableOpacity>
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
          👨‍👩‍👧‍👦 {family?.name || "Сім'я"}
        </Text>
        {user.is_family_admin && family?.invite_code && (
          <Text className="text-sm text-gray-500 mb-6">
            Код запрошення: <Text className="font-bold text-blue-500">{family.invite_code}</Text>
          </Text>
        )}

        {/* Members */}
        <Text className="text-lg font-bold text-gray-900 mb-3">Учасники</Text>
        {family?.members?.map((m: any) => <MemberCard key={m.id} member={m} />)}

        {/* Menu */}
        {menu ? (
          <>
            <WeekMenuSection menu={menu} />
            <TouchableOpacity
              className="border-2 border-dashed border-blue-300 rounded-2xl py-4 items-center mb-4"
              onPress={() => generateMenuMutation.mutate()}
            >
              <Text className="text-blue-500 font-semibold text-base">🔄 Перегенерувати меню</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            className="bg-blue-500 rounded-2xl py-4 items-center mb-4"
            onPress={() => generateMenuMutation.mutate()}
          >
            <Text className="text-white font-semibold text-base">✨ Згенерувати меню на тиждень</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
