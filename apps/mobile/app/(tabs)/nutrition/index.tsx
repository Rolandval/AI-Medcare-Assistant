import { useState } from "react";
import { ScrollView, View, Text, TouchableOpacity, Image, Alert, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { api } from "@/services/api";

function MealCard({ meal }: { meal: any }) {
  const scoreColor = !meal.health_score ? "bg-gray-100" :
    meal.health_score >= 7 ? "bg-green-100" :
    meal.health_score >= 4 ? "bg-amber-100" : "bg-red-100";

  return (
    <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
      <View className="flex-row gap-3">
        {meal.photo_url && (
          <Image source={{ uri: meal.photo_url }} className="w-20 h-20 rounded-xl" />
        )}
        <View className="flex-1">
          <Text className="text-sm text-gray-500 mb-1">
            {meal.meal_type === "breakfast" ? "🌅 Сніданок" :
             meal.meal_type === "lunch" ? "☀️ Обід" :
             meal.meal_type === "dinner" ? "🌙 Вечеря" : "🍎 Перекус"}
          </Text>
          {meal.recognition_status === "done" && meal.calories ? (
            <View>
              <Text className="text-base font-semibold text-gray-900">{Math.round(meal.calories)} ккал</Text>
              <View className="flex-row gap-3 mt-1">
                <Text className="text-sm text-gray-500">Б: {meal.proteins_g?.toFixed(0)}г</Text>
                <Text className="text-sm text-gray-500">Ж: {meal.fats_g?.toFixed(0)}г</Text>
                <Text className="text-sm text-gray-500">В: {meal.carbs_g?.toFixed(0)}г</Text>
              </View>
            </View>
          ) : meal.recognition_status === "processing" || meal.recognition_status === "pending" ? (
            <Text className="text-sm text-blue-500">⏳ Аналізую...</Text>
          ) : (
            <Text className="text-sm text-gray-500">Дані відсутні</Text>
          )}
          {meal.ai_comment && (
            <Text className="text-sm text-gray-500 mt-1 italic">{meal.ai_comment}</Text>
          )}
        </View>
        {meal.health_score && (
          <View className={`${scoreColor} rounded-xl px-3 py-1 h-fit`}>
            <Text className="text-sm font-bold text-gray-700">{meal.health_score}/10</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function Nutrition() {
  const queryClient = useQueryClient();

  const { data: todayData, isRefetching, refetch } = useQuery({
    queryKey: ["meals-today"],
    queryFn: () => api.get("/meals/today").then((r) => r.data),
    refetchInterval: 10_000, // Auto-refresh while processing
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
        <Text className="text-2xl font-bold text-gray-900 mb-2">🍽 Харчування</Text>
        <Text className="text-base text-gray-500 mb-6">Сьогодні</Text>

        {/* Totals */}
        {totals && (
          <View className="bg-blue-50 rounded-3xl p-5 mb-6">
            <Text className="text-base font-semibold text-blue-800 mb-3">Всього за день</Text>
            <View className="flex-row justify-around">
              <View className="items-center">
                <Text className="text-2xl font-bold text-blue-900">{totals.calories}</Text>
                <Text className="text-sm text-gray-500">ккал</Text>
              </View>
              <View className="items-center">
                <Text className="text-xl font-bold text-green-700">{totals.proteins_g}</Text>
                <Text className="text-sm text-gray-500">Білки г</Text>
              </View>
              <View className="items-center">
                <Text className="text-xl font-bold text-amber-600">{totals.fats_g}</Text>
                <Text className="text-sm text-gray-500">Жири г</Text>
              </View>
              <View className="items-center">
                <Text className="text-xl font-bold text-purple-600">{totals.carbs_g}</Text>
                <Text className="text-sm text-gray-500">Вуглеводи г</Text>
              </View>
            </View>
          </View>
        )}

        {/* Add meal buttons */}
        <View className="flex-row gap-3 mb-6">
          {[
            { type: "breakfast", emoji: "🌅", label: "Сніданок" },
            { type: "lunch", emoji: "☀️", label: "Обід" },
            { type: "dinner", emoji: "🌙", label: "Вечеря" },
            { type: "snack", emoji: "🍎", label: "Перекус" },
          ].map((item) => (
            <TouchableOpacity
              key={item.type}
              className="flex-1 bg-white border-2 border-dashed border-blue-300 rounded-2xl py-3 items-center"
              onPress={() => pickImage(item.type)}
            >
              <Text className="text-xl">{item.emoji}</Text>
              <Text className="text-xs text-blue-500 mt-1">{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Meals list */}
        {meals.length === 0 ? (
          <View className="items-center py-12">
            <Text className="text-4xl mb-3">📸</Text>
            <Text className="text-lg text-gray-500 text-center">
              Зафотографуй свою їжу{"\n"}і AI розпізнає калорії
            </Text>
          </View>
        ) : (
          meals.map((meal: any) => <MealCard key={meal.id} meal={meal} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
