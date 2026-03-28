import { useCallback, useState } from "react";
import {
  ScrollView, View, Text, TouchableOpacity, RefreshControl, ActivityIndicator, TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from "react-native-svg";
import { api } from "@/services/api";
import { useAuthStore } from "@/store/authStore";

// ---- Types ----
interface AICard {
  id: string;
  doctor_id: string;
  doctor_name: string;
  doctor_emoji: string;
  doctor_color: string;
  card_type: string;
  round_type: string;
  title: string;
  body: string;
  metadata?: any;
  action_type?: string;
  status: string;
  created_at: string;
}

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  emoji: string;
  color: string;
  card_count: number;
}

// ---- Helpers ----
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "Доброї ночі";
  if (h < 12) return "Доброго ранку";
  if (h < 18) return "Доброго дня";
  return "Доброго вечора";
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "щойно";
  if (mins < 60) return `${mins} хв тому`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} год тому`;
  return `${Math.floor(hrs / 24)} дн тому`;
}

// ---- Health Score Ring ----
function ScoreRing({ score, size = 64 }: { score: number | null; size?: number }) {
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = score ? (score / 10) * circumference : 0;
  const color = !score ? "#d1d5db" : score >= 7 ? "#10b981" : score >= 4 ? "#f59e0b" : "#ef4444";

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke="#f3f4f6" strokeWidth={strokeWidth} fill="transparent" />
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth={strokeWidth} fill="transparent"
          strokeDasharray={`${progress} ${circumference - progress}`} strokeLinecap="round" />
      </Svg>
      <View className="absolute items-center">
        <Text className="text-lg font-bold text-gray-900">{score ?? "—"}</Text>
      </View>
    </View>
  );
}

// ---- Doctor Avatar Row ----
function DoctorRow({ doctors }: { doctors: Doctor[] }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 -mx-1">
      {doctors.map((d) => (
        <View key={d.id} className="items-center mx-2">
          <View
            className="w-12 h-12 rounded-2xl items-center justify-center mb-1"
            style={{ backgroundColor: d.color + "15" }}
          >
            <Text className="text-xl">{d.emoji}</Text>
          </View>
          <Text className="text-xs text-gray-500" numberOfLines={1}>{d.name.split(" ")[1]}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

// ---- Survey Card (embedded) ----
function SurveyCardContent({
  card,
  onSubmit,
}: {
  card: AICard;
  onSubmit: (data: any) => void;
}) {
  const [mood, setMood] = useState<string | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [sleepHours, setSleepHours] = useState("");

  const moods = ["😫", "😟", "😐", "🙂", "😄"];
  const energyLevels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  const handleSubmit = () => {
    onSubmit({
      mood,
      energy,
      sleep_hours: sleepHours ? parseFloat(sleepHours) : null,
    });
  };

  return (
    <View>
      {/* Mood */}
      <Text className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Настрій</Text>
      <View className="flex-row gap-2 mb-3">
        {moods.map((m) => (
          <TouchableOpacity
            key={m}
            className={`flex-1 py-2 rounded-xl items-center ${mood === m ? "bg-blue-100 border border-blue-300" : "bg-gray-50"}`}
            onPress={() => setMood(m)}
          >
            <Text className="text-xl">{m}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Energy */}
      <Text className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Енергія</Text>
      <View className="flex-row gap-1 mb-3">
        {energyLevels.map((e) => (
          <TouchableOpacity
            key={e}
            className={`flex-1 py-1.5 rounded-lg items-center ${
              energy !== null && e <= energy ? "bg-amber-400" : "bg-gray-100"
            }`}
            onPress={() => setEnergy(e)}
          >
            <Text className={`text-xs font-bold ${energy !== null && e <= energy ? "text-white" : "text-gray-400"}`}>{e}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sleep */}
      <Text className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Сон (годин)</Text>
      <TextInput
        className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-base mb-3"
        value={sleepHours}
        onChangeText={setSleepHours}
        placeholder="7.5"
        keyboardType="decimal-pad"
      />

      <TouchableOpacity
        className="bg-blue-500 rounded-xl py-2.5 items-center"
        onPress={handleSubmit}
        disabled={!mood}
        activeOpacity={0.8}
      >
        <Text className="text-white font-bold text-sm">Відправити</Text>
      </TouchableOpacity>
    </View>
  );
}

// ---- Meal Suggestion Card ----
function MealSuggestionContent({ card }: { card: AICard }) {
  const suggestions = card.metadata?.suggestions || [];
  return (
    <View className="gap-2">
      {suggestions.map((s: any, i: number) => (
        <View key={i} className="flex-row items-center gap-3 bg-emerald-50 rounded-xl p-3">
          <Text className="text-2xl">{s.emoji || "🍽"}</Text>
          <View className="flex-1">
            <Text className="text-sm font-semibold text-gray-900">{s.name}</Text>
            <Text className="text-xs text-gray-500">
              {s.calories} ккал · Б {s.protein_g}г
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// ---- Challenge Card ----
function ChallengeContent({ card }: { card: AICard }) {
  return (
    <View>
      {card.metadata?.duration_min && (
        <View className="flex-row items-center gap-2 mb-2">
          <View className="bg-orange-50 rounded-lg px-2 py-1">
            <Text className="text-xs text-orange-600 font-semibold">⏱ {card.metadata.duration_min} хв</Text>
          </View>
          {card.metadata?.difficulty && (
            <View className="bg-emerald-50 rounded-lg px-2 py-1">
              <Text className="text-xs text-emerald-600 font-semibold">
                {card.metadata.difficulty === "easy" ? "Легко" : card.metadata.difficulty === "medium" ? "Середньо" : "Важко"}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ---- Main Card Component ----
function FeedCard({
  card,
  onAction,
  isActing,
}: {
  card: AICard;
  onAction: (cardId: string, action: string, data?: any) => void;
  isActing: boolean;
}) {
  const isActed = card.status === "acted" || card.status === "dismissed";

  return (
    <View
      className={`bg-white rounded-2xl p-4 mb-3 ${isActed ? "opacity-60" : ""}`}
      style={{ elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 }}
    >
      {/* Doctor header */}
      <View className="flex-row items-center gap-2.5 mb-3">
        <View
          className="w-9 h-9 rounded-xl items-center justify-center"
          style={{ backgroundColor: card.doctor_color + "15" }}
        >
          <Text className="text-base">{card.doctor_emoji}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-sm font-bold text-gray-900">{card.doctor_name}</Text>
          <Text className="text-xs text-gray-400">{card.title}</Text>
        </View>
        <Text className="text-xs text-gray-300">{timeAgo(card.created_at)}</Text>
      </View>

      {/* Body */}
      <Text className="text-base text-gray-700 leading-6 mb-3">{card.body}</Text>

      {/* Type-specific content */}
      {card.card_type === "survey" && !isActed && (
        <SurveyCardContent
          card={card}
          onSubmit={(data) => onAction(card.id, "survey_submit", data)}
        />
      )}

      {card.card_type === "meal_suggestion" && (
        <MealSuggestionContent card={card} />
      )}

      {card.card_type === "challenge" && (
        <ChallengeContent card={card} />
      )}

      {/* Action buttons */}
      {!isActed && card.card_type !== "survey" && (
        <View className="flex-row gap-2 mt-1">
          {card.action_type === "done" && (
            <TouchableOpacity
              className="flex-1 bg-emerald-50 border border-emerald-200 rounded-xl py-2.5 items-center"
              onPress={() => onAction(card.id, "done")}
              disabled={isActing}
            >
              <Text className="text-emerald-700 font-semibold text-sm">
                {isActing ? "..." : "Виконано"}
              </Text>
            </TouchableOpacity>
          )}
          {card.action_type === "chat" && (
            <TouchableOpacity
              className="flex-1 bg-blue-50 border border-blue-200 rounded-xl py-2.5 items-center"
              onPress={() => onAction(card.id, "done")}
            >
              <Text className="text-blue-700 font-semibold text-sm">Поговорити</Text>
            </TouchableOpacity>
          )}
          {card.action_type === "photo" && (
            <TouchableOpacity
              className="flex-1 bg-emerald-50 border border-emerald-200 rounded-xl py-2.5 items-center"
              onPress={() => onAction(card.id, "done")}
            >
              <Text className="text-emerald-700 font-semibold text-sm">Сфотографувати</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            className="bg-gray-50 rounded-xl py-2.5 px-4 items-center"
            onPress={() => onAction(card.id, "dismiss")}
          >
            <Text className="text-gray-400 text-sm">Пропустити</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Acted indicator */}
      {isActed && (
        <View className="flex-row items-center gap-1.5">
          <View className="w-4 h-4 rounded-full bg-emerald-100 items-center justify-center">
            <Text className="text-xs text-emerald-600">✓</Text>
          </View>
          <Text className="text-xs text-gray-400">
            {card.status === "acted" ? "Виконано" : "Пропущено"}
          </Text>
        </View>
      )}
    </View>
  );
}

// ---- Round Header ----
function RoundHeader({ roundType }: { roundType: string }) {
  const labels: Record<string, { label: string; emoji: string }> = {
    morning: { label: "Ранковий раунд", emoji: "🌅" },
    afternoon: { label: "Денний раунд", emoji: "☀️" },
    evening: { label: "Вечірній раунд", emoji: "🌙" },
  };
  const info = labels[roundType] || labels.morning;
  return (
    <View className="flex-row items-center gap-2 mb-3 mt-2">
      <Text className="text-base">{info.emoji}</Text>
      <Text className="text-sm font-bold text-gray-700">{info.label}</Text>
      <View className="flex-1 h-px bg-gray-100 ml-2" />
    </View>
  );
}

// ---- Main Screen ----
export default function Dashboard() {
  const { user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: cards, isLoading, isRefetching, refetch } = useQuery<AICard[]>({
    queryKey: ["ai-feed"],
    queryFn: () => api.get("/ai/feed?limit=30").then((r) => r.data),
    staleTime: 30_000,
  });

  const { data: doctors } = useQuery<Doctor[]>({
    queryKey: ["ai-doctors"],
    queryFn: () => api.get("/ai/feed/doctors").then((r) => r.data),
    staleTime: 300_000,
  });

  const { data: recommendation } = useQuery({
    queryKey: ["dashboard-rec"],
    queryFn: () => api.get("/ai/dashboard").then((r) => r.data),
    staleTime: 300_000,
  });

  const actionMutation = useMutation({
    mutationFn: ({ cardId, action, data }: { cardId: string; action: string; data?: any }) =>
      api.post(`/ai/feed/${cardId}/action`, { action, data }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ai-feed"] }),
  });

  const generateMutation = useMutation({
    mutationFn: (roundType: string) =>
      api.post(`/ai/feed/generate?round_type=${roundType}`),
    onSuccess: () => {
      setTimeout(() => refetch(), 20000);
    },
  });

  const handleAction = useCallback((cardId: string, action: string, data?: any) => {
    actionMutation.mutate({ cardId, action, data });
  }, []);

  const healthScore = recommendation?.content?.health_score ?? null;

  // Group cards by round_type
  const groupedCards: Record<string, AICard[]> = {};
  (cards || []).forEach((card) => {
    const key = card.round_type;
    if (!groupedCards[key]) groupedCards[key] = [];
    groupedCards[key].push(card);
  });

  const roundOrder = ["morning", "afternoon", "evening"];
  const hasCards = (cards || []).length > 0;

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {/* Header */}
        <View className="flex-row justify-between items-center mb-4">
          <View className="flex-row items-center gap-3">
            <ScoreRing score={healthScore} />
            <View>
              <Text className="text-sm text-gray-400">{getGreeting()}</Text>
              <Text className="text-xl font-bold text-gray-900">{user?.name || "Користувач"}</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/dashboard/add-metric")}
            className="bg-emerald-50 rounded-xl px-3 py-2"
          >
            <Text className="text-emerald-600 font-semibold text-sm">+ Метрики</Text>
          </TouchableOpacity>
        </View>

        {/* Doctor avatars */}
        {doctors && doctors.length > 0 && <DoctorRow doctors={doctors} />}

        {/* Generate buttons (if no cards) */}
        {!hasCards && !isLoading && (
          <View className="items-center py-8">
            <View className="w-20 h-20 rounded-full bg-blue-50 items-center justify-center mb-4">
              <Text className="text-4xl">🩺</Text>
            </View>
            <Text className="text-lg font-bold text-gray-700 mb-2">Твоя AI-команда готова</Text>
            <Text className="text-sm text-gray-400 text-center mb-6 px-8">
              Натисни щоб лікарі проаналізували твій стан і дали персональні рекомендації
            </Text>
            <TouchableOpacity
              onPress={() => generateMutation.mutate("morning")}
              disabled={generateMutation.isPending}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={["#3b82f6", "#2563eb"]}
                className="rounded-2xl px-8 py-3.5 flex-row items-center gap-2"
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {generateMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text className="text-white text-base">🤖</Text>
                    <Text className="text-white font-bold">Запустити раунд</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
            {generateMutation.isPending && (
              <Text className="text-sm text-gray-400 mt-3">Генерую поради... 15-30 секунд</Text>
            )}
          </View>
        )}

        {/* Loading */}
        {isLoading && (
          <View className="items-center py-12">
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        )}

        {/* Feed cards grouped by round */}
        {hasCards && roundOrder.map((round) => {
          const roundCards = groupedCards[round];
          if (!roundCards || roundCards.length === 0) return null;
          return (
            <View key={round}>
              <RoundHeader roundType={round} />
              {roundCards.map((card) => (
                <FeedCard
                  key={card.id}
                  card={card}
                  onAction={handleAction}
                  isActing={actionMutation.isPending}
                />
              ))}
            </View>
          );
        })}

        {/* Quick generate another round */}
        {hasCards && (
          <TouchableOpacity
            className="border border-dashed border-blue-300 rounded-2xl py-3.5 items-center mt-2 bg-blue-50/50"
            onPress={() => {
              const h = new Date().getHours();
              const round = h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
              generateMutation.mutate(round);
            }}
            disabled={generateMutation.isPending}
          >
            <Text className="text-blue-500 font-semibold text-sm">
              {generateMutation.isPending ? "Генерую..." : "Запросити нові поради"}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
