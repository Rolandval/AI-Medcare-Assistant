import {
  ScrollView, View, Text, TouchableOpacity, TextInput,
  Alert, RefreshControl, Clipboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "@/services/api";
import { useAuthStore } from "@/store/authStore";

// ---- Member Card ----
function MemberCard({
  member,
  isSelected,
  onPress,
}: {
  member: any;
  isSelected: boolean;
  onPress: () => void;
}) {
  const age = member.birth_date
    ? new Date().getFullYear() - new Date(member.birth_date).getFullYear()
    : null;

  const emoji = member.gender === "female" ? "👩" : "👨";
  const colors: [string, string] =
    member.gender === "female" ? ["#fdf2f8", "#fce7f3"] : ["#eff6ff", "#dbeafe"];

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className={`bg-white rounded-2xl p-4 mb-2.5 ${isSelected ? "border-2 border-blue-400" : ""}`}
      style={{
        elevation: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      }}
    >
      <View className="flex-row items-center gap-3">
        <LinearGradient
          colors={colors}
          className="w-12 h-12 rounded-2xl items-center justify-center"
        >
          <Text className="text-2xl">{emoji}</Text>
        </LinearGradient>
        <View className="flex-1">
          <Text className="text-base font-semibold text-gray-900">{member.name}</Text>
          <View className="flex-row items-center gap-2">
            {age && <Text className="text-xs text-gray-400">{age} років</Text>}
            {member.is_admin && (
              <View className="bg-blue-50 rounded-full px-2 py-0.5">
                <Text className="text-xs text-blue-600 font-medium">Адмін</Text>
              </View>
            )}
          </View>
        </View>
        <View
          className={`w-2.5 h-2.5 rounded-full ${isSelected ? "bg-blue-500" : "bg-emerald-400"}`}
        />
      </View>
    </TouchableOpacity>
  );
}

// ---- Shopping List ----
function ShoppingList({ menu }: { menu: any }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const menuData = menu?.menu_data || {};

  // Extract all ingredients from all meals across all days
  const ingredients: { name: string; amount: string; category: string }[] = [];
  const seen = new Set<string>();

  Object.values(menuData).forEach((day: any) => {
    ["breakfast", "lunch", "dinner"].forEach((mealType) => {
      const meal = day?.[mealType];
      if (meal?.ingredients) {
        meal.ingredients.forEach((ing: any) => {
          const key = ing.name?.toLowerCase();
          if (key && !seen.has(key)) {
            seen.add(key);
            ingredients.push({
              name: ing.name,
              amount: ing.amount || "",
              category: ing.category || "other",
            });
          }
        });
      }
    });
  });

  // Group by category
  const categoryLabels: Record<string, { label: string; emoji: string }> = {
    vegetables: { label: "Овочі та зелень", emoji: "🥬" },
    fruits: { label: "Фрукти", emoji: "🍎" },
    dairy: { label: "Молочні продукти", emoji: "🧀" },
    meat: { label: "М'ясо та риба", emoji: "🥩" },
    grains: { label: "Крупи та борошно", emoji: "🌾" },
    spices: { label: "Спеції та соуси", emoji: "🧂" },
    other: { label: "Інше", emoji: "📦" },
  };

  const grouped: Record<string, typeof ingredients> = {};
  ingredients.forEach((ing) => {
    const cat = ing.category in categoryLabels ? ing.category : "other";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(ing);
  });

  const checkedCount = Object.values(checked).filter(Boolean).length;

  if (ingredients.length === 0) return null;

  return (
    <View className="mb-5">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-lg font-bold text-gray-900">Список покупок</Text>
        <View className="bg-blue-50 rounded-full px-2.5 py-1">
          <Text className="text-xs text-blue-600 font-medium">
            {checkedCount}/{ingredients.length}
          </Text>
        </View>
      </View>

      {Object.entries(grouped).map(([cat, items]) => {
        const catInfo = categoryLabels[cat] || categoryLabels.other;
        return (
          <View key={cat} className="mb-3">
            <View className="flex-row items-center gap-1.5 mb-2">
              <Text className="text-sm">{catInfo.emoji}</Text>
              <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {catInfo.label}
              </Text>
            </View>
            <View className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              {items.map((ing, i) => {
                const key = ing.name.toLowerCase();
                const isDone = checked[key];
                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() =>
                      setChecked((prev) => ({ ...prev, [key]: !prev[key] }))
                    }
                    activeOpacity={0.7}
                    className={`flex-row items-center px-4 py-3 ${
                      i < items.length - 1 ? "border-b border-gray-50" : ""
                    }`}
                  >
                    <View
                      className={`w-5 h-5 rounded-md border-2 mr-3 items-center justify-center ${
                        isDone ? "bg-emerald-500 border-emerald-500" : "border-gray-300"
                      }`}
                    >
                      {isDone && <Text className="text-xs text-white">✓</Text>}
                    </View>
                    <Text
                      className={`flex-1 text-sm ${
                        isDone ? "text-gray-300 line-through" : "text-gray-700"
                      }`}
                    >
                      {ing.name}
                    </Text>
                    {ing.amount && (
                      <Text className="text-xs text-gray-400">{ing.amount}</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ---- Day Menu Expanded ----
function DayMenuCard({ dayKey, dayMenu }: { dayKey: string; dayMenu: any }) {
  const [expanded, setExpanded] = useState(false);

  const dayLabels: Record<string, string> = {
    monday: "Понеділок",
    tuesday: "Вівторок",
    wednesday: "Середа",
    thursday: "Четвер",
    friday: "П'ятниця",
    saturday: "Субота",
    sunday: "Неділя",
  };

  const dayEmojis: Record<string, string> = {
    monday: "1️⃣",
    tuesday: "2️⃣",
    wednesday: "3️⃣",
    thursday: "4️⃣",
    friday: "5️⃣",
    saturday: "6️⃣",
    sunday: "7️⃣",
  };

  if (!dayMenu) return null;

  const totalCalories =
    (dayMenu.breakfast?.calories || 0) +
    (dayMenu.lunch?.calories || 0) +
    (dayMenu.dinner?.calories || 0);

  return (
    <TouchableOpacity
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.8}
      className="bg-white rounded-2xl mb-2 overflow-hidden"
      style={{
        elevation: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      }}
    >
      {/* Collapsed header */}
      <View className="p-4">
        <View className="flex-row items-center">
          <Text className="text-base mr-2">{dayEmojis[dayKey] || "📅"}</Text>
          <Text className="text-sm font-bold text-gray-700 flex-1">
            {dayLabels[dayKey] || dayKey}
          </Text>
          {totalCalories > 0 && (
            <Text className="text-xs text-gray-400 mr-2">{totalCalories} ккал</Text>
          )}
          <Text className="text-xs text-gray-400">{expanded ? "▲" : "▼"}</Text>
        </View>

        {/* Compact meal preview when collapsed */}
        {!expanded && (
          <View className="flex-row gap-3 mt-2">
            {dayMenu.breakfast && (
              <View className="flex-row items-center gap-1 flex-1">
                <Text className="text-xs">🌅</Text>
                <Text className="text-xs text-gray-500 flex-1" numberOfLines={1}>
                  {dayMenu.breakfast.name}
                </Text>
              </View>
            )}
            {dayMenu.lunch && (
              <View className="flex-row items-center gap-1 flex-1">
                <Text className="text-xs">☀️</Text>
                <Text className="text-xs text-gray-500 flex-1" numberOfLines={1}>
                  {dayMenu.lunch.name}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Expanded detail */}
      {expanded && (
        <View className="px-4 pb-4 pt-1 border-t border-gray-50">
          {[
            { key: "breakfast", label: "Сніданок", emoji: "🌅", colors: ["#fefce8", "#fef9c3"] as [string, string] },
            { key: "lunch", label: "Обід", emoji: "☀️", colors: ["#fff7ed", "#ffedd5"] as [string, string] },
            { key: "dinner", label: "Вечеря", emoji: "🌙", colors: ["#eff6ff", "#dbeafe"] as [string, string] },
          ].map(({ key, label, emoji, colors }) => {
            const meal = dayMenu[key];
            if (!meal) return null;
            return (
              <View key={key} className="mb-3">
                <LinearGradient
                  colors={colors}
                  className="rounded-xl p-3"
                >
                  <View className="flex-row items-center gap-2 mb-1.5">
                    <Text className="text-sm">{emoji}</Text>
                    <Text className="text-xs font-semibold text-gray-600 uppercase">{label}</Text>
                    {meal.calories && (
                      <Text className="text-xs text-gray-400 ml-auto">
                        {meal.calories} ккал
                      </Text>
                    )}
                  </View>
                  <Text className="text-sm font-medium text-gray-800 mb-1">{meal.name}</Text>
                  {meal.description && (
                    <Text className="text-xs text-gray-500">{meal.description}</Text>
                  )}
                  {meal.ingredients && meal.ingredients.length > 0 && (
                    <View className="flex-row flex-wrap gap-1 mt-2">
                      {meal.ingredients.slice(0, 6).map((ing: any, i: number) => (
                        <View key={i} className="bg-white/60 rounded-md px-2 py-0.5">
                          <Text className="text-xs text-gray-600">{ing.name}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </LinearGradient>
              </View>
            );
          })}
        </View>
      )}
    </TouchableOpacity>
  );
}

// ---- Week Menu Section ----
function WeekMenuSection({ menu }: { menu: any }) {
  const [showShoppingList, setShowShoppingList] = useState(false);
  const menuData = menu?.menu_data || {};

  const dayOrder = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

  return (
    <View className="mb-4">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-lg font-bold text-gray-900">Меню тижня</Text>
        <TouchableOpacity
          onPress={() => setShowShoppingList(!showShoppingList)}
          className="bg-amber-50 rounded-full px-3 py-1.5"
          activeOpacity={0.7}
        >
          <Text className="text-xs text-amber-700 font-medium">
            {showShoppingList ? "📋 Меню" : "🛒 Покупки"}
          </Text>
        </TouchableOpacity>
      </View>

      {showShoppingList ? (
        <ShoppingList menu={menu} />
      ) : (
        dayOrder.map((key) => {
          const dayMenu = menuData[key];
          return <DayMenuCard key={key} dayKey={key} dayMenu={dayMenu} />;
        })
      )}
    </View>
  );
}

// ---- Member Health Summary (profile switching) ----
function MemberHealthSummary({ memberId }: { memberId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["member-health", memberId],
    queryFn: () => api.get(`/family/members/${memberId}/health`).then((r) => r.data),
    enabled: !!memberId,
  });

  if (isLoading || !data) return null;

  return (
    <View className="bg-white rounded-2xl p-4 mb-4 border border-blue-100">
      <Text className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3">
        Показники здоров'я
      </Text>

      {data.latest_metrics && (
        <View className="flex-row gap-3 mb-3">
          {data.latest_metrics.weight && (
            <View className="flex-1 bg-gray-50 rounded-xl p-3 items-center">
              <Text className="text-lg font-bold text-gray-900">{data.latest_metrics.weight}</Text>
              <Text className="text-xs text-gray-400">кг</Text>
            </View>
          )}
          {data.latest_metrics.blood_pressure && (
            <View className="flex-1 bg-gray-50 rounded-xl p-3 items-center">
              <Text className="text-lg font-bold text-gray-900">
                {data.latest_metrics.blood_pressure}
              </Text>
              <Text className="text-xs text-gray-400">тиск</Text>
            </View>
          )}
          {data.latest_metrics.heart_rate && (
            <View className="flex-1 bg-gray-50 rounded-xl p-3 items-center">
              <Text className="text-lg font-bold text-gray-900">
                {data.latest_metrics.heart_rate}
              </Text>
              <Text className="text-xs text-gray-400">пульс</Text>
            </View>
          )}
        </View>
      )}

      {data.recent_flags && data.recent_flags.length > 0 && (
        <View className="bg-red-50 rounded-xl p-3">
          <Text className="text-xs font-semibold text-red-700 mb-1">Потребує уваги:</Text>
          {data.recent_flags.map((flag: any, i: number) => (
            <Text key={i} className="text-xs text-red-600">
              • {flag.indicator}: {flag.value}
            </Text>
          ))}
        </View>
      )}

      {(!data.latest_metrics || Object.keys(data.latest_metrics).length === 0) && (
        <Text className="text-sm text-gray-400 text-center py-2">Даних поки немає</Text>
      )}
    </View>
  );
}

// ---- Main Screen ----
export default function Family() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [familyName, setFamilyName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const {
    data: family,
    isRefetching,
    refetch,
  } = useQuery({
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family"] });
      setShowCreate(false);
    },
    onError: () => Alert.alert("Помилка", "Не вдалось створити сім'ю"),
  });

  const joinMutation = useMutation({
    mutationFn: (code: string) => api.post("/family/join", { invite_code: code }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family"] });
      setShowJoin(false);
    },
    onError: () => Alert.alert("Помилка", "Невірний код запрошення"),
  });

  const generateMenuMutation = useMutation({
    mutationFn: () => api.post("/family/menu/generate"),
    onSuccess: () => {
      Alert.alert("Готово", "Меню генерується! Буде готове за 30 секунд.");
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ["family-menu"] }), 30_000);
    },
  });

  const copyInviteCode = () => {
    if (family?.invite_code) {
      Clipboard.setString(family.invite_code);
      Alert.alert("Скопійовано!", "Код запрошення скопійовано в буфер обміну");
    }
  };

  // ---- No family state ----
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
              <TouchableOpacity
                className="w-full"
                onPress={() => setShowCreate(true)}
                activeOpacity={0.8}
              >
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
              style={{
                elevation: 2,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
              }}
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
              style={{
                elevation: 2,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
              }}
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

  // ---- Family active state ----
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {/* Header with family name */}
        <View className="flex-row items-center justify-between mb-1">
          <Text className="text-2xl font-bold text-gray-900">
            {family?.name || "Сім'я"}
          </Text>
          <View className="flex-row items-center gap-2">
            <Text className="text-sm">👨‍👩‍👧‍👦</Text>
            <Text className="text-sm text-gray-500">{family?.members?.length || 0}</Text>
          </View>
        </View>

        {/* Invite code */}
        {user.is_family_admin && family?.invite_code && (
          <TouchableOpacity
            onPress={copyInviteCode}
            activeOpacity={0.7}
            className="flex-row items-center gap-2 mb-5"
          >
            <Text className="text-sm text-gray-400">Код запрошення:</Text>
            <View className="bg-blue-50 rounded-lg px-2.5 py-1 flex-row items-center gap-1">
              <Text className="text-sm font-bold text-blue-600">{family.invite_code}</Text>
              <Text className="text-xs text-blue-400">📋</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Members */}
        <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Учасники ({family?.members?.length || 0})
        </Text>
        {family?.members?.map((m: any) => (
          <MemberCard
            key={m.id}
            member={m}
            isSelected={selectedMemberId === m.id}
            onPress={() =>
              setSelectedMemberId((prev) => (prev === m.id ? null : m.id))
            }
          />
        ))}

        {/* Selected member health summary */}
        {selectedMemberId && (
          <MemberHealthSummary memberId={selectedMemberId} />
        )}

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
              <Text className="text-blue-500 font-semibold text-sm">
                🔄 Перегенерувати меню
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <View className="mb-4">
            <View className="items-center py-8 mb-4">
              <View className="w-20 h-20 rounded-full bg-blue-50 items-center justify-center mb-3">
                <Text className="text-4xl">🍽</Text>
              </View>
              <Text className="text-base font-semibold text-gray-700 mb-1">Меню ще не створено</Text>
              <Text className="text-sm text-gray-400 text-center px-8">
                AI створить збалансоване меню для всієї родини на тиждень
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => generateMenuMutation.mutate()}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={["#3b82f6", "#2563eb"]}
                className="rounded-2xl py-4 items-center"
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text className="text-white font-bold text-base">
                  Згенерувати меню на тиждень
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
