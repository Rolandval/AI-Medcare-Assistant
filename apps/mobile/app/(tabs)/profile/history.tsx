import {
  ScrollView, View, Text, TouchableOpacity, ActivityIndicator, Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useRouter } from "expo-router";
import { api } from "@/services/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const METRIC_TYPES = [
  { key: "weight", label: "Вага", unit: "кг", emoji: "⚖️", color: "#3b82f6" },
  { key: "heart_rate", label: "Пульс", unit: "уд/хв", emoji: "❤️", color: "#ef4444" },
  { key: "blood_pressure_systolic", label: "Тиск (сист)", unit: "мм", emoji: "🫀", color: "#f59e0b" },
  { key: "blood_pressure_diastolic", label: "Тиск (діаст)", unit: "мм", emoji: "🫀", color: "#f97316" },
  { key: "blood_sugar", label: "Цукор", unit: "ммоль/л", emoji: "🩸", color: "#8b5cf6" },
  { key: "oxygen_saturation", label: "SpO2", unit: "%", emoji: "💨", color: "#06b6d4" },
  { key: "temperature", label: "Температура", unit: "°C", emoji: "🌡️", color: "#10b981" },
];

function SimpleChart({ data, color }: { data: { value: number; date: string }[]; color: string }) {
  if (data.length < 2) return null;

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const chartWidth = SCREEN_WIDTH - 64;
  const chartHeight = 150;
  const padding = 20;

  const points = data.map((d, i) => ({
    x: padding + (i / (data.length - 1)) * (chartWidth - padding * 2),
    y: padding + (1 - (d.value - min) / range) * (chartHeight - padding * 2),
  }));

  return (
    <View style={{ width: chartWidth, height: chartHeight }} className="mb-2">
      {/* SVG-like chart using Views */}
      <View style={{ position: "absolute", top: padding, left: padding, right: padding, bottom: padding }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
          <View
            key={pct}
            style={{
              position: "absolute",
              top: `${pct * 100}%`,
              left: 0,
              right: 0,
              height: 1,
              backgroundColor: "#e5e7eb",
            }}
          />
        ))}
      </View>

      {/* Data points */}
      {points.map((p, i) => (
        <View key={i}>
          {/* Line to next point */}
          {i < points.length - 1 && (
            <View
              style={{
                position: "absolute",
                left: p.x,
                top: p.y,
                width: Math.sqrt(
                  Math.pow(points[i + 1].x - p.x, 2) +
                  Math.pow(points[i + 1].y - p.y, 2)
                ),
                height: 2,
                backgroundColor: color,
                transformOrigin: "left center",
                transform: [
                  {
                    rotate: `${Math.atan2(
                      points[i + 1].y - p.y,
                      points[i + 1].x - p.x
                    )}rad`,
                  },
                ],
              }}
            />
          )}
          {/* Point dot */}
          <View
            style={{
              position: "absolute",
              left: p.x - 4,
              top: p.y - 4,
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: color,
            }}
          />
        </View>
      ))}

      {/* Min/Max labels */}
      <Text
        style={{ position: "absolute", right: 0, top: padding - 8 }}
        className="text-xs text-gray-400"
      >
        {max.toFixed(1)}
      </Text>
      <Text
        style={{ position: "absolute", right: 0, bottom: padding - 8 }}
        className="text-xs text-gray-400"
      >
        {min.toFixed(1)}
      </Text>
    </View>
  );
}

function MetricHistoryCard({
  metricType,
  label,
  unit,
  emoji,
  color,
}: {
  metricType: string;
  label: string;
  unit: string;
  emoji: string;
  color: string;
}) {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["metrics-history", metricType],
    queryFn: () =>
      api.get("/health/metrics", { params: { metric_type: metricType, limit: 30 } }).then((r) => r.data),
  });

  const chartData = (metrics || [])
    .map((m: any) => ({
      value: m.value,
      date: new Date(m.recorded_at).toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit" }),
    }))
    .reverse();

  const latest = chartData[chartData.length - 1];
  const prev = chartData[chartData.length - 2];
  const trend =
    latest && prev
      ? latest.value > prev.value
        ? "↑"
        : latest.value < prev.value
        ? "↓"
        : "→"
      : "";
  const trendColor =
    trend === "↑" ? "text-red-500" : trend === "↓" ? "text-green-500" : "text-gray-400";

  return (
    <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center gap-2">
          <Text className="text-xl">{emoji}</Text>
          <Text className="text-base font-semibold text-gray-700">{label}</Text>
        </View>
        {latest && (
          <View className="flex-row items-center gap-1">
            <Text className="text-lg font-bold" style={{ color }}>
              {latest.value}
            </Text>
            <Text className="text-sm text-gray-500">{unit}</Text>
            <Text className={`text-sm font-bold ${trendColor}`}>{trend}</Text>
          </View>
        )}
      </View>

      {isLoading && <ActivityIndicator size="small" color={color} />}

      {chartData.length >= 2 && <SimpleChart data={chartData} color={color} />}

      {chartData.length > 0 && (
        <View className="flex-row justify-between mt-1">
          <Text className="text-xs text-gray-400">{chartData[0]?.date}</Text>
          <Text className="text-xs text-gray-400">{chartData[chartData.length - 1]?.date}</Text>
        </View>
      )}

      {chartData.length === 0 && !isLoading && (
        <Text className="text-sm text-gray-400 text-center py-4">Даних поки немає</Text>
      )}
    </View>
  );
}

export default function HealthHistory() {
  const router = useRouter();
  const [showAll, setShowAll] = useState(false);

  const visibleMetrics = showAll ? METRIC_TYPES : METRIC_TYPES.slice(0, 4);

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-blue-500 text-base">← Назад</Text>
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">Історія здоров'я</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Metric charts */}
        {visibleMetrics.map((m) => (
          <MetricHistoryCard
            key={m.key}
            metricType={m.key}
            label={m.label}
            unit={m.unit}
            emoji={m.emoji}
            color={m.color}
          />
        ))}

        {!showAll && METRIC_TYPES.length > 4 && (
          <TouchableOpacity
            className="border-2 border-dashed border-blue-300 rounded-2xl py-3 items-center mb-4"
            onPress={() => setShowAll(true)}
          >
            <Text className="text-blue-500 font-semibold">
              Показати всі ({METRIC_TYPES.length - 4} ще)
            </Text>
          </TouchableOpacity>
        )}

        {/* Surveys section */}
        <SurveyHistory />
      </ScrollView>
    </SafeAreaView>
  );
}

function SurveyHistory() {
  const { data: surveys, isLoading } = useQuery({
    queryKey: ["surveys-history"],
    queryFn: () => api.get("/health/surveys", { params: { limit: 14 } }).then((r) => r.data),
  });

  if (isLoading) return <ActivityIndicator size="small" color="#3b82f6" />;
  if (!surveys?.length) return null;

  return (
    <View className="mt-4">
      <Text className="text-lg font-bold text-gray-900 mb-3">📋 Останні опитування</Text>
      {surveys.map((s: any) => {
        const date = new Date(s.survey_date || s.created_at).toLocaleDateString("uk-UA", {
          day: "numeric",
          month: "short",
        });
        const moodEmoji =
          s.mood === "great" ? "😊" :
          s.mood === "good" ? "🙂" :
          s.mood === "neutral" ? "😐" :
          s.mood === "bad" ? "😟" :
          s.mood === "terrible" ? "😢" : "📝";

        return (
          <View key={s.id} className="bg-white rounded-2xl p-4 mb-2 border border-gray-100">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Text className="text-xl">{moodEmoji}</Text>
                <View>
                  <Text className="text-base font-semibold text-gray-700">
                    {s.survey_type === "morning" ? "Ранок" : "Вечір"} — {date}
                  </Text>
                  <View className="flex-row gap-3 mt-1">
                    {s.wellbeing_score && (
                      <Text className="text-sm text-gray-500">
                        Самопочуття: {s.wellbeing_score}/10
                      </Text>
                    )}
                    {s.energy_level && (
                      <Text className="text-sm text-gray-500">
                        Енергія: {s.energy_level}/10
                      </Text>
                    )}
                  </View>
                </View>
              </View>
              {s.sleep_hours && (
                <View className="items-center">
                  <Text className="text-sm text-gray-400">Сон</Text>
                  <Text className="text-base font-bold text-blue-500">{s.sleep_hours}г</Text>
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}
