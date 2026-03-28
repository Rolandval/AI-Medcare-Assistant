import { ScrollView, View, Text, TouchableOpacity, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from "react-native-svg";
import { api } from "@/services/api";
import { useAuthStore } from "@/store/authStore";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "Доброї ночі";
  if (h < 12) return "Доброго ранку";
  if (h < 18) return "Доброго дня";
  return "Доброго вечора";
}

function ScoreRing({ score, size = 80 }: { score: number | null; size?: number }) {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = score ? (score / 10) * circumference : 0;
  const color = !score ? "#d1d5db" : score >= 7 ? "#10b981" : score >= 4 ? "#f59e0b" : "#ef4444";

  return (
    <View className="items-center justify-center" style={{ width: size, height: size }}>
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
        <Text className="text-2xl font-bold text-gray-900">
          {score ?? "—"}
        </Text>
        <Text className="text-xs text-gray-400">/10</Text>
      </View>
    </View>
  );
}

function HealthStatusCard({ score }: { score: number | null }) {
  const colors: [string, string] = !score
    ? ["#f9fafb", "#f3f4f6"]
    : score >= 7
    ? ["#ecfdf5", "#d1fae5"]
    : score >= 4
    ? ["#fffbeb", "#fef3c7"]
    : ["#fef2f2", "#fee2e2"];

  const label = !score ? "Даних немає" : score >= 7 ? "Стан хороший" : score >= 4 ? "Є що покращити" : "Потрібна увага";
  const textColor = !score ? "text-gray-400" : score >= 7 ? "text-emerald-600" : score >= 4 ? "text-amber-600" : "text-red-600";

  return (
    <LinearGradient colors={colors} className="rounded-3xl p-5 mb-4" start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <View className="flex-row items-center gap-4">
        <ScoreRing score={score} />
        <View className="flex-1">
          <Text className={`text-xl font-bold ${textColor}`}>{label}</Text>
          <Text className="text-sm text-gray-500 mt-1">
            {score ? "На основі останніх показників" : "Додай показники для оцінки"}
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const METRIC_CONFIG: Record<string, { icon: string; bg: string; accent: string }> = {
  pressure: { icon: "🫀", bg: "bg-rose-50", accent: "text-rose-600" },
  pulse: { icon: "❤️", bg: "bg-red-50", accent: "text-red-500" },
  weight: { icon: "⚖️", bg: "bg-violet-50", accent: "text-violet-600" },
  spo2: { icon: "💨", bg: "bg-sky-50", accent: "text-sky-600" },
};

function MetricCard({
  type,
  label,
  value,
  unit,
}: {
  type: string;
  label: string;
  value: string | null;
  unit: string;
}) {
  const cfg = METRIC_CONFIG[type] || METRIC_CONFIG.pressure;

  return (
    <View
      className={`flex-1 ${cfg.bg} rounded-2xl p-4`}
      style={{ elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 }}
    >
      <View className="flex-row items-center gap-2 mb-2">
        <Text className="text-lg">{cfg.icon}</Text>
        <Text className="text-sm text-gray-500">{label}</Text>
      </View>
      <Text className={`text-xl font-bold ${value ? cfg.accent : "text-gray-300"}`}>
        {value || "—"}
        {value && <Text className="text-sm font-normal text-gray-400"> {unit}</Text>}
      </Text>
    </View>
  );
}

function RecommendationCard({ rec }: { rec: any }) {
  if (!rec?.content) return null;
  const content = rec.content;

  return (
    <View
      className="bg-white rounded-3xl p-5 mb-4 border border-blue-100"
      style={{ elevation: 2, shadowColor: "#3b82f6", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 }}
    >
      <View className="flex-row items-center gap-2 mb-3">
        <View className="w-8 h-8 rounded-xl bg-blue-50 items-center justify-center">
          <Text className="text-base">💡</Text>
        </View>
        <Text className="text-lg font-bold text-gray-900">Рекомендації AI</Text>
      </View>

      {content.summary && (
        <Text className="text-base text-gray-600 mb-3 leading-6">{content.summary}</Text>
      )}

      {content.today_actions?.length > 0 && (
        <View className="bg-emerald-50 rounded-2xl p-4 mb-3">
          <Text className="text-sm font-semibold text-emerald-700 mb-2">Сьогодні:</Text>
          {content.today_actions.map((action: string, i: number) => (
            <View key={i} className="flex-row items-start gap-2 mb-1.5">
              <View className="w-5 h-5 rounded-full bg-emerald-100 items-center justify-center mt-0.5">
                <Text className="text-xs text-emerald-600">✓</Text>
              </View>
              <Text className="text-base text-gray-700 flex-1">{action}</Text>
            </View>
          ))}
        </View>
      )}

      {content.positive_note && (
        <View className="bg-amber-50 rounded-2xl p-3">
          <Text className="text-base text-amber-800 italic">"{content.positive_note}"</Text>
        </View>
      )}
    </View>
  );
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const router = useRouter();

  const { data: metrics, refetch: refetchMetrics, isRefetching } = useQuery({
    queryKey: ["metrics-latest"],
    queryFn: () => api.get("/health/metrics/latest").then((r) => r.data),
    staleTime: 60_000,
  });

  const { data: recommendation, refetch: refetchRec } = useQuery({
    queryKey: ["dashboard-rec"],
    queryFn: () => api.get("/ai/dashboard").then((r) => r.data),
    staleTime: 300_000,
  });

  const handleRefresh = () => {
    refetchMetrics();
    refetchRec();
  };

  const triggerAnalysis = async () => {
    await api.post("/ai/analyze-now");
  };

  const healthScore = recommendation?.content?.health_score ?? null;

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} />}
      >
        {/* Header */}
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className="text-sm text-gray-400 tracking-wide">{getGreeting()}</Text>
            <Text className="text-2xl font-bold text-gray-900">{user?.name || "Користувач"}</Text>
          </View>
          <TouchableOpacity onPress={triggerAnalysis} activeOpacity={0.8}>
            <LinearGradient
              colors={["#3b82f6", "#2563eb"]}
              className="rounded-2xl px-4 py-2.5 flex-row items-center gap-1.5"
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text className="text-base">🤖</Text>
              <Text className="text-white font-semibold text-sm">Аналіз</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Health Status */}
        <HealthStatusCard score={healthScore} />

        {/* Key Metrics */}
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-lg font-bold text-gray-900">Показники</Text>
          <TouchableOpacity
            className="bg-emerald-500 rounded-xl px-3.5 py-2 flex-row items-center gap-1"
            onPress={() => router.push("/(tabs)/dashboard/add-metric")}
            activeOpacity={0.8}
          >
            <Text className="text-white font-bold text-sm">+</Text>
            <Text className="text-white font-semibold text-sm">Додати</Text>
          </TouchableOpacity>
        </View>
        <View className="flex-row gap-3 mb-3">
          <MetricCard
            type="pressure"
            label="Тиск"
            value={metrics?.blood_pressure_systolic
              ? `${metrics.blood_pressure_systolic.value}/${metrics.blood_pressure_diastolic?.value || "?"}`
              : null}
            unit="мм"
          />
          <MetricCard
            type="pulse"
            label="Пульс"
            value={metrics?.heart_rate?.value?.toString() ?? null}
            unit="уд/хв"
          />
        </View>
        <View className="flex-row gap-3 mb-6">
          <MetricCard
            type="weight"
            label="Вага"
            value={metrics?.weight?.value?.toString() ?? null}
            unit="кг"
          />
          <MetricCard
            type="spo2"
            label="SpO2"
            value={metrics?.oxygen_saturation?.value?.toString() ?? null}
            unit="%"
          />
        </View>

        {/* AI Recommendation */}
        <RecommendationCard rec={recommendation} />

        {/* Urgent Alerts */}
        {recommendation?.content?.urgent_alerts?.length > 0 && (
          <LinearGradient
            colors={["#fef2f2", "#fee2e2"]}
            className="rounded-3xl p-5 mb-4"
          >
            <View className="flex-row items-center gap-2 mb-3">
              <View className="w-8 h-8 rounded-xl bg-red-100 items-center justify-center">
                <Text className="text-base">🚨</Text>
              </View>
              <Text className="text-lg font-bold text-red-800">Зверни увагу</Text>
            </View>
            {recommendation.content.urgent_alerts.map((alert: any, i: number) => (
              <View key={i} className="flex-row items-start gap-2 mb-1.5">
                <View className="w-2 h-2 rounded-full bg-red-400 mt-2" />
                <Text className="text-base text-red-700 flex-1">{alert.reason}</Text>
              </View>
            ))}
          </LinearGradient>
        )}

        {/* Week Focus */}
        {recommendation?.content?.week_focus && (
          <View
            className="bg-violet-50 rounded-3xl p-5 mb-4 border border-violet-100"
          >
            <View className="flex-row items-center gap-2 mb-2">
              <View className="w-8 h-8 rounded-xl bg-violet-100 items-center justify-center">
                <Text className="text-base">🎯</Text>
              </View>
              <Text className="text-base font-bold text-violet-800">Фокус тижня</Text>
            </View>
            <Text className="text-base text-gray-700">{recommendation.content.week_focus}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
