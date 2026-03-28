import { useState } from "react";
import { ScrollView, View, Text, TouchableOpacity, Image, Alert, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from "react-native-svg";
import { api } from "@/services/api";

// ---- Circular Macro Ring ----
function MacroRing({
  label,
  value,
  goal,
  color,
  emoji,
}: {
  label: string;
  value: number;
  goal: number;
  color: string;
  emoji: string;
}) {
  const size = 80;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(value / goal, 1);
  const progress = pct * circumference;

  return (
    <View className="items-center flex-1">
      <View style={{ width: size, height: size }} className="items-center justify-center">
        <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#f3f4f6"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={`${progress} ${circumference - progress}`}
            strokeLinecap="round"
          />
        </Svg>
        <View className="absolute items-center">
          <Text className="text-lg font-bold text-gray-900">{Math.round(value)}</Text>
        </View>
      </View>
      <Text className="text-xs text-gray-500 mt-1.5">{emoji} {label}</Text>
      <Text className="text-xs text-gray-300">{Math.round(value)}/{goal}г</Text>
    </View>
  );
}

// ---- Calorie Ring (large center) ----
function CalorieRing({ value, goal }: { value: number; goal: number }) {
  const size = 130;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(value / goal, 1);
  const progress = pct * circumference;
  const remaining = Math.max(goal - value, 0);
  const color = pct > 1 ? "#ef4444" : pct >= 0.7 ? "#10b981" : "#3b82f6";

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={`${progress} ${circumference - progress}`}
          strokeLinecap="round"
        />
      </Svg>
      <View className="absolute items-center">
        <Text className="text-2xl font-bold text-gray-900">{Math.round(value)}</Text>
        <Text className="text-xs text-gray-400">з {goal} ккал</Text>
      </View>
    </View>
  );
}

// ---- Water tracker ----
function WaterTracker({ glasses, onAdd }: { glasses: number; onAdd: () => void }) {
  const goal = 8;
  return (
    <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center gap-2">
          <Text className="text-lg">💧</Text>
          <Text className="text-sm font-semibold text-gray-700">Вода</Text>
        </View>
        <Text className="text-xs text-gray-400">{glasses}/{goal} склянок</Text>
      </View>
      <View className="flex-row gap-1.5 mb-2">
        {Array.from({ length: goal }).map((_, i) => (
          <View
            key={i}
            className={`flex-1 h-2.5 rounded-full ${i < glasses ? "bg-blue-400" : "bg-gray-100"}`}
          />
        ))}
      </View>
      <TouchableOpacity
        onPress={onAdd}
        className="bg-blue-50 rounded-xl py-2 items-center"
        activeOpacity={0.7}
      >
        <Text className="text-sm text-blue-600 font-medium">+ Склянка води</Text>
      </TouchableOpacity>
    </View>
  );
}

// ---- Meal Card ----
function MealCard({ meal, onPress }: { meal: any; onPress: () => void }) {
  const scoreColor = !meal.health_score
    ? "bg-gray-100 border-gray-200"
    : meal.health_score >= 7
    ? "bg-emerald-50 border-emerald-200"
    : meal.health_score >= 4
    ? "bg-amber-50 border-amber-200"
    : "bg-red-50 border-red-200";

  const scoreText = !meal.health_score
    ? "text-gray-500"
    : meal.health_score >= 7
    ? "text-emerald-700"
    : meal.health_score >= 4
    ? "text-amber-700"
    : "text-red-700";

  const mealLabel =
    meal.meal_type === "breakfast"
      ? "Сніданок"
      : meal.meal_type === "lunch"
      ? "Обід"
      : meal.meal_type === "dinner"
      ? "Вечеря"
      : "Перекус";

  const mealIcon =
    meal.meal_type === "breakfast"
      ? "🌅"
      : meal.meal_type === "lunch"
      ? "☀️"
      : meal.meal_type === "dinner"
      ? "🌙"
      : "🍎";

  const mealTime = meal.created_at
    ? new Date(meal.created_at).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="bg-white rounded-2xl p-4 mb-3"
      style={{
        elevation: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      }}
    >
      <View className="flex-row gap-3">
        {meal.photo_url ? (
          <Image source={{ uri: meal.photo_url }} className="w-20 h-20 rounded-xl" />
        ) : (
          <View className="w-20 h-20 rounded-xl bg-gray-100 items-center justify-center">
            <Text className="text-3xl">{mealIcon}</Text>
          </View>
        )}
        <View className="flex-1">
          <View className="flex-row items-center gap-2 mb-1">
            <Text className="text-xs text-gray-400 uppercase tracking-wide">{mealLabel}</Text>
            {mealTime && <Text className="text-xs text-gray-300">{mealTime}</Text>}
          </View>
          {meal.recognition_status === "done" && meal.calories ? (
            <View>
              <Text className="text-lg font-bold text-gray-900">{Math.round(meal.calories)} ккал</Text>
              <View className="flex-row gap-3 mt-1">
                <Text className="text-sm text-emerald-600 font-medium">
                  Б {meal.proteins_g?.toFixed(0)}г
                </Text>
                <Text className="text-sm text-amber-600 font-medium">
                  Ж {meal.fats_g?.toFixed(0)}г
                </Text>
                <Text className="text-sm text-violet-600 font-medium">
                  В {meal.carbs_g?.toFixed(0)}г
                </Text>
              </View>
            </View>
          ) : meal.recognition_status === "processing" || meal.recognition_status === "pending" ? (
            <View className="flex-row items-center gap-2">
              <View className="w-2 h-2 rounded-full bg-blue-400" />
              <Text className="text-sm text-blue-500 font-medium">AI аналізує...</Text>
            </View>
          ) : (
            <Text className="text-sm text-gray-400">Дані відсутні</Text>
          )}
        </View>
        {meal.health_score && (
          <View className={`${scoreColor} rounded-xl px-2.5 py-1 h-fit border`}>
            <Text className={`text-sm font-bold ${scoreText}`}>{meal.health_score}</Text>
          </View>
        )}
      </View>

      {/* Food items if recognized */}
      {meal.food_items && meal.food_items.length > 0 && (
        <View className="mt-3 pt-3 border-t border-gray-50">
          <View className="flex-row flex-wrap gap-1.5">
            {meal.food_items.slice(0, 4).map((item: any, i: number) => (
              <View key={i} className="bg-gray-50 rounded-lg px-2.5 py-1">
                <Text className="text-xs text-gray-600">{item.name}</Text>
              </View>
            ))}
            {meal.food_items.length > 4 && (
              <View className="bg-gray-50 rounded-lg px-2.5 py-1">
                <Text className="text-xs text-gray-400">+{meal.food_items.length - 4}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {meal.ai_comment && (
        <View className="mt-3 bg-blue-50 rounded-xl p-3">
          <Text className="text-sm text-blue-700 italic">{meal.ai_comment}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ---- Expanded Meal Detail Modal (inline) ----
function MealDetailExpanded({ meal, onClose }: { meal: any; onClose: () => void }) {
  const mealLabel =
    meal.meal_type === "breakfast"
      ? "Сніданок"
      : meal.meal_type === "lunch"
      ? "Обід"
      : meal.meal_type === "dinner"
      ? "Вечеря"
      : "Перекус";

  return (
    <View className="bg-white rounded-2xl p-5 mb-3 border-2 border-blue-200">
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-lg font-bold text-gray-900">{mealLabel}</Text>
        <TouchableOpacity onPress={onClose}>
          <Text className="text-sm text-blue-500 font-medium">Закрити ✕</Text>
        </TouchableOpacity>
      </View>

      {meal.photo_url && (
        <Image source={{ uri: meal.photo_url }} className="w-full h-48 rounded-xl mb-4" resizeMode="cover" />
      )}

      {/* Macros detailed */}
      {meal.calories && (
        <View className="bg-gray-50 rounded-xl p-4 mb-4">
          <Text className="text-3xl font-bold text-gray-900 text-center mb-3">
            {Math.round(meal.calories)} ккал
          </Text>
          <View className="flex-row justify-around">
            <View className="items-center">
              <View className="w-10 h-10 rounded-full bg-emerald-100 items-center justify-center mb-1">
                <Text className="text-base font-bold text-emerald-700">{meal.proteins_g?.toFixed(0)}</Text>
              </View>
              <Text className="text-xs text-gray-500">Білки, г</Text>
            </View>
            <View className="items-center">
              <View className="w-10 h-10 rounded-full bg-amber-100 items-center justify-center mb-1">
                <Text className="text-base font-bold text-amber-700">{meal.fats_g?.toFixed(0)}</Text>
              </View>
              <Text className="text-xs text-gray-500">Жири, г</Text>
            </View>
            <View className="items-center">
              <View className="w-10 h-10 rounded-full bg-violet-100 items-center justify-center mb-1">
                <Text className="text-base font-bold text-violet-700">{meal.carbs_g?.toFixed(0)}</Text>
              </View>
              <Text className="text-xs text-gray-500">Вугл., г</Text>
            </View>
          </View>
        </View>
      )}

      {/* Food items detailed */}
      {meal.food_items && meal.food_items.length > 0 && (
        <View className="mb-4">
          <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Продукти</Text>
          {meal.food_items.map((item: any, i: number) => (
            <View key={i} className="flex-row items-center py-2 border-b border-gray-50">
              <Text className="flex-1 text-sm text-gray-700">{item.name}</Text>
              {item.amount && <Text className="text-xs text-gray-400 mr-3">{item.amount}</Text>}
              {item.calories && <Text className="text-sm font-medium text-gray-900">{Math.round(item.calories)} ккал</Text>}
            </View>
          ))}
        </View>
      )}

      {meal.ai_comment && (
        <View className="bg-blue-50 rounded-xl p-3">
          <Text className="text-xs font-semibold text-blue-700 mb-1">🩺 Коментар AI</Text>
          <Text className="text-sm text-blue-700">{meal.ai_comment}</Text>
        </View>
      )}
    </View>
  );
}

// ---- Main Screen ----
export default function Nutrition() {
  const queryClient = useQueryClient();
  const [expandedMealId, setExpandedMealId] = useState<string | null>(null);
  const [waterGlasses, setWaterGlasses] = useState(0);

  const {
    data: todayData,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ["meals-today"],
    queryFn: () => api.get("/meals/today").then((r) => r.data),
    refetchInterval: 10_000,
  });

  const addMealMutation = useMutation({
    mutationFn: (formData: FormData) =>
      api.post("/meals/", formData, { headers: { "Content-Type": "multipart/form-data" } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["meals-today"] }),
  });

  const pickImage = async (meal_type: string) => {
    Alert.alert("Фото їжі", "Як додати?", [
      {
        text: "Камера",
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) {
            Alert.alert("Потрібен дозвіл", "Дозволь доступ до камери в налаштуваннях");
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
          });
          if (!result.canceled && result.assets[0]) {
            const formData = new FormData();
            formData.append("file", {
              uri: result.assets[0].uri,
              type: "image/jpeg",
              name: "meal.jpg",
            } as any);
            formData.append("meal_type", meal_type);
            addMealMutation.mutate(formData);
          }
        },
      },
      {
        text: "Галерея",
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
          });
          if (!result.canceled && result.assets[0]) {
            const formData = new FormData();
            formData.append("file", {
              uri: result.assets[0].uri,
              type: "image/jpeg",
              name: "meal.jpg",
            } as any);
            formData.append("meal_type", meal_type);
            addMealMutation.mutate(formData);
          }
        },
      },
      { text: "Скасувати", style: "cancel" },
    ]);
  };

  const meals = todayData?.meals || [];
  const totals = todayData?.totals;

  // Daily goals (can be personalized later)
  const calorieGoal = 2200;
  const proteinGoal = 120;
  const fatGoal = 80;
  const carbGoal = 300;

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <Text className="text-2xl font-bold text-gray-900 mb-1">Харчування</Text>
        <Text className="text-sm text-gray-400 mb-5">Сьогодні</Text>

        {/* Calorie + Macro Dashboard */}
        <LinearGradient
          colors={["#eff6ff", "#dbeafe", "#f0f9ff"]}
          className="rounded-3xl p-5 mb-5"
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View className="items-center mb-5">
            <CalorieRing value={totals?.calories || 0} goal={calorieGoal} />
            {totals && totals.calories > 0 && (
              <Text className="text-xs text-gray-400 mt-2">
                Залишилось {Math.max(calorieGoal - totals.calories, 0)} ккал
              </Text>
            )}
          </View>
          <View className="flex-row">
            <MacroRing
              label="Білки"
              emoji="🥩"
              value={totals?.proteins_g || 0}
              goal={proteinGoal}
              color="#10b981"
            />
            <MacroRing
              label="Жири"
              emoji="🥑"
              value={totals?.fats_g || 0}
              goal={fatGoal}
              color="#f59e0b"
            />
            <MacroRing
              label="Вуглев."
              emoji="🍞"
              value={totals?.carbs_g || 0}
              goal={carbGoal}
              color="#8b5cf6"
            />
          </View>
        </LinearGradient>

        {/* Water tracker */}
        <WaterTracker glasses={waterGlasses} onAdd={() => setWaterGlasses((g) => Math.min(g + 1, 12))} />

        {/* Add meal buttons */}
        <View className="flex-row gap-2.5 mb-5">
          {[
            { type: "breakfast", emoji: "🌅", label: "Сніданок", bg: ["#fefce8", "#fef9c3"] as [string, string] },
            { type: "lunch", emoji: "☀️", label: "Обід", bg: ["#fff7ed", "#ffedd5"] as [string, string] },
            { type: "dinner", emoji: "🌙", label: "Вечеря", bg: ["#eff6ff", "#dbeafe"] as [string, string] },
            { type: "snack", emoji: "🍎", label: "Перекус", bg: ["#f0fdf4", "#dcfce7"] as [string, string] },
          ].map((item) => (
            <TouchableOpacity
              key={item.type}
              className="flex-1"
              onPress={() => pickImage(item.type)}
              activeOpacity={0.7}
            >
              <LinearGradient colors={item.bg} className="rounded-2xl py-3.5 items-center">
                <Text className="text-xl mb-0.5">{item.emoji}</Text>
                <Text className="text-xs text-gray-600 font-medium">{item.label}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        {/* Meals list */}
        {meals.length === 0 ? (
          <View className="items-center py-16">
            <View className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center mb-4">
              <Text className="text-4xl">📸</Text>
            </View>
            <Text className="text-lg font-semibold text-gray-700 mb-1">Немає прийомів їжі</Text>
            <Text className="text-sm text-gray-400 text-center px-8">
              Зфотографуй свою їжу і AI розпізнає калорії та нутрієнти
            </Text>
          </View>
        ) : (
          <>
            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Прийоми їжі ({meals.length})
            </Text>
            {meals.map((meal: any) =>
              expandedMealId === meal.id ? (
                <MealDetailExpanded
                  key={meal.id}
                  meal={meal}
                  onClose={() => setExpandedMealId(null)}
                />
              ) : (
                <MealCard
                  key={meal.id}
                  meal={meal}
                  onPress={() => setExpandedMealId(meal.id)}
                />
              )
            )}
          </>
        )}

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
