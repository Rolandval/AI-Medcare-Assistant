import {
  ScrollView, View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useRouter } from "expo-router";
import { api } from "@/services/api";

const METRICS = [
  { type: "blood_pressure_systolic", label: "Тиск (верхній)", unit: "мм рт.ст.", emoji: "🫀", placeholder: "120" },
  { type: "blood_pressure_diastolic", label: "Тиск (нижній)", unit: "мм рт.ст.", emoji: "🫀", placeholder: "80" },
  { type: "heart_rate", label: "Пульс", unit: "уд/хв", emoji: "❤️", placeholder: "72" },
  { type: "weight", label: "Вага", unit: "кг", emoji: "⚖️", placeholder: "72.5" },
  { type: "blood_sugar", label: "Цукор в крові", unit: "ммоль/л", emoji: "🩸", placeholder: "5.2" },
  { type: "oxygen_saturation", label: "SpO2", unit: "%", emoji: "💨", placeholder: "98" },
  { type: "temperature", label: "Температура", unit: "°C", emoji: "🌡️", placeholder: "36.6" },
];

export default function AddMetric() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const setValue = (type: string, val: string) => {
    setValues((prev) => ({ ...prev, [type]: val }));
  };

  const handleSave = async () => {
    const entries = Object.entries(values).filter(([, v]) => v.trim() !== "");
    if (entries.length === 0) {
      Alert.alert("", "Введи хоча б один показник");
      return;
    }

    setSaving(true);
    try {
      const promises = entries.map(([type, value]) => {
        const metric = METRICS.find((m) => m.type === type);
        return api.post("/health/metrics", {
          metric_type: type,
          value: parseFloat(value),
          unit: metric?.unit || "",
          source: "manual",
        });
      });
      await Promise.all(promises);
      queryClient.invalidateQueries({ queryKey: ["metrics-latest"] });
      queryClient.invalidateQueries({ queryKey: ["metrics-history"] });
      Alert.alert("✅", `Збережено ${entries.length} показник(ів)`);
      router.back();
    } catch (e: any) {
      Alert.alert("Помилка", e.response?.data?.detail || "Не вдалось зберегти");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-blue-500 text-base">← Назад</Text>
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">Додати показники</Text>
          <View style={{ width: 60 }} />
        </View>

        <Text className="text-sm text-gray-500 mb-4">
          Заповни показники які маєш. Можна вводити не всі — збережуться тільки заповнені.
        </Text>

        {/* Blood pressure group */}
        <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
          <Text className="text-base font-semibold text-gray-700 mb-3">🫀 Артеріальний тиск</Text>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Text className="text-sm text-gray-500 mb-1">Верхній (систолічний)</Text>
              <TextInput
                className="border border-gray-200 rounded-xl px-4 py-3 text-base text-center"
                value={values.blood_pressure_systolic || ""}
                onChangeText={(v) => setValue("blood_pressure_systolic", v)}
                placeholder="120"
                keyboardType="decimal-pad"
              />
            </View>
            <View className="flex-1">
              <Text className="text-sm text-gray-500 mb-1">Нижній (діастолічний)</Text>
              <TextInput
                className="border border-gray-200 rounded-xl px-4 py-3 text-base text-center"
                value={values.blood_pressure_diastolic || ""}
                onChangeText={(v) => setValue("blood_pressure_diastolic", v)}
                placeholder="80"
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        </View>

        {/* Other metrics */}
        {METRICS.filter((m) => !m.type.startsWith("blood_pressure")).map((metric) => (
          <View key={metric.type} className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
            <View className="flex-row items-center gap-2 mb-2">
              <Text className="text-xl">{metric.emoji}</Text>
              <Text className="text-base font-semibold text-gray-700">{metric.label}</Text>
              <Text className="text-sm text-gray-400">({metric.unit})</Text>
            </View>
            <TextInput
              className="border border-gray-200 rounded-xl px-4 py-3 text-base"
              value={values[metric.type] || ""}
              onChangeText={(v) => setValue(metric.type, v)}
              placeholder={metric.placeholder}
              keyboardType="decimal-pad"
            />
          </View>
        ))}

        {/* Save */}
        <TouchableOpacity
          className="bg-blue-500 rounded-2xl py-4 items-center mt-2 mb-8"
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold text-lg">💾 Зберегти показники</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
