import { ScrollView, View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "@/services/api";

// ---- Types ----
interface Indicator {
  name: string;
  value: number | string;
  unit: string;
  reference_range: string;
  status: "normal" | "high" | "low" | "critical";
  status_label: string;
}

interface DocDetail {
  id: string;
  doc_type: string;
  title: string;
  ocr_status: string;
  file_url: string;
  parsed_data: Indicator[] | null;
  ai_analysis: {
    document_date?: string;
    lab_name?: string;
    indicators?: Indicator[];
    critical_flags?: { indicator: string; value: string; concern: string }[];
    ai_summary?: string;
  } | null;
  ai_flags: { indicator: string; value: string; concern: string }[] | null;
  created_at: string;
}

// ---- Status config ----
const STATUS_CONFIG: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  normal: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", icon: "✅" },
  high: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", icon: "⬆️" },
  low: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", icon: "⬇️" },
  critical: { bg: "bg-red-100", border: "border-red-300", text: "text-red-800", icon: "🚨" },
};

// ---- Indicator Row ----
function IndicatorRow({ indicator }: { indicator: Indicator }) {
  const cfg = STATUS_CONFIG[indicator.status] || STATUS_CONFIG.normal;

  return (
    <View className={`flex-row items-center py-3 border-b border-gray-50`}>
      <View className="flex-1">
        <Text className="text-sm font-medium text-gray-900">{indicator.name}</Text>
        <Text className="text-xs text-gray-400 mt-0.5">Норма: {indicator.reference_range} {indicator.unit}</Text>
      </View>
      <View className="items-end mr-3">
        <Text className={`text-base font-bold ${cfg.text}`}>
          {indicator.value} {indicator.unit}
        </Text>
      </View>
      <View className={`${cfg.bg} ${cfg.border} border rounded-full px-2.5 py-1 min-w-[70] items-center`}>
        <Text className={`text-xs font-medium ${cfg.text}`}>
          {cfg.icon} {indicator.status_label}
        </Text>
      </View>
    </View>
  );
}

// ---- Main Screen ----
export default function DocumentDetail() {
  const { docId } = useLocalSearchParams<{ docId: string }>();
  const router = useRouter();

  const { data: doc, isLoading } = useQuery<DocDetail>({
    queryKey: ["document-detail", docId],
    queryFn: () => api.get(`/documents/${docId}`).then((r) => r.data),
    enabled: !!docId,
    refetchInterval: 10_000,
  });

  if (isLoading || !doc) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </SafeAreaView>
    );
  }

  const indicators: Indicator[] = doc.ai_analysis?.indicators || doc.parsed_data || [];
  const normalCount = indicators.filter((i) => i.status === "normal").length;
  const abnormalCount = indicators.length - normalCount;
  const summary = doc.ai_analysis?.ai_summary;
  const labName = doc.ai_analysis?.lab_name;
  const docDate = doc.ai_analysis?.document_date;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient colors={["#eff6ff", "#dbeafe", "#f9fafb"]} className="pb-5 pt-2">
          <TouchableOpacity onPress={() => router.back()} className="px-4 py-2 mb-3">
            <Text className="text-lg text-gray-600">← Назад</Text>
          </TouchableOpacity>

          <View className="items-center">
            <Text className="text-3xl mb-2">📋</Text>
            <Text className="text-xl font-bold text-gray-900">{doc.title}</Text>
            {labName && <Text className="text-sm text-gray-500 mt-0.5">{labName}</Text>}
            {docDate && <Text className="text-xs text-gray-400 mt-0.5">{docDate}</Text>}
          </View>

          {/* Stats row */}
          <View className="flex-row justify-center gap-4 mt-4 px-6">
            <View className="bg-white/80 rounded-2xl px-4 py-3 items-center flex-1">
              <Text className="text-2xl font-bold text-gray-900">{indicators.length}</Text>
              <Text className="text-xs text-gray-500">Показників</Text>
            </View>
            <View className="bg-white/80 rounded-2xl px-4 py-3 items-center flex-1">
              <Text className="text-2xl font-bold text-emerald-600">{normalCount}</Text>
              <Text className="text-xs text-gray-500">В нормі</Text>
            </View>
            <View className="bg-white/80 rounded-2xl px-4 py-3 items-center flex-1">
              <Text className="text-2xl font-bold text-red-600">{abnormalCount}</Text>
              <Text className="text-xs text-gray-500">Відхилень</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Processing state */}
        {doc.ocr_status !== "done" && (
          <View className="mx-5 mt-4 bg-amber-50 rounded-2xl p-4 border border-amber-200 flex-row items-center gap-3">
            <ActivityIndicator size="small" color="#f59e0b" />
            <Text className="text-sm text-amber-700 font-medium">
              {doc.ocr_status === "processing" ? "AI аналізує документ..." : "Чекаю обробки..."}
            </Text>
          </View>
        )}

        {/* AI Summary */}
        {summary && (
          <View className="mx-5 mt-4">
            <View className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
              <Text className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-2">🩺 Висновок AI</Text>
              <Text className="text-sm text-blue-900 leading-5">{summary}</Text>
            </View>
          </View>
        )}

        {/* Critical Flags */}
        {doc.ai_flags && doc.ai_flags.length > 0 && (
          <View className="mx-5 mt-4">
            <View className="bg-red-50 rounded-2xl p-4 border border-red-200">
              <Text className="text-xs font-semibold text-red-700 uppercase tracking-wider mb-2">🚨 Потребує уваги</Text>
              {doc.ai_flags.map((flag, i) => (
                <View key={i} className="flex-row items-start gap-2 mb-2">
                  <Text className="text-red-500 mt-0.5">•</Text>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-red-800">{flag.indicator}: {flag.value}</Text>
                    <Text className="text-xs text-red-600 mt-0.5">{flag.concern}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* All Indicators */}
        {indicators.length > 0 && (
          <View className="mx-5 mt-4 mb-8">
            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Всі показники
            </Text>
            <View className="bg-white rounded-2xl px-4 border border-gray-100">
              {indicators.map((ind, i) => (
                <IndicatorRow key={i} indicator={ind} />
              ))}
            </View>
          </View>
        )}

        {/* Empty state for pending docs */}
        {indicators.length === 0 && doc.ocr_status === "done" && (
          <View className="items-center py-12">
            <Text className="text-3xl mb-2">📭</Text>
            <Text className="text-sm text-gray-400">Показники не розпізнано</Text>
          </View>
        )}

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
