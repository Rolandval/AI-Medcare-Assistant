import { ScrollView, View, Text, TouchableOpacity, Alert, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "@/services/api";

const DOC_TYPES = [
  { key: "blood_test", label: "Кров", emoji: "🩸", colors: ["#fef2f2", "#fee2e2"] as [string, string] },
  { key: "urine_test", label: "Сеча", emoji: "🧪", colors: ["#fefce8", "#fef9c3"] as [string, string] },
  { key: "mri", label: "МРТ/КТ", emoji: "🔬", colors: ["#f5f3ff", "#ede9fe"] as [string, string] },
  { key: "ultrasound", label: "УЗД", emoji: "📡", colors: ["#eff6ff", "#dbeafe"] as [string, string] },
  { key: "doctor_note", label: "Висновок", emoji: "📝", colors: ["#f0fdf4", "#dcfce7"] as [string, string] },
  { key: "other", label: "Інше", emoji: "📄", colors: ["#f9fafb", "#f3f4f6"] as [string, string] },
];

function DocumentCard({ doc }: { doc: any }) {
  const isDone = doc.ocr_status === "done";
  const isProcessing = doc.ocr_status === "processing" || doc.ocr_status === "pending";

  const statusConfig = isDone
    ? { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", label: "Оброблено" }
    : isProcessing
    ? { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", label: "Обробляю..." }
    : { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", label: "Помилка" };

  const typeInfo = DOC_TYPES.find((t) => t.key === doc.doc_type) || DOC_TYPES[5];

  return (
    <View
      className="bg-white rounded-2xl p-4 mb-3"
      style={{ elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 }}
    >
      <View className="flex-row items-center gap-3">
        <View className="w-12 h-12 rounded-2xl bg-gray-50 items-center justify-center">
          <Text className="text-2xl">{typeInfo.emoji}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold text-gray-900">{doc.title || typeInfo.label}</Text>
          <Text className="text-xs text-gray-400 mt-0.5">{typeInfo.label}</Text>
        </View>
        <View className={`${statusConfig.bg} ${statusConfig.border} border rounded-full px-3 py-1`}>
          <Text className={`text-xs font-medium ${statusConfig.text}`}>{statusConfig.label}</Text>
        </View>
      </View>

      {/* AI Flags */}
      {doc.ai_flags?.length > 0 && (
        <View className="mt-3 bg-red-50 rounded-xl p-3 border border-red-100">
          <Text className="text-xs font-semibold text-red-700 mb-1.5 uppercase tracking-wide">Відхилення від норми</Text>
          {doc.ai_flags.map((flag: any, i: number) => (
            <View key={i} className="flex-row items-start gap-2 mb-1">
              <View className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2" />
              <Text className="text-sm text-red-600 flex-1">
                {flag.indicator}: {flag.value} — {flag.concern}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function Documents() {
  const queryClient = useQueryClient();

  const { data: docs, isRefetching, refetch } = useQuery({
    queryKey: ["documents"],
    queryFn: () => api.get("/documents/").then((r) => r.data),
    refetchInterval: 15_000,
  });

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) =>
      api.post("/documents/", formData, { headers: { "Content-Type": "multipart/form-data" } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["documents"] }),
  });

  const handleUpload = async (doc_type: string) => {
    Alert.alert(
      "Тип файлу",
      "Що завантажити?",
      [
        {
          text: "Сфотографувати",
          onPress: async () => {
            const result = await ImagePicker.launchCameraAsync({ quality: 0.9 });
            if (!result.canceled && result.assets[0]) {
              const formData = new FormData();
              formData.append("file", { uri: result.assets[0].uri, type: "image/jpeg", name: "doc.jpg" } as any);
              formData.append("doc_type", doc_type);
              uploadMutation.mutate(formData);
            }
          },
        },
        {
          text: "Вибрати PDF",
          onPress: async () => {
            const result = await DocumentPicker.getDocumentAsync({
              type: ["application/pdf", "image/*"],
            });
            if (!result.canceled && result.assets[0]) {
              const asset = result.assets[0];
              const formData = new FormData();
              formData.append("file", { uri: asset.uri, type: asset.mimeType || "application/pdf", name: asset.name } as any);
              formData.append("doc_type", doc_type);
              formData.append("title", asset.name);
              uploadMutation.mutate(formData);
            }
          },
        },
        { text: "Скасувати", style: "cancel" },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <Text className="text-2xl font-bold text-gray-900 mb-1">Аналізи та документи</Text>
        <Text className="text-sm text-gray-400 mb-5">
          Завантаж документ — AI прочитає та проаналізує
        </Text>

        {/* Upload buttons — 3x2 grid */}
        <View className="flex-row flex-wrap gap-2.5 mb-5">
          {DOC_TYPES.map((type) => (
            <TouchableOpacity
              key={type.key}
              className="w-[31%]"
              onPress={() => handleUpload(type.key)}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={type.colors}
                className="rounded-2xl py-4 items-center"
              >
                <Text className="text-2xl mb-1">{type.emoji}</Text>
                <Text className="text-xs font-medium text-gray-600">{type.label}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        {/* Documents list */}
        {!docs || docs.length === 0 ? (
          <View className="items-center py-16">
            <View className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center mb-4">
              <Text className="text-4xl">📂</Text>
            </View>
            <Text className="text-lg font-semibold text-gray-700 mb-1">Немає документів</Text>
            <Text className="text-sm text-gray-400 text-center px-8">
              Завантаж результати аналізів і AI проаналізує їх за тебе
            </Text>
          </View>
        ) : (
          docs.map((doc: any) => <DocumentCard key={doc.id} doc={doc} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
