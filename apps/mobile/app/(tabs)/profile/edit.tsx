import {
  ScrollView, View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { api } from "@/services/api";
import { useAuthStore } from "@/store/authStore";

const GENDER_OPTIONS = [
  { value: "male", label: "Чоловік", emoji: "👨" },
  { value: "female", label: "Жінка", emoji: "👩" },
  { value: "other", label: "Інше", emoji: "🧑" },
];

const LIFESTYLE_OPTIONS = [
  { value: "sedentary", label: "Сидячий", emoji: "🪑" },
  { value: "active", label: "Активний", emoji: "🏃" },
  { value: "mixed", label: "Змішаний", emoji: "🔄" },
];

export default function EditProfile() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { loadUser } = useAuthStore();

  const { data: user, isLoading } = useQuery({
    queryKey: ["user-profile"],
    queryFn: () => api.get("/users/me").then((r) => r.data),
  });

  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("");
  const [occupation, setOccupation] = useState("");
  const [lifestyle, setLifestyle] = useState("");
  const [city, setCity] = useState("");
  const [morningHour, setMorningHour] = useState("7");
  const [morningMinute, setMorningMinute] = useState("30");
  const [eveningHour, setEveningHour] = useState("20");
  const [eveningMinute, setEveningMinute] = useState("0");
  const [notifications, setNotifications] = useState(true);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setBirthDate(user.birth_date || "");
      setGender(user.gender || "");
      setOccupation(user.occupation || "");
      setLifestyle(user.lifestyle || "");
      setCity(user.location_city || "");
      setMorningHour(String(user.morning_survey_hour ?? 7));
      setMorningMinute(String(user.morning_survey_minute ?? 30));
      setEveningHour(String(user.evening_survey_hour ?? 20));
      setEveningMinute(String(user.evening_survey_minute ?? 0));
      setNotifications(user.notifications_enabled ?? true);
    }
  }, [user]);

  const saveMutation = useMutation({
    mutationFn: (data: any) => api.patch("/users/me", data),
    onSuccess: async () => {
      await loadUser();
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      Alert.alert("✅", "Профіль оновлено!");
      router.back();
    },
    onError: () => Alert.alert("Помилка", "Не вдалось зберегти профіль"),
  });

  const handleSave = () => {
    const data: any = {
      name: name.trim() || undefined,
      gender: gender || undefined,
      occupation: occupation.trim() || undefined,
      lifestyle: lifestyle || undefined,
      location_city: city.trim() || undefined,
      morning_survey_hour: parseInt(morningHour) || 7,
      morning_survey_minute: parseInt(morningMinute) || 0,
      evening_survey_hour: parseInt(eveningHour) || 20,
      evening_survey_minute: parseInt(eveningMinute) || 0,
      notifications_enabled: notifications,
    };
    if (birthDate && /^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      data.birth_date = birthDate;
    }
    saveMutation.mutate(data);
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
          <Text className="text-xl font-bold text-gray-900">Редагувати</Text>
          <TouchableOpacity onPress={handleSave} disabled={saveMutation.isPending}>
            <Text className="text-blue-500 text-base font-semibold">
              {saveMutation.isPending ? "..." : "Зберегти"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Name */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-600 mb-1">Ім'я</Text>
          <TextInput
            className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-base"
            value={name}
            onChangeText={setName}
            placeholder="Твоє ім'я"
          />
        </View>

        {/* Birth date */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-600 mb-1">Дата народження</Text>
          <TextInput
            className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-base"
            value={birthDate}
            onChangeText={setBirthDate}
            placeholder="1990-01-15"
            keyboardType="numbers-and-punctuation"
          />
          <Text className="text-xs text-gray-400 mt-1">Формат: РРРР-ММ-ДД</Text>
        </View>

        {/* Gender */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-600 mb-2">Стать</Text>
          <View className="flex-row gap-3">
            {GENDER_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                className={`flex-1 rounded-xl py-3 items-center border-2 ${
                  gender === opt.value
                    ? "bg-blue-50 border-blue-500"
                    : "bg-white border-gray-200"
                }`}
                onPress={() => setGender(opt.value)}
              >
                <Text className="text-xl mb-1">{opt.emoji}</Text>
                <Text className={`text-sm ${gender === opt.value ? "text-blue-600 font-semibold" : "text-gray-600"}`}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Occupation */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-600 mb-1">Професія</Text>
          <TextInput
            className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-base"
            value={occupation}
            onChangeText={setOccupation}
            placeholder="Програміст, лікар, вчитель..."
          />
        </View>

        {/* Lifestyle */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-600 mb-2">Спосіб життя</Text>
          <View className="flex-row gap-3">
            {LIFESTYLE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                className={`flex-1 rounded-xl py-3 items-center border-2 ${
                  lifestyle === opt.value
                    ? "bg-blue-50 border-blue-500"
                    : "bg-white border-gray-200"
                }`}
                onPress={() => setLifestyle(opt.value)}
              >
                <Text className="text-xl mb-1">{opt.emoji}</Text>
                <Text className={`text-sm ${lifestyle === opt.value ? "text-blue-600 font-semibold" : "text-gray-600"}`}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* City */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-600 mb-1">Місто</Text>
          <TextInput
            className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-base"
            value={city}
            onChangeText={setCity}
            placeholder="Львів"
          />
        </View>

        {/* Survey times */}
        <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-200">
          <Text className="text-base font-semibold text-gray-700 mb-3">⏰ Час опитувань</Text>

          <View className="flex-row items-center gap-3 mb-3">
            <Text className="text-sm text-gray-600 w-20">Ранок:</Text>
            <TextInput
              className="border border-gray-200 rounded-lg px-3 py-2 w-16 text-center text-base"
              value={morningHour}
              onChangeText={setMorningHour}
              keyboardType="number-pad"
              maxLength={2}
            />
            <Text className="text-gray-400">:</Text>
            <TextInput
              className="border border-gray-200 rounded-lg px-3 py-2 w-16 text-center text-base"
              value={morningMinute}
              onChangeText={setMorningMinute}
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>

          <View className="flex-row items-center gap-3">
            <Text className="text-sm text-gray-600 w-20">Вечір:</Text>
            <TextInput
              className="border border-gray-200 rounded-lg px-3 py-2 w-16 text-center text-base"
              value={eveningHour}
              onChangeText={setEveningHour}
              keyboardType="number-pad"
              maxLength={2}
            />
            <Text className="text-gray-400">:</Text>
            <TextInput
              className="border border-gray-200 rounded-lg px-3 py-2 w-16 text-center text-base"
              value={eveningMinute}
              onChangeText={setEveningMinute}
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>
        </View>

        {/* Notifications toggle */}
        <TouchableOpacity
          className={`rounded-2xl py-4 items-center mb-6 border-2 ${
            notifications ? "bg-green-50 border-green-300" : "bg-gray-50 border-gray-200"
          }`}
          onPress={() => setNotifications(!notifications)}
        >
          <Text className={`font-semibold text-base ${notifications ? "text-green-700" : "text-gray-500"}`}>
            {notifications ? "🔔 Сповіщення увімкнено" : "🔕 Сповіщення вимкнено"}
          </Text>
        </TouchableOpacity>

        {/* Save button */}
        <TouchableOpacity
          className="bg-blue-500 rounded-2xl py-4 items-center mb-8"
          onPress={handleSave}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold text-lg">💾 Зберегти зміни</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
