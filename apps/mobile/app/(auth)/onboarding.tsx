import { useState, useRef } from "react";
import {
  View, Text, TouchableOpacity, TextInput, ScrollView,
  Dimensions, FlatList, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/services/api";
import { useAuthStore } from "@/store/authStore";

const { width } = Dimensions.get("window");

// ---- Step 1: Health basics ----
function StepHealth({
  data,
  onChange,
}: {
  data: { gender: string; birth_year: string; height: string; weight: string };
  onChange: (field: string, value: string) => void;
}) {
  return (
    <View className="flex-1 px-6 pt-4">
      <Text className="text-3xl mb-1">🏥</Text>
      <Text className="text-2xl font-bold text-gray-900 mb-1">Розкажи про себе</Text>
      <Text className="text-sm text-gray-400 mb-6">
        Це допоможе AI-лікарям краще тебе розуміти
      </Text>

      {/* Gender */}
      <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
        Стать
      </Text>
      <View className="flex-row gap-3 mb-5">
        {[
          { key: "male", label: "Чоловіча", emoji: "👨" },
          { key: "female", label: "Жіноча", emoji: "👩" },
        ].map((g) => (
          <TouchableOpacity
            key={g.key}
            onPress={() => onChange("gender", g.key)}
            className={`flex-1 rounded-2xl py-4 items-center border-2 ${
              data.gender === g.key
                ? "border-blue-400 bg-blue-50"
                : "border-gray-200 bg-white"
            }`}
            activeOpacity={0.7}
          >
            <Text className="text-2xl mb-1">{g.emoji}</Text>
            <Text
              className={`text-sm font-medium ${
                data.gender === g.key ? "text-blue-700" : "text-gray-600"
              }`}
            >
              {g.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Birth year */}
      <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
        Рік народження
      </Text>
      <TextInput
        className="bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-base mb-5"
        placeholder="1990"
        value={data.birth_year}
        onChangeText={(v) => onChange("birth_year", v)}
        keyboardType="numeric"
        maxLength={4}
      />

      {/* Height + Weight */}
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Зріст, см
          </Text>
          <TextInput
            className="bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-base"
            placeholder="175"
            value={data.height}
            onChangeText={(v) => onChange("height", v)}
            keyboardType="numeric"
            maxLength={3}
          />
        </View>
        <View className="flex-1">
          <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Вага, кг
          </Text>
          <TextInput
            className="bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-base"
            placeholder="70"
            value={data.weight}
            onChangeText={(v) => onChange("weight", v)}
            keyboardType="numeric"
            maxLength={3}
          />
        </View>
      </View>
    </View>
  );
}

// ---- Step 2: Health conditions ----
function StepConditions({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (tag: string) => void;
}) {
  const conditions = [
    { key: "diabetes", label: "Діабет", emoji: "🩸" },
    { key: "hypertension", label: "Гіпертонія", emoji: "💓" },
    { key: "heart_disease", label: "Серцеві хвороби", emoji: "❤️" },
    { key: "asthma", label: "Астма", emoji: "🫁" },
    { key: "thyroid", label: "Щитовидна залоза", emoji: "🦋" },
    { key: "allergy", label: "Алергії", emoji: "🤧" },
    { key: "gastro", label: "ШКТ проблеми", emoji: "🫃" },
    { key: "joint", label: "Суглоби / спина", emoji: "🦴" },
    { key: "migraine", label: "Мігрені", emoji: "🧠" },
    { key: "sleep", label: "Проблеми зі сном", emoji: "😴" },
    { key: "anxiety", label: "Тривожність", emoji: "😰" },
    { key: "none", label: "Нічого з цього", emoji: "✅" },
  ];

  return (
    <View className="flex-1 px-6 pt-4">
      <Text className="text-3xl mb-1">🩺</Text>
      <Text className="text-2xl font-bold text-gray-900 mb-1">Що тебе турбує?</Text>
      <Text className="text-sm text-gray-400 mb-6">
        Обери те, що стосується тебе (можна декілька)
      </Text>

      <View className="flex-row flex-wrap gap-2.5">
        {conditions.map((c) => {
          const isActive = selected.includes(c.key);
          return (
            <TouchableOpacity
              key={c.key}
              onPress={() => onToggle(c.key)}
              activeOpacity={0.7}
              className={`rounded-2xl px-4 py-3 border-2 ${
                isActive ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-white"
              }`}
            >
              <Text className="text-center">
                <Text className="text-base">{c.emoji} </Text>
                <Text
                  className={`text-sm font-medium ${
                    isActive ? "text-blue-700" : "text-gray-600"
                  }`}
                >
                  {c.label}
                </Text>
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ---- Step 3: Goals ----
function StepGoals({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (tag: string) => void;
}) {
  const goals = [
    { key: "weight_loss", label: "Схуднути", emoji: "⚖️" },
    { key: "weight_gain", label: "Набрати вагу", emoji: "💪" },
    { key: "better_sleep", label: "Покращити сон", emoji: "🌙" },
    { key: "stress_less", label: "Менше стресу", emoji: "🧘" },
    { key: "eat_better", label: "Здорове харчування", emoji: "🥗" },
    { key: "exercise_more", label: "Більше рухатись", emoji: "🏃" },
    { key: "quit_smoking", label: "Кинути палити", emoji: "🚭" },
    { key: "monitor_chronic", label: "Контроль хронічних", emoji: "📊" },
    { key: "preventive", label: "Профілактика", emoji: "🛡️" },
    { key: "family_health", label: "Здоров'я сім'ї", emoji: "👨‍👩‍👧‍👦" },
  ];

  return (
    <View className="flex-1 px-6 pt-4">
      <Text className="text-3xl mb-1">🎯</Text>
      <Text className="text-2xl font-bold text-gray-900 mb-1">Твої цілі</Text>
      <Text className="text-sm text-gray-400 mb-6">
        Обери до 3 найважливіших для тебе
      </Text>

      <View className="flex-row flex-wrap gap-2.5">
        {goals.map((g) => {
          const isActive = selected.includes(g.key);
          return (
            <TouchableOpacity
              key={g.key}
              onPress={() => onToggle(g.key)}
              activeOpacity={0.7}
              className={`rounded-2xl px-4 py-3 border-2 ${
                isActive ? "border-emerald-400 bg-emerald-50" : "border-gray-200 bg-white"
              }`}
            >
              <Text className="text-center">
                <Text className="text-base">{g.emoji} </Text>
                <Text
                  className={`text-sm font-medium ${
                    isActive ? "text-emerald-700" : "text-gray-600"
                  }`}
                >
                  {g.label}
                </Text>
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ---- Step 4: Survey times ----
function StepSchedule({
  morningHour,
  eveningHour,
  onChangeMorning,
  onChangeEvening,
}: {
  morningHour: number;
  eveningHour: number;
  onChangeMorning: (h: number) => void;
  onChangeEvening: (h: number) => void;
}) {
  const morningOptions = [7, 8, 9, 10];
  const eveningOptions = [19, 20, 21, 22];

  return (
    <View className="flex-1 px-6 pt-4">
      <Text className="text-3xl mb-1">⏰</Text>
      <Text className="text-2xl font-bold text-gray-900 mb-1">Розклад опитувань</Text>
      <Text className="text-sm text-gray-400 mb-8">
        AI-лікарі щодня питатимуть як ти себе почуваєш
      </Text>

      {/* Morning */}
      <Text className="text-sm font-semibold text-gray-700 mb-3">🌅 Ранкове опитування</Text>
      <View className="flex-row gap-3 mb-8">
        {morningOptions.map((h) => (
          <TouchableOpacity
            key={h}
            onPress={() => onChangeMorning(h)}
            className={`flex-1 rounded-2xl py-4 items-center border-2 ${
              morningHour === h
                ? "border-amber-400 bg-amber-50"
                : "border-gray-200 bg-white"
            }`}
            activeOpacity={0.7}
          >
            <Text
              className={`text-lg font-bold ${
                morningHour === h ? "text-amber-700" : "text-gray-600"
              }`}
            >
              {h}:00
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Evening */}
      <Text className="text-sm font-semibold text-gray-700 mb-3">🌙 Вечірнє опитування</Text>
      <View className="flex-row gap-3 mb-8">
        {eveningOptions.map((h) => (
          <TouchableOpacity
            key={h}
            onPress={() => onChangeEvening(h)}
            className={`flex-1 rounded-2xl py-4 items-center border-2 ${
              eveningHour === h
                ? "border-blue-400 bg-blue-50"
                : "border-gray-200 bg-white"
            }`}
            activeOpacity={0.7}
          >
            <Text
              className={`text-lg font-bold ${
                eveningHour === h ? "text-blue-700" : "text-gray-600"
              }`}
            >
              {h}:00
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View className="bg-blue-50 rounded-2xl p-4">
        <Text className="text-sm text-blue-700">
          💡 Ти завжди можеш змінити час у профілі. Кожне опитування займає 30 секунд.
        </Text>
      </View>
    </View>
  );
}

// ---- Main Onboarding Screen ----
const TOTAL_STEPS = 4;

export default function Onboarding() {
  const flatListRef = useRef<FlatList>(null);
  const [step, setStep] = useState(0);
  const { user } = useAuthStore();

  // Step 1 data
  const [health, setHealth] = useState({
    gender: "",
    birth_year: "",
    height: "",
    weight: "",
  });

  // Step 2 data
  const [conditions, setConditions] = useState<string[]>([]);

  // Step 3 data
  const [goals, setGoals] = useState<string[]>([]);

  // Step 4 data
  const [morningHour, setMorningHour] = useState(8);
  const [eveningHour, setEveningHour] = useState(21);

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Save health profile
      const profilePayload: any = {};
      if (health.gender) profilePayload.gender = health.gender;
      if (health.birth_year) {
        profilePayload.birth_date = `${health.birth_year}-01-01`;
      }
      if (Object.keys(profilePayload).length > 0) {
        await api.patch("/users/me", profilePayload);
      }

      // Save health data
      const healthPayload: any = {};
      if (health.height) healthPayload.height_cm = parseInt(health.height);
      if (health.weight) healthPayload.weight_kg = parseFloat(health.weight);
      if (conditions.length > 0 && !conditions.includes("none")) {
        healthPayload.chronic_conditions = conditions;
      }
      if (goals.length > 0) {
        healthPayload.health_goals = goals;
      }
      healthPayload.morning_survey_hour = morningHour;
      healthPayload.evening_survey_hour = eveningHour;

      await api.patch("/users/me/health-profile", healthPayload);

      // Mark onboarding complete
      await api.patch("/users/me", { onboarding_completed: true });
    },
    onSuccess: () => {
      router.replace("/(tabs)/dashboard");
    },
  });

  const goNext = () => {
    if (step < TOTAL_STEPS - 1) {
      const nextStep = step + 1;
      setStep(nextStep);
      flatListRef.current?.scrollToIndex({ index: nextStep, animated: true });
    } else {
      saveMutation.mutate();
    }
  };

  const goBack = () => {
    if (step > 0) {
      const prevStep = step - 1;
      setStep(prevStep);
      flatListRef.current?.scrollToIndex({ index: prevStep, animated: true });
    }
  };

  const toggleCondition = (key: string) => {
    if (key === "none") {
      setConditions(conditions.includes("none") ? [] : ["none"]);
      return;
    }
    setConditions((prev) =>
      prev.includes(key)
        ? prev.filter((c) => c !== key && c !== "none")
        : [...prev.filter((c) => c !== "none"), key]
    );
  };

  const toggleGoal = (key: string) => {
    setGoals((prev) =>
      prev.includes(key) ? prev.filter((g) => g !== key) : prev.length < 3 ? [...prev, key] : prev
    );
  };

  const canProceed =
    step === 0
      ? health.gender !== ""
      : step === 1
      ? conditions.length > 0
      : step === 2
      ? goals.length > 0
      : true;

  const steps = [
    <StepHealth
      key="health"
      data={health}
      onChange={(field, value) => setHealth((prev) => ({ ...prev, [field]: value }))}
    />,
    <StepConditions key="conditions" selected={conditions} onToggle={toggleCondition} />,
    <StepGoals key="goals" selected={goals} onToggle={toggleGoal} />,
    <StepSchedule
      key="schedule"
      morningHour={morningHour}
      eveningHour={eveningHour}
      onChangeMorning={setMorningHour}
      onChangeEvening={setEveningHour}
    />,
  ];

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {/* Header with progress */}
        <View className="px-6 pt-4 pb-2">
          <View className="flex-row items-center justify-between mb-3">
            {step > 0 ? (
              <TouchableOpacity onPress={goBack}>
                <Text className="text-blue-500 text-base font-medium">← Назад</Text>
              </TouchableOpacity>
            ) : (
              <View />
            )}
            <Text className="text-sm text-gray-400">
              {step + 1} / {TOTAL_STEPS}
            </Text>
            <TouchableOpacity onPress={() => router.replace("/(tabs)/dashboard")}>
              <Text className="text-gray-400 text-sm">Пропустити</Text>
            </TouchableOpacity>
          </View>

          {/* Progress bar */}
          <View className="flex-row gap-1.5">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <View
                key={i}
                className={`flex-1 h-1.5 rounded-full ${
                  i <= step ? "bg-blue-500" : "bg-gray-200"
                }`}
              />
            ))}
          </View>
        </View>

        {/* Content */}
        <FlatList
          ref={flatListRef}
          data={steps}
          horizontal
          pagingEnabled
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => (
            <ScrollView style={{ width }} contentContainerStyle={{ flexGrow: 1 }}>
              {item}
            </ScrollView>
          )}
          getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        />

        {/* Bottom button */}
        <View className="px-6 pb-4 pt-2">
          <TouchableOpacity
            onPress={goNext}
            disabled={!canProceed || saveMutation.isPending}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={
                !canProceed || saveMutation.isPending
                  ? ["#d1d5db", "#d1d5db"]
                  : ["#3b82f6", "#2563eb"]
              }
              className="rounded-2xl py-4 items-center"
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text className="text-white text-lg font-bold">
                {saveMutation.isPending
                  ? "Зберігаю..."
                  : step === TOTAL_STEPS - 1
                  ? "Розпочати! 🚀"
                  : "Далі"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
