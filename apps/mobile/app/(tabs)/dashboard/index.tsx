import { ScrollView, View, Text, TouchableOpacity, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useAuthStore } from "@/store/authStore";

function HealthStatusCard({ score }: { score: number | null }) {
  const color = !score ? "bg-gray-100" : score >= 7 ? "bg-green-50" : score >= 4 ? "bg-amber-50" : "bg-red-50";
  const textColor = !score ? "text-gray-400" : score >= 7 ? "text-green-600" : score >= 4 ? "text-amber-600" : "text-red-600";
  const emoji = !score ? "❓" : score >= 7 ? "✅" : score >= 4 ? "⚠️" : "🚨";
  const label = !score ? "Даних немає" : score >= 7 ? "Стан хороший" : score >= 4 ? "Є що покращити" : "Потрібна увага";

  return (
    <View className={`${color} rounded-3xl p-6 mb-4`}>
      <View className="flex-row items-center gap-3 mb-3">
        <Text className="text-3xl">{emoji}</Text>
        <View className="flex-1">
          <Text className={`text-xl font-bold ${textColor}`}>{label}</Text>
          {score && <Text className="text-gray-500 text-base">Оцінка здоров'я: {score}/10</Text>}
        </View>
      </View>
    </View>
  );
}

function MetricCard({ icon, label, value, unit }: { icon: string; label: string; value: string | null; unit: string }) {
  return (
    <View className="flex-1 bg-white rounded-2xl p-4 border border-gray-100">
      <Text className="text-2xl mb-1">{icon}</Text>
      <Text className="text-gray-500 text-sm">{label}</Text>
      <Text className="text-xl font-bold text-gray-900 mt-1">
        {value || "—"}
        {value && <Text className="text-sm font-normal text-gray-500"> {unit}</Text>}
      </Text>
    </View>
  );
}

function RecommendationCard({ rec }: { rec: any }) {
  if (!rec?.content) return null;
  const content = rec.content;

  return (
    <View className="bg-blue-50 rounded-3xl p-5 mb-4">
      <Text className="text-lg font-bold text-blue-900 mb-2">💡 Рекомендації AI-лікаря</Text>
      {content.summary && (
        <Text className="text-base text-gray-700 mb-4">{content.summary}</Text>
      )}
      {content.today_actions && content.today_actions.length > 0 && (
        <View>
          <Text className="text-base font-semibold text-gray-700 mb-2">Сьогодні:</Text>
          {content.today_actions.map((action: string, i: number) => (
            <View key={i} className="flex-row items-start gap-2 mb-1">
              <Text className="text-green-500 text-base">•</Text>
              <Text className="text-base text-gray-700 flex-1">{action}</Text>
            </View>
          ))}
        </View>
      )}
      {content.positive_note && (
        <View className="mt-3 bg-white rounded-2xl p-3">
          <Text className="text-base text-gray-600 italic">"{content.positive_note}"</Text>
        </View>
      )}
    </View>
  );
}

export default function Dashboard() {
  const { user } = useAuthStore();

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
            <Text className="text-gray-500 text-base">Доброго ранку 👋</Text>
            <Text className="text-2xl font-bold text-gray-900">{user?.name || "Користувач"}</Text>
          </View>
          <TouchableOpacity
            className="bg-blue-500 rounded-2xl px-4 py-2"
            onPress={triggerAnalysis}
          >
            <Text className="text-white font-semibold text-sm">🤖 Аналіз</Text>
          </TouchableOpacity>
        </View>

        {/* Health Status */}
        <HealthStatusCard score={healthScore} />

        {/* Key Metrics */}
        <Text className="text-lg font-bold text-gray-900 mb-3">Показники</Text>
        <View className="flex-row gap-3 mb-3">
          <MetricCard
            icon="🫀"
            label="Тиск"
            value={metrics?.blood_pressure_systolic
              ? `${metrics.blood_pressure_systolic.value}/${metrics.blood_pressure_diastolic?.value || "?"}`
              : null}
            unit="мм"
          />
          <MetricCard
            icon="❤️"
            label="Пульс"
            value={metrics?.heart_rate?.value?.toString() ?? null}
            unit="уд/хв"
          />
        </View>
        <View className="flex-row gap-3 mb-6">
          <MetricCard
            icon="⚖️"
            label="Вага"
            value={metrics?.weight?.value?.toString() ?? null}
            unit="кг"
          />
          <MetricCard
            icon="💨"
            label="SpO2"
            value={metrics?.oxygen_saturation?.value?.toString() ?? null}
            unit="%"
          />
        </View>

        {/* AI Recommendation */}
        <RecommendationCard rec={recommendation} />

        {/* Urgent Alerts */}
        {recommendation?.content?.urgent_alerts?.length > 0 && (
          <View className="bg-red-50 rounded-3xl p-5 mb-4">
            <Text className="text-lg font-bold text-red-800 mb-2">🚨 Зверни увагу</Text>
            {recommendation.content.urgent_alerts.map((alert: any, i: number) => (
              <Text key={i} className="text-base text-red-700 mb-1">
                • {alert.reason}
              </Text>
            ))}
          </View>
        )}

        {/* Week Focus */}
        {recommendation?.content?.week_focus && (
          <View className="bg-purple-50 rounded-3xl p-5 mb-4">
            <Text className="text-base font-semibold text-purple-800 mb-1">🎯 Фокус тижня</Text>
            <Text className="text-base text-gray-700">{recommendation.content.week_focus}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
