import { useState } from "react";
import { ScrollView, View, Text, TouchableOpacity, Image, Alert, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "@/services/api";

function MacroBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <View className="flex-1 items-center">
      <Text className="text-xl font-bold text-gray-900">{value}</Text>
      <View className="w-full h-1.5 bg-gray-100 rounded-full mt-1.5 mb-1">
        <View className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </View>
      <Text className="text-xs text-gray-400">{label}</Text>
    </View>
  );
}

function MealCard({ meal }: { meal: any }) {
  const scoreColor = !meal.health_score ? "bg-gray-100 border-gray-200"
    : meal.health_score >= 7 ? "bg-emerald-50 border-emerald-200"
    : meal.health_score >= 4 ? "bg-amber-50 border-amber-200"
    : "bg-red-50 border-red-200";

  const scoreText = !meal.health_score ? "text-gray-500"
    : meal.health_score >= 7 ? "text-emerald-700"
    : meal.health_score >= 4 ? "text-amber-700"
    : "text-red-700";

  const mealLabel = meal.meal_type === "breakfast" ? "Сніданок"
    : meal.meal_type === "lunch" ? "Обід"
    : meal.meal_type === "dinner" ? "Вечеря" : "Перекус";

  const mealIcon = meal.meal_type === "breakfast" ? "🌅"
    : meal.meal_type === "lunch" ? "☀️"
    : meal.meal_type === "dinner" ? "🌙" : "🍎";

  return (
    <View
      className="bg-white rounded-2xl p-4 mb-3"
      style={{ elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 }}
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
          </View>
          {meal.recognition_status === "done" && meal.calories ? (
            <View>
              <Text className="text-lg font-bold text-gray-900">{Math.round(meal.calories)} ккал</Text>
              <View className="flex-row gap-3 mt-1">
                <Text className="text-sm text-emerald-600 font-medium">Б {meal.proteins_g?.toFixed(0)}г</Text>
                <Text className="text-sm text-amber-600 font-medium">Ж {meal.fats_g?.toFixed(0)}г</Text>
                <Text className="text-sm text-violet-600 font-medium">В {meal.carbs_g?.toFixed(0)}г</Text>
              </View>
            </View>
          ) : meal.recognition_status === "processing" || meal.recognition_status === "pending" ? (
            <View className="flex-row items-center gap-2">
              <View className="w-2 h-2 rounded-full bg-blue-400" />
              <Text className="text-sm text-blue-500 font-medium">Аналізую...</Text>
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
      {meal.ai_comment && (
        <View className="mt-3 bg-blue-50 rounded-xl p-3">
          <Text className="text-sm text-blue-700 italic">{meal.ai_comment}</Text>
        </View>
      )}
    </View>
  );
}

export default function Nutrition() {
  const queryClient = useQueryClient();

  const { data: todayData, isRefetching, refetch } = useQuery({
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
      const asset = result.assets[0];
      const formData = new FormData();
      formData.append("file", { uri: asset.uri, type: "image/jpeg", name: "meal.jpg" } as any);
      formData.append("meal_type", meal_type);
      addMealMutation.mutate(formData);
    }
  };

  const meals = todayData?.meals || [];
  const totals = todayData?.totals;

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <Text className="text-2xl font-bold text-gray-900 mb-1">Харчування</Text>
        <Text className="text-sm text-gray-400 mb-5">Сьогодні</Text>

        {/* Totals */}
        {totals && (
          <LinearGradient
            colors={["#eff6ff", "#dbeafe"]}
            className="rounded-3xl p-5 mb-5"
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View className="items-center mb-4">
              <Text className="text-4xl font-bold text-blue-900">{totals.calories}</Text>
              <Text className="text-sm text-blue-400">ккал</Text>
            </View>
            <View className="flex-row gap-4">
              <MacroBar label="Білки, г" value={totals.proteins_g} max={120} color="bg-emerald-500" />
              <MacroBar label="Жири, г" value={totals.fats_g} max={80} color="bg-amber-500" />
              <MacroBar label="Вугл., г" value={totals.carbs_g} max={300} color="bg-violet-500" />
            </View>
          </LinearGradient>
        )}

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
              <LinearGradient
                colors={item.bg}
                className="rounded-2xl py-3.5 items-center"
              >
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
          meals.map((meal: any) => <MealCard key={meal.id} meal={meal} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
