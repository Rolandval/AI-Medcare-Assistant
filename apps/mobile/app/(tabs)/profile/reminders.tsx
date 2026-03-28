import {
  ScrollView, View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useRouter } from "expo-router";
import { api } from "@/services/api";

const DAYS = [
  { key: 0, label: "Пн" },
  { key: 1, label: "Вт" },
  { key: 2, label: "Ср" },
  { key: 3, label: "Чт" },
  { key: 4, label: "Пт" },
  { key: 5, label: "Сб" },
  { key: 6, label: "Нд" },
];

const EMOJIS = ["💊", "💉", "🩹", "🧴", "💧", "🫀", "🩺", "🧪"];

const TIME_PRESETS = [
  { label: "Ранок", times: ["08:00"] },
  { label: "2 рази", times: ["08:00", "20:00"] },
  { label: "3 рази", times: ["08:00", "14:00", "20:00"] },
  { label: "Свій час", times: [] },
];

function ReminderCard({
  reminder,
  onToggle,
  onDelete,
}: {
  reminder: any;
  onToggle: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const dayLabels = (reminder.days_of_week || [])
    .map((d: number) => DAYS.find((day) => day.key === d)?.label)
    .filter(Boolean)
    .join(", ");

  const times = (reminder.times || []).join(", ");

  return (
    <View className={`bg-white rounded-2xl p-4 mb-3 border ${
      reminder.is_active ? "border-gray-100" : "border-gray-200 opacity-60"
    }`}>
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center gap-2 flex-1">
          <Text className="text-2xl">{reminder.emoji || "💊"}</Text>
          <View className="flex-1">
            <Text className="text-base font-semibold text-gray-900">{reminder.name}</Text>
            {reminder.dosage && (
              <Text className="text-sm text-gray-500">{reminder.dosage}</Text>
            )}
          </View>
        </View>
        <Switch
          value={reminder.is_active}
          onValueChange={(val) => onToggle(reminder.id, val)}
          trackColor={{ false: "#d1d5db", true: "#93c5fd" }}
          thumbColor={reminder.is_active ? "#3b82f6" : "#9ca3af"}
        />
      </View>

      <View className="flex-row items-center gap-4">
        <View className="flex-row items-center gap-1">
          <Text className="text-sm text-gray-400">⏰</Text>
          <Text className="text-sm text-blue-600 font-medium">{times || "—"}</Text>
        </View>
        <View className="flex-row items-center gap-1">
          <Text className="text-sm text-gray-400">📅</Text>
          <Text className="text-sm text-gray-600">
            {(reminder.days_of_week || []).length === 7 ? "Щодня" : dayLabels}
          </Text>
        </View>
      </View>

      {reminder.instructions && (
        <Text className="text-sm text-gray-500 mt-2 italic">{reminder.instructions}</Text>
      )}

      <TouchableOpacity
        className="mt-3 py-1"
        onPress={() =>
          Alert.alert("Видалити?", `${reminder.name} — буде видалено`, [
            { text: "Скасувати" },
            { text: "Видалити", style: "destructive", onPress: () => onDelete(reminder.id) },
          ])
        }
      >
        <Text className="text-red-400 text-sm text-center">Видалити</Text>
      </TouchableOpacity>
    </View>
  );
}

function AddReminderForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [instructions, setInstructions] = useState("");
  const [emoji, setEmoji] = useState("💊");
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [timePreset, setTimePreset] = useState(0);
  const [customTime, setCustomTime] = useState("");
  const [customTimes, setCustomTimes] = useState<string[]>([]);

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post("/notifications/reminders", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      Alert.alert("✅", "Нагадування створено!");
      onClose();
    },
    onError: () => Alert.alert("Помилка", "Не вдалось створити нагадування"),
  });

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const addCustomTime = () => {
    if (/^\d{2}:\d{2}$/.test(customTime) && !customTimes.includes(customTime)) {
      setCustomTimes((prev) => [...prev, customTime].sort());
      setCustomTime("");
    }
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert("", "Введи назву ліків");
      return;
    }

    const times = timePreset < 3
      ? TIME_PRESETS[timePreset].times
      : customTimes;

    if (times.length === 0) {
      Alert.alert("", "Додай хоча б один час прийому");
      return;
    }

    createMutation.mutate({
      name: name.trim(),
      dosage: dosage.trim() || null,
      instructions: instructions.trim() || null,
      times,
      days_of_week: selectedDays,
      emoji,
    });
  };

  return (
    <View className="bg-white rounded-3xl p-5 mb-4 border border-blue-200">
      <Text className="text-lg font-bold text-gray-900 mb-4">Нове нагадування</Text>

      {/* Emoji picker */}
      <View className="flex-row gap-2 mb-4">
        {EMOJIS.map((e) => (
          <TouchableOpacity
            key={e}
            className={`w-10 h-10 rounded-full items-center justify-center ${
              emoji === e ? "bg-blue-100 border-2 border-blue-500" : "bg-gray-50"
            }`}
            onPress={() => setEmoji(e)}
          >
            <Text className="text-xl">{e}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Name */}
      <TextInput
        className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base mb-3"
        value={name}
        onChangeText={setName}
        placeholder="Назва ліків *"
      />

      {/* Dosage */}
      <TextInput
        className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base mb-3"
        value={dosage}
        onChangeText={setDosage}
        placeholder="Дозування (напр. 1 таблетка 500мг)"
      />

      {/* Time presets */}
      <Text className="text-sm font-medium text-gray-600 mb-2">⏰ Коли приймати</Text>
      <View className="flex-row gap-2 mb-3">
        {TIME_PRESETS.map((preset, i) => (
          <TouchableOpacity
            key={i}
            className={`flex-1 rounded-xl py-2.5 items-center border-2 ${
              timePreset === i ? "bg-blue-50 border-blue-500" : "bg-white border-gray-200"
            }`}
            onPress={() => setTimePreset(i)}
          >
            <Text className={`text-xs font-semibold ${
              timePreset === i ? "text-blue-600" : "text-gray-600"
            }`}>
              {preset.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Custom time input */}
      {timePreset === 3 && (
        <View className="mb-3">
          <View className="flex-row gap-2 mb-2">
            <TextInput
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-base"
              value={customTime}
              onChangeText={setCustomTime}
              placeholder="HH:MM (напр. 08:00)"
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />
            <TouchableOpacity
              className="bg-blue-500 rounded-xl px-4 items-center justify-center"
              onPress={addCustomTime}
            >
              <Text className="text-white font-bold text-lg">+</Text>
            </TouchableOpacity>
          </View>
          {customTimes.length > 0 && (
            <View className="flex-row flex-wrap gap-2">
              {customTimes.map((t) => (
                <TouchableOpacity
                  key={t}
                  className="bg-blue-50 border border-blue-200 rounded-full px-3 py-1.5 flex-row items-center"
                  onPress={() => setCustomTimes((prev) => prev.filter((x) => x !== t))}
                >
                  <Text className="text-blue-700 text-sm">{t} ✕</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Days of week */}
      <Text className="text-sm font-medium text-gray-600 mb-2">📅 Дні тижня</Text>
      <View className="flex-row gap-1.5 mb-3">
        {DAYS.map((day) => (
          <TouchableOpacity
            key={day.key}
            className={`flex-1 rounded-lg py-2 items-center border ${
              selectedDays.includes(day.key)
                ? "bg-blue-500 border-blue-500"
                : "bg-white border-gray-200"
            }`}
            onPress={() => toggleDay(day.key)}
          >
            <Text className={`text-xs font-semibold ${
              selectedDays.includes(day.key) ? "text-white" : "text-gray-600"
            }`}>
              {day.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Instructions */}
      <TextInput
        className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base mb-4"
        value={instructions}
        onChangeText={setInstructions}
        placeholder="Інструкція (після їди, запити водою...)"
      />

      {/* Actions */}
      <View className="flex-row gap-3">
        <TouchableOpacity
          className="flex-1 border border-gray-300 rounded-xl py-3 items-center"
          onPress={onClose}
        >
          <Text className="text-gray-500 font-semibold">Скасувати</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 bg-blue-500 rounded-xl py-3 items-center"
          onPress={handleSave}
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-semibold">Зберегти</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function Reminders() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: reminders, isLoading } = useQuery({
    queryKey: ["reminders"],
    queryFn: () => api.get("/notifications/reminders").then((r) => r.data),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.patch(`/notifications/reminders/${id}`, { is_active: active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reminders"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/notifications/reminders/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reminders"] }),
  });

  const testPushMutation = useMutation({
    mutationFn: () => api.post("/notifications/test-push"),
    onSuccess: () => Alert.alert("✅", "Тестове сповіщення відправлено!"),
    onError: () => Alert.alert("Помилка", "Не вдалось відправити. Перевір дозволи на сповіщення."),
  });

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-blue-500 text-base">← Назад</Text>
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">Нагадування</Text>
          <TouchableOpacity onPress={() => testPushMutation.mutate()}>
            <Text className="text-blue-500 text-sm">🔔 Тест</Text>
          </TouchableOpacity>
        </View>

        {/* Add form or button */}
        {showForm ? (
          <AddReminderForm onClose={() => setShowForm(false)} />
        ) : (
          <TouchableOpacity
            className="bg-blue-500 rounded-2xl py-4 items-center mb-4"
            onPress={() => setShowForm(true)}
          >
            <Text className="text-white font-bold text-base">+ Додати нагадування</Text>
          </TouchableOpacity>
        )}

        {/* Reminders list */}
        {isLoading && <ActivityIndicator size="large" color="#3b82f6" className="mt-8" />}

        {reminders?.length === 0 && !isLoading && (
          <View className="items-center py-12">
            <Text className="text-5xl mb-4">💊</Text>
            <Text className="text-lg font-semibold text-gray-700 mb-2">Немає нагадувань</Text>
            <Text className="text-sm text-gray-500 text-center px-8">
              Додай ліки та додаток нагадуватиме тобі про прийом у потрібний час
            </Text>
          </View>
        )}

        {reminders?.map((r: any) => (
          <ReminderCard
            key={r.id}
            reminder={r}
            onToggle={(id, active) => toggleMutation.mutate({ id, active })}
            onDelete={(id) => deleteMutation.mutate(id)}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
