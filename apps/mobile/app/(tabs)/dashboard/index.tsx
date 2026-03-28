import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList, View, Text, TouchableOpacity, RefreshControl, ActivityIndicator,
  TextInput, Animated, Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
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

interface AchievementToast {
  name: string;
  emoji: string;
  points: number;
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

function formatDateHeader(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Сьогодні";
  if (d.toDateString() === yesterday.toDateString()) return "Вчора";
  return d.toLocaleDateString("uk-UA", { day: "numeric", month: "long" });
}

// ---- Health Score Ring ----
function ScoreRing({ score, size = 64 }: { score: number | null; size?: number }) {
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = score ? (score / 100) * circumference : 0;
  const color = !score ? "#d1d5db" : score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444";

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
function DoctorRow({ doctors, onPress }: { doctors: Doctor[]; onPress?: (id: string) => void }) {
  return (
    <FlatList
      data={doctors}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyExtractor={(d) => d.id}
      contentContainerStyle={{ paddingHorizontal: 4 }}
      className="mb-4"
      renderItem={({ item: d }) => (
        <TouchableOpacity className="items-center mx-2" onPress={() => onPress?.(d.id)} activeOpacity={0.7}>
          <View
            className="w-12 h-12 rounded-2xl items-center justify-center mb-1"
            style={{ backgroundColor: d.color + "15" }}
          >
            <Text className="text-xl">{d.emoji}</Text>
          </View>
          <Text className="text-xs text-gray-500" numberOfLines={1}>{d.name.split(" ")[1]}</Text>
          {d.card_count > 0 && (
            <View className="absolute -top-1 -right-1 bg-blue-500 rounded-full w-4 h-4 items-center justify-center">
              <Text className="text-white text-xs font-bold" style={{ fontSize: 9 }}>{d.card_count > 9 ? "9+" : d.card_count}</Text>
            </View>
          )}
        </TouchableOpacity>
      )}
    />
  );
}

// ---- Achievement Toast ----
function AchievementToastView({ achievement, onDismiss }: { achievement: AchievementToast; onDismiss: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 12 }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -40, duration: 300, useNativeDriver: true }),
      ]).start(() => onDismiss());
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View
      style={{ opacity, transform: [{ translateY }] }}
      className="absolute top-4 left-4 right-4 z-50"
    >
      <LinearGradient
        colors={["#fef3c7", "#fbbf24"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        className="rounded-2xl p-4 flex-row items-center gap-3"
        style={{ elevation: 8, shadowColor: "#f59e0b", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }}
      >
        <View className="w-12 h-12 rounded-2xl bg-white/60 items-center justify-center">
          <Text className="text-2xl">{achievement.emoji}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-xs text-amber-800 font-medium uppercase tracking-wide">🏆 Досягнення!</Text>
          <Text className="text-base font-bold text-amber-900">{achievement.name}</Text>
          <Text className="text-xs text-amber-700">+{achievement.points} очків</Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

// ---- Survey Card (embedded, improved) ----
function SurveyCardContent({
  card,
  onSubmit,
}: {
  card: AICard;
  onSubmit: (data: any) => void;
}) {
  const [mood, setMood] = useState<string | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [sleepHours, setSleepHours] = useState<number | null>(null);

  const moods = [
    { emoji: "😫", label: "Жах" },
    { emoji: "😟", label: "Погано" },
    { emoji: "😐", label: "Норм" },
    { emoji: "🙂", label: "Добре" },
    { emoji: "😄", label: "Чудово" },
  ];

  const sleepOptions = [4, 5, 6, 7, 8, 9, 10];

  const canSubmit = mood !== null;

  const handleSubmit = () => {
    onSubmit({
      mood,
      energy,
      sleep_hours: sleepHours,
    });
  };

  return (
    <View>
      {/* Mood — one-tap emoji row */}
      <Text className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Настрій</Text>
      <View className="flex-row gap-1.5 mb-4">
        {moods.map((m) => (
          <TouchableOpacity
            key={m.emoji}
            className={`flex-1 py-2.5 rounded-xl items-center ${
              mood === m.emoji ? "bg-blue-100 border-2 border-blue-400" : "bg-gray-50 border-2 border-transparent"
            }`}
            onPress={() => setMood(m.emoji)}
            activeOpacity={0.7}
          >
            <Text className={mood === m.emoji ? "text-2xl" : "text-xl"}>{m.emoji}</Text>
            <Text className={`text-xs mt-0.5 ${mood === m.emoji ? "text-blue-600 font-semibold" : "text-gray-400"}`}>{m.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Energy — tap scale with fill effect */}
      <Text className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Енергія</Text>
      <View className="flex-row gap-1 mb-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((e) => {
          const active = energy !== null && e <= energy;
          const barColor = !active ? "bg-gray-100" : e <= 3 ? "bg-red-400" : e <= 6 ? "bg-amber-400" : "bg-emerald-400";
          return (
            <TouchableOpacity
              key={e}
              className={`flex-1 rounded-lg items-center ${barColor}`}
              style={{ height: 16 + e * 2 }}
              onPress={() => setEnergy(e)}
            >
              {active && e === energy && (
                <Text className="text-white font-bold mt-0.5" style={{ fontSize: 9 }}>{e}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Sleep — quick-select pills */}
      <Text className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Сон (годин)</Text>
      <View className="flex-row gap-1.5 mb-4">
        {sleepOptions.map((h) => (
          <TouchableOpacity
            key={h}
            className={`flex-1 py-2 rounded-xl items-center ${
              sleepHours === h ? "bg-violet-100 border-2 border-violet-400" : "bg-gray-50 border-2 border-transparent"
            }`}
            onPress={() => setSleepHours(h)}
          >
            <Text className={`text-sm font-semibold ${sleepHours === h ? "text-violet-700" : "text-gray-500"}`}>{h}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Submit */}
      <TouchableOpacity
        className={`rounded-xl py-3 items-center ${canSubmit ? "bg-blue-500" : "bg-gray-200"}`}
        onPress={handleSubmit}
        disabled={!canSubmit}
        activeOpacity={0.8}
      >
        <Text className={`font-bold text-sm ${canSubmit ? "text-white" : "text-gray-400"}`}>
          {canSubmit ? "Відправити →" : "Обери настрій"}
        </Text>
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

// ---- Challenge Card (with deadline) ----
function ChallengeContent({ card }: { card: AICard }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!card.metadata?.deadline) return;
    const updateTimer = () => {
      const now = new Date();
      const [h, m] = card.metadata.deadline.split(":").map(Number);
      const deadline = new Date(now);
      deadline.setHours(h, m, 0, 0);
      if (deadline <= now) {
        setTimeLeft("Час вийшов!");
        return;
      }
      const diff = deadline.getTime() - now.getTime();
      const hrs = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      setTimeLeft(hrs > 0 ? `${hrs}г ${mins}хв` : `${mins} хв`);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [card.metadata?.deadline]);

  return (
    <View>
      <View className="flex-row items-center gap-2 mb-1 flex-wrap">
        {card.metadata?.duration_min && (
          <View className="bg-orange-50 rounded-lg px-2.5 py-1">
            <Text className="text-xs text-orange-600 font-semibold">⏱ {card.metadata.duration_min} хв</Text>
          </View>
        )}
        {card.metadata?.difficulty && (
          <View className="bg-emerald-50 rounded-lg px-2.5 py-1">
            <Text className="text-xs text-emerald-600 font-semibold">
              {card.metadata.difficulty === "easy" ? "💚 Легко" : card.metadata.difficulty === "medium" ? "🟡 Середньо" : "🔴 Важко"}
            </Text>
          </View>
        )}
        {card.metadata?.deadline && (
          <View className="bg-red-50 rounded-lg px-2.5 py-1">
            <Text className="text-xs text-red-600 font-semibold">
              ⏰ до {card.metadata.deadline} {timeLeft ? `(${timeLeft})` : ""}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ---- Main Card Component ----
function FeedCard({
  card,
  onAction,
  isActing,
  onChat,
}: {
  card: AICard;
  onAction: (cardId: string, action: string, data?: any) => void;
  isActing: boolean;
  onChat?: (doctorId: string) => void;
}) {
  const isActed = card.status === "acted" || card.status === "dismissed";
  const isNew = card.status === "pending";

  return (
    <View
      className={`bg-white rounded-2xl p-4 mb-3 ${isActed ? "opacity-50" : ""}`}
      style={{
        elevation: isNew ? 3 : 1,
        shadowColor: isNew ? card.doctor_color : "#000",
        shadowOffset: { width: 0, height: isNew ? 2 : 1 },
        shadowOpacity: isNew ? 0.1 : 0.04,
        shadowRadius: isNew ? 8 : 4,
        borderLeftWidth: isNew ? 3 : 0,
        borderLeftColor: isNew ? card.doctor_color : "transparent",
      }}
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
        <View className="flex-row items-center gap-1.5">
          {isNew && (
            <View className="w-2 h-2 rounded-full bg-blue-500" />
          )}
          <Text className="text-xs text-gray-300">{timeAgo(card.created_at)}</Text>
        </View>
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
              className="flex-1 bg-emerald-50 border border-emerald-200 rounded-xl py-2.5 items-center flex-row justify-center gap-1.5"
              onPress={() => onAction(card.id, "done")}
              disabled={isActing}
            >
              <Text className="text-emerald-700 font-semibold text-sm">
                {isActing ? "..." : "✅ Виконано"}
              </Text>
            </TouchableOpacity>
          )}
          {card.action_type === "chat" && (
            <TouchableOpacity
              className="flex-1 bg-blue-50 border border-blue-200 rounded-xl py-2.5 items-center"
              onPress={() => {
                onAction(card.id, "done");
                onChat?.(card.doctor_id);
              }}
            >
              <Text className="text-blue-700 font-semibold text-sm">💬 Поговорити</Text>
            </TouchableOpacity>
          )}
          {card.action_type === "photo" && (
            <TouchableOpacity
              className="flex-1 bg-violet-50 border border-violet-200 rounded-xl py-2.5 items-center"
              onPress={() => onAction(card.id, "done")}
            >
              <Text className="text-violet-700 font-semibold text-sm">📷 Сфотографувати</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            className="bg-gray-50 rounded-xl py-2.5 px-4 items-center"
            onPress={() => onAction(card.id, "dismiss")}
          >
            <Text className="text-gray-400 text-sm">✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Acted indicator */}
      {isActed && (
        <View className="flex-row items-center gap-1.5">
          <Text className="text-xs">
            {card.status === "acted" ? "✅" : "⏭"}
          </Text>
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

// ---- Date Header ----
function DateHeader({ date }: { date: string }) {
  return (
    <View className="flex-row items-center gap-2 mb-2 mt-4">
      <View className="flex-1 h-px bg-gray-200" />
      <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{formatDateHeader(date)}</Text>
      <View className="flex-1 h-px bg-gray-200" />
    </View>
  );
}

// ---- Main Screen ----
export default function Dashboard() {
  const { user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [achievementToast, setAchievementToast] = useState<AchievementToast | null>(null);
  const [feedOffset, setFeedOffset] = useState(0);
  const [allCards, setAllCards] = useState<AICard[]>([]);

  // Paginated feed
  const { data: cards, isLoading, isRefetching, refetch, isFetchingNextPage } = useQuery<AICard[]>({
    queryKey: ["ai-feed", feedOffset],
    queryFn: () => api.get(`/ai/feed?limit=20&offset=${feedOffset}`).then((r) => r.data),
    staleTime: 30_000,
  });

  // Merge pages
  useEffect(() => {
    if (cards) {
      if (feedOffset === 0) {
        setAllCards(cards);
      } else {
        setAllCards((prev) => {
          const existingIds = new Set(prev.map((c) => c.id));
          const newCards = cards.filter((c) => !existingIds.has(c.id));
          return [...prev, ...newCards];
        });
      }
    }
  }, [cards, feedOffset]);

  const loadMore = useCallback(() => {
    if (cards && cards.length >= 20) {
      setFeedOffset((prev) => prev + 20);
    }
  }, [cards]);

  const handleRefresh = useCallback(() => {
    setFeedOffset(0);
    refetch();
  }, []);

  const { data: doctors } = useQuery<Doctor[]>({
    queryKey: ["ai-doctors"],
    queryFn: () => api.get("/ai/feed/doctors").then((r) => r.data),
    staleTime: 300_000,
  });

  const { data: gamification } = useQuery<{
    score: number;
    streak: { type: string; emoji: string; current: number };
    achievements_unlocked: number;
    achievements_total: number;
    total_points: number;
  }>({
    queryKey: ["gamification-summary"],
    queryFn: () => api.get("/ai/gamification/summary").then((r) => r.data),
    staleTime: 60_000,
  });

  const actionMutation = useMutation({
    mutationFn: ({ cardId, action, data }: { cardId: string; action: string; data?: any }) =>
      api.post(`/ai/feed/${cardId}/action`, { action, data }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["ai-feed"] });
      queryClient.invalidateQueries({ queryKey: ["gamification-summary"] });
      // Show achievement toast if unlocked
      const achievements = res.data?.new_achievements;
      if (achievements && achievements.length > 0) {
        setAchievementToast(achievements[0]);
      }
    },
  });

  const generateMutation = useMutation({
    mutationFn: (roundType: string) =>
      api.post(`/ai/feed/generate?round_type=${roundType}`),
    onSuccess: () => {
      setTimeout(() => { setFeedOffset(0); refetch(); }, 20000);
    },
  });

  const handleAction = useCallback((cardId: string, action: string, data?: any) => {
    actionMutation.mutate({ cardId, action, data });
  }, []);

  const healthScore = gamification?.score ?? null;

  // Group cards by date, then by round
  type FeedSection = { type: "date"; date: string } | { type: "round"; roundType: string } | { type: "card"; card: AICard };
  const feedItems: FeedSection[] = [];

  let lastDate = "";
  const roundOrder = ["morning", "afternoon", "evening"];

  // Group by date first
  const cardsByDate: Record<string, Record<string, AICard[]>> = {};
  (allCards || []).forEach((card) => {
    const dateKey = new Date(card.created_at).toDateString();
    if (!cardsByDate[dateKey]) cardsByDate[dateKey] = {};
    if (!cardsByDate[dateKey][card.round_type]) cardsByDate[dateKey][card.round_type] = [];
    cardsByDate[dateKey][card.round_type].push(card);
  });

  // Build flat list with headers
  const sortedDates = Object.keys(cardsByDate).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  sortedDates.forEach((dateKey) => {
    feedItems.push({ type: "date", date: dateKey });
    const rounds = cardsByDate[dateKey];
    roundOrder.forEach((round) => {
      const roundCards = rounds[round];
      if (!roundCards || roundCards.length === 0) return;
      feedItems.push({ type: "round", roundType: round });
      roundCards.forEach((card) => {
        feedItems.push({ type: "card", card });
      });
    });
  });

  const hasCards = allCards.length > 0;

  const renderItem = ({ item }: { item: FeedSection }) => {
    if (item.type === "date") return <DateHeader date={item.date} />;
    if (item.type === "round") return <RoundHeader roundType={item.roundType} />;
    if (item.type === "card") return (
      <FeedCard
        card={item.card}
        onAction={handleAction}
        isActing={actionMutation.isPending}
        onChat={(doctorId) => router.push({ pathname: "/dashboard/chat", params: { doctorId } })}
      />
    );
    return null;
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Achievement toast */}
      {achievementToast && (
        <AchievementToastView
          achievement={achievementToast}
          onDismiss={() => setAchievementToast(null)}
        />
      )}

      <FlatList
        data={hasCards ? feedItems : []}
        keyExtractor={(item, i) => {
          if (item.type === "card") return item.card.id;
          return `${item.type}-${i}`;
        }}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Header */}
            <View className="flex-row justify-between items-center mb-2">
              <View className="flex-row items-center gap-3">
                <ScoreRing score={healthScore} />
                <View>
                  <Text className="text-sm text-gray-400">{getGreeting()}</Text>
                  <Text className="text-xl font-bold text-gray-900">{user?.name || "Користувач"}</Text>
                </View>
              </View>
              <View className="flex-row gap-2">
                {gamification?.streak && gamification.streak.current > 0 && (
                  <View className="bg-orange-50 rounded-xl px-3 py-2 flex-row items-center gap-1">
                    <Text className="text-sm">{gamification.streak.emoji}</Text>
                    <Text className="text-orange-600 font-bold text-sm">{gamification.streak.current}</Text>
                  </View>
                )}
                <TouchableOpacity
                  onPress={() => router.push("/(tabs)/dashboard/achievements")}
                  className="bg-amber-50 rounded-xl px-3 py-2"
                >
                  <Text className="text-amber-600 font-semibold text-sm">
                    🏆 {gamification?.achievements_unlocked ?? 0}/{gamification?.achievements_total ?? 0}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Doctor avatars */}
            {doctors && doctors.length > 0 && (
              <DoctorRow
                doctors={doctors}
                onPress={(id) => router.push({ pathname: "/dashboard/doctor-profile", params: { doctorId: id } })}
              />
            )}
          </>
        }
        ListEmptyComponent={
          !isLoading ? (
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
          ) : (
            <View className="items-center py-12">
              <ActivityIndicator size="large" color="#3b82f6" />
            </View>
          )
        }
        ListFooterComponent={
          hasCards ? (
            <View className="mt-2">
              {/* Load more indicator */}
              {isFetchingNextPage && (
                <ActivityIndicator size="small" color="#3b82f6" className="mb-3" />
              )}
              {/* Generate new round button */}
              <TouchableOpacity
                className="border border-dashed border-blue-300 rounded-2xl py-3.5 items-center bg-blue-50/50"
                onPress={() => {
                  const h = new Date().getHours();
                  const round = h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
                  generateMutation.mutate(round);
                }}
                disabled={generateMutation.isPending}
              >
                <Text className="text-blue-500 font-semibold text-sm">
                  {generateMutation.isPending ? "Генерую..." : "🔄 Запросити нові поради"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
