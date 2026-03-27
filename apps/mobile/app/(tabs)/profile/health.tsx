import {
  ScrollView, View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { api } from "@/services/api";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

function TagInput({
  label,
  tags,
  onTagsChange,
  placeholder,
}: {
  label: string;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState("");

  const addTag = () => {
    const val = input.trim();
    if (val && !tags.includes(val)) {
      onTagsChange([...tags, val]);
    }
    setInput("");
  };

  const removeTag = (tag: string) => {
    onTagsChange(tags.filter((t) => t !== tag));
  };

  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-gray-600 mb-2">{label}</Text>
      {tags.length > 0 && (
        <View className="flex-row flex-wrap gap-2 mb-2">
          {tags.map((tag) => (
            <TouchableOpacity
              key={tag}
              className="bg-blue-50 border border-blue-200 rounded-full px-3 py-1.5 flex-row items-center gap-1"
              onPress={() => removeTag(tag)}
            >
              <Text className="text-blue-700 text-sm">{tag}</Text>
              <Text className="text-blue-400 text-xs">✕</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <View className="flex-row gap-2">
        <TextInput
          className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 text-base"
          value={input}
          onChangeText={setInput}
          placeholder={placeholder}
          onSubmitEditing={addTag}
          returnKeyType="done"
        />
        <TouchableOpacity
          className="bg-blue-500 rounded-xl px-4 items-center justify-center"
          onPress={addTag}
        >
          <Text className="text-white font-semibold text-lg">+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function EditHealthProfile() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["health-profile"],
    queryFn: () => api.get("/users/me/health-profile").then((r) => r.data),
  });

  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [conditions, setConditions] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [medications, setMedications] = useState<string[]>([]);
  const [surgeries, setSurgeries] = useState<string[]>([]);
  const [physicalFeatures, setPhysicalFeatures] = useState<string[]>([]);
  const [professionalRisks, setProfessionalRisks] = useState<string[]>([]);
  const [healthGoals, setHealthGoals] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (profile) {
      setHeight(profile.height_cm ? String(profile.height_cm) : "");
      setWeight(profile.weight_kg ? String(profile.weight_kg) : "");
      setBloodType(profile.blood_type || "");
      setConditions(profile.chronic_conditions || []);
      setAllergies(profile.allergies || []);
      setMedications(profile.current_medications || []);
      setSurgeries(profile.past_surgeries || []);
      setPhysicalFeatures(profile.physical_features || []);
      setProfessionalRisks(profile.professional_risks || []);
      setHealthGoals(profile.health_goals || []);
      setNotes(profile.additional_notes || "");
    }
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: (data: any) => api.patch("/users/me/health-profile", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["health-profile"] });
      Alert.alert("✅", "Профіль здоров'я оновлено!");
      router.back();
    },
    onError: () => Alert.alert("Помилка", "Не вдалось зберегти"),
  });

  const handleSave = () => {
    saveMutation.mutate({
      height_cm: height ? parseFloat(height) : null,
      weight_kg: weight ? parseFloat(weight) : null,
      blood_type: bloodType || null,
      chronic_conditions: conditions,
      allergies,
      current_medications: medications,
      past_surgeries: surgeries,
      physical_features: physicalFeatures,
      professional_risks: professionalRisks,
      health_goals: healthGoals,
      additional_notes: notes || null,
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-blue-500 text-base">← Назад</Text>
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">Здоров'я</Text>
          <TouchableOpacity onPress={handleSave} disabled={saveMutation.isPending}>
            <Text className="text-blue-500 text-base font-semibold">
              {saveMutation.isPending ? "..." : "Зберегти"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Height & Weight */}
        <View className="flex-row gap-3 mb-4">
          <View className="flex-1">
            <Text className="text-sm font-medium text-gray-600 mb-1">📏 Зріст (см)</Text>
            <TextInput
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-base"
              value={height}
              onChangeText={setHeight}
              placeholder="175"
              keyboardType="decimal-pad"
            />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-medium text-gray-600 mb-1">⚖️ Вага (кг)</Text>
            <TextInput
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-base"
              value={weight}
              onChangeText={setWeight}
              placeholder="72"
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* Blood type */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-600 mb-2">🩸 Група крові</Text>
          <View className="flex-row flex-wrap gap-2">
            {BLOOD_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                className={`rounded-xl px-4 py-2.5 border-2 ${
                  bloodType === type
                    ? "bg-red-50 border-red-400"
                    : "bg-white border-gray-200"
                }`}
                onPress={() => setBloodType(bloodType === type ? "" : type)}
              >
                <Text
                  className={`text-base font-semibold ${
                    bloodType === type ? "text-red-600" : "text-gray-600"
                  }`}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Tag inputs */}
        <TagInput
          label="🏥 Хронічні хвороби"
          tags={conditions}
          onTagsChange={setConditions}
          placeholder="Діабет, гіпертонія..."
        />

        <TagInput
          label="⚠️ Алергії"
          tags={allergies}
          onTagsChange={setAllergies}
          placeholder="Пеніцилін, горіхи..."
        />

        <TagInput
          label="💊 Поточні ліки"
          tags={medications}
          onTagsChange={setMedications}
          placeholder="Назва ліків..."
        />

        <TagInput
          label="🔪 Перенесені операції"
          tags={surgeries}
          onTagsChange={setSurgeries}
          placeholder="Апендектомія 2020..."
        />

        <TagInput
          label="🦴 Фізичні особливості"
          tags={physicalFeatures}
          onTagsChange={setPhysicalFeatures}
          placeholder="Сколіоз, плоскостопість..."
        />

        <TagInput
          label="⚡ Професійні ризики"
          tags={professionalRisks}
          onTagsChange={setProfessionalRisks}
          placeholder="Сидячий спосіб життя, екран..."
        />

        <TagInput
          label="🎯 Цілі здоров'я"
          tags={healthGoals}
          onTagsChange={setHealthGoals}
          placeholder="Схуднути, покращити сон..."
        />

        {/* Notes */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-600 mb-1">📝 Додаткові нотатки</Text>
          <TextInput
            className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-base"
            value={notes}
            onChangeText={setNotes}
            placeholder="Щось важливе для лікаря..."
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            style={{ minHeight: 80 }}
          />
        </View>

        {/* Save button */}
        <TouchableOpacity
          className="bg-blue-500 rounded-2xl py-4 items-center mb-8"
          onPress={handleSave}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold text-lg">💾 Зберегти профіль здоров'я</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
