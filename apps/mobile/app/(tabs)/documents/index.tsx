import { ScrollView, View, Text, TouchableOpacity, Alert, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { api } from "@/services/api";

const DOC_TYPES = [
  { key: "blood_test", label: "Аналіз крові", emoji: "🩸" },
  { key: "urine_test", label: "Аналіз сечі", emoji: "🧪" },
  { key: "mri", label: "МРТ/КТ", emoji: "🔬" },
  { key: "ultrasound", label: "УЗД", emoji: "📡" },
  { key: "doctor_note", label: "Висновок лікаря", emoji: "📝" },
  { key: "other", label: "Інше", emoji: "📄" },
];

function DocumentCard({ doc }: { doc: any }) {
  const statusBg = doc.ocr_status === "done" ? "bg-green-50" :
    doc.ocr_status === "processing" || doc.ocr_status === "pending" ? "bg-amber-50" : "bg-red-50";
  const statusText = doc.ocr_status === "done" ? "✅ Оброблено" :
    doc.ocr_status === "processing" ? "⏳ Обробляю..." :
    doc.ocr_status === "pending" ? "⏳ Очікує..." : "❌ Помилка";

  const typeInfo = DOC_TYPES.find((t) => t.key === doc.doc_type) || DOC_TYPES[5];

  return (
    <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
      <View className="flex-row items-center gap-3">
        <Text className="text-3xl">{typeInfo.emoji}</Text>
        <View className="flex-1">
          <Text className="text-base font-semibold text-gray-900">{doc.title || typeInfo.label}</Text>
          <Text className="text-sm text-gray-500">{typeInfo.label}</Text>
        </View>
        <View className={`${statusBg} rounded-xl px-3 py-1`}>
          <Text className="text-sm font-medium">{statusText}</Text>
        </View>
      </View>

      {/* AI Flags */}
      {doc.ai_flags && doc.ai_flags.length > 0 && (
        <View className="mt-3 bg-red-50 rounded-xl p-3">
          <Text className="text-sm font-semibold text-red-700 mb-1">⚠️ Відхилення від норми:</Text>
          {doc.ai_flags.map((flag: any, i: number) => (
            <Text key={i} className="text-sm text-red-600">
              • {flag.indicator}: {flag.value} — {flag.concern}
            </Text>
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
          text: "📷 Сфотографувати",
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
          text: "📄 Вибрати PDF",
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
        <Text className="text-2xl font-bold text-gray-900 mb-2">📋 Аналізи та документи</Text>
        <Text className="text-base text-gray-500 mb-6">
          Завантаж документ — AI прочитає та проаналізує
        </Text>

        {/* Upload buttons */}
        <View className="flex-row flex-wrap gap-3 mb-6">
          {DOC_TYPES.map((type) => (
            <TouchableOpacity
              key={type.key}
              className="bg-white border border-gray-200 rounded-2xl px-4 py-3 flex-row items-center gap-2"
              onPress={() => handleUpload(type.key)}
            >
              <Text className="text-xl">{type.emoji}</Text>
              <Text className="text-sm font-medium text-gray-700">{type.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Documents list */}
        {!docs || docs.length === 0 ? (
          <View className="items-center py-12">
            <Text className="text-5xl mb-4">📂</Text>
            <Text className="text-lg text-gray-500 text-center">
              Ще немає документів{"\n"}Завантаж аналіз для початку
            </Text>
          </View>
        ) : (
          docs.map((doc: any) => <DocumentCard key={doc.id} doc={doc} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
