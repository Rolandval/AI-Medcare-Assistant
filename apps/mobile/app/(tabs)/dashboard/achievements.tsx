import {
  ScrollView, View, Text, TouchableOpacity, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from "react-native-svg";
import { api } from "@/services/api";

// ---- Types ----
interface Achievement {
  key: string;
  name: string;
  description: string;
  emoji: string;
  points: number;
  unlocked: boolean;
  unlocked_at: string | null;
}

interface Streak {
  type: string;
  label: string;
  emoji: string;
  current: number;
  best: number;
  active: boolean;
}

interface ScoreBreakdown {
  score: number;
  max: number;
  label: string;
}

interface GamificationData {
  score: number;
  score_breakdown: Record<string, ScoreBreakdown>;
  streaks: Streak[];
  achievements_unlocked: number;
  achievements_total: number;
  total_points: number;
}

// ---- Score Ring (large) ----
function LargeScoreRing({ score }: { score: number }) {
  const size = 140;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke="#f3f4f6" strokeWidth={strokeWidth} fill="transparent" />
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth={strokeWidth} fill="transparent"
          strokeDasharray={`${progress} ${circumference - progress}`} strokeLinecap="round" />
      </Svg>
      <View className="absolute items-center">
        <Text className="text-3xl font-bold text-gray-900">{score}</Text>
        <Text className="text-xs text-gray-400">з 100</Text>
      </View>
    </View>
  );
}

// ---- Score Category Bar ----
function CategoryBar({ label, score, max }: { label: string; score: number; max: number }) {
  const pct = max > 0 ? (score / max) * 100 : 0;
  const color = pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-400" : "bg-red-400";

  return (
    <View className="flex-row items-center mb-3">
      <Text className="text-xs text-gray-500 w-24">{label}</Text>
      <View className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden mx-2">
        <View className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </View>
      <Text className="text-xs font-semibold text-gray-700 w-10 text-right">{score}/{max}</Text>
    </View>
  );
}

// ---- Streak Card ----
function StreakCard({ streak }: { streak: Streak }) {
  return (
    <View className={`bg-white rounded-2xl p-4 mr-3 border ${streak.active ? "border-orange-200" : "border-gray-100"}`}
      style={{ width: 140 }}
    >
      <Text className="text-2xl mb-1">{streak.emoji}</Text>
      <Text className="text-2xl font-bold text-gray-900">{streak.current}</Text>
      <Text className="text-xs text-gray-500 mt-0.5">{streak.label}</Text>
      {streak.best > streak.current && (
        <Text className="text-xs text-gray-300 mt-1">Рекорд: {streak.best}</Text>
      )}
      {streak.active && (
        <View className="mt-2 bg-orange-50 rounded-full px-2 py-0.5 self-start">
          <Text className="text-xs text-orange-600 font-medium">Активна 🔥</Text>
        </View>
      )}
    </View>
  );
}

// ---- Achievement Badge ----
function AchievementBadge({ achievement }: { achievement: Achievement }) {
  const unlocked = achievement.unlocked;

  return (
    <View className={`bg-white rounded-2xl p-4 mb-3 border ${unlocked ? "border-amber-200" : "border-gray-100"}`}>
      <View className="flex-row items-center">
        <View className={`w-14 h-14 rounded-2xl items-center justify-center mr-3 ${
          unlocked ? "bg-amber-50" : "bg-gray-100"
        }`}>
          <Text className={`text-2xl ${unlocked ? "" : "opacity-30"}`}>{achievement.emoji}</Text>
        </View>
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className={`text-sm font-bold ${unlocked ? "text-gray-900" : "text-gray-400"}`}>
              {achievement.name}
            </Text>
            {unlocked && (
              <View className="bg-amber-50 rounded-full px-2 py-0.5">
                <Text className="text-xs text-amber-600 font-medium">+{achievement.points} ⭐</Text>
              </View>
            )}
          </View>
          <Text className={`text-xs mt-0.5 ${unlocked ? "text-gray-500" : "text-gray-300"}`}>
            {achievement.description}
          </Text>
          {unlocked && achievement.unlocked_at && (
            <Text className="text-xs text-gray-300 mt-1">
              {new Date(achievement.unlocked_at).toLocaleDateString("uk-UA")}
            </Text>
          )}
        </View>
        {unlocked && <Text className="text-xl">✅</Text>}
      </View>
    </View>
  );
}

// ---- Main Screen ----
export default function AchievementsScreen() {
  const router = useRouter();

  const { data, isLoading } = useQuery<GamificationData>({
    queryKey: ["gamification-full"],
    queryFn: async () => {
      const [summary, achievements] = await Promise.all([
        api.get("/ai/gamification/summary").then((r) => r.data),
        api.get("/ai/gamification/achievements").then((r) => r.data),
      ]);
      return { ...summary, achievements };
    },
  });

  const { data: achievements = [] } = useQuery<Achievement[]>({
    queryKey: ["achievements-list"],
    queryFn: () => api.get("/ai/gamification/achievements").then((r) => r.data),
  });

  if (isLoading || !data) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#f59e0b" />
      </SafeAreaView>
    );
  }

  const unlockedAchievements = achievements.filter((a) => a.unlocked);
  const lockedAchievements = achievements.filter((a) => !a.unlocked);

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient colors={["#fef3c7", "#fffbeb", "#f9fafb"]} className="pb-4 pt-2">
          <TouchableOpacity onPress={() => router.back()} className="flex-row items-center px-4 py-2 mb-2">
            <Text className="text-lg text-gray-600">← Назад</Text>
          </TouchableOpacity>

          {/* Score */}
          <View className="items-center mb-4">
            <LargeScoreRing score={data.score} />
            <Text className="text-lg font-bold text-gray-900 mt-2">Health Score</Text>
            <Text className="text-sm text-gray-500">Твій загальний показник здоров'я</Text>
          </View>

          {/* Points badge */}
          <View className="flex-row justify-center gap-4 mb-2">
            <View className="bg-white/80 rounded-2xl px-4 py-2 flex-row items-center gap-1.5">
              <Text className="text-sm">⭐</Text>
              <Text className="text-sm font-bold text-gray-900">{data.total_points}</Text>
              <Text className="text-xs text-gray-500">очків</Text>
            </View>
            <View className="bg-white/80 rounded-2xl px-4 py-2 flex-row items-center gap-1.5">
              <Text className="text-sm">🏆</Text>
              <Text className="text-sm font-bold text-gray-900">{data.achievements_unlocked}</Text>
              <Text className="text-xs text-gray-500">з {data.achievements_total}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Score Breakdown */}
        <View className="px-5 mb-5">
          <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Розбивка балів
          </Text>
          <View className="bg-white rounded-2xl p-4 border border-gray-100">
            {Object.values(data.score_breakdown).map((cat) => (
              <CategoryBar key={cat.label} label={cat.label} score={cat.score} max={cat.max} />
            ))}
          </View>
        </View>

        {/* Streaks */}
        {data.streaks.length > 0 && (
          <View className="mb-5">
            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-5">
              Серії
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
              {data.streaks.map((s) => (
                <StreakCard key={s.type} streak={s} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Achievements — Unlocked */}
        <View className="px-5 mb-4">
          <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Досягнення ({unlockedAchievements.length}/{achievements.length})
          </Text>

          {unlockedAchievements.map((a) => (
            <AchievementBadge key={a.key} achievement={a} />
          ))}

          {/* Locked */}
          {lockedAchievements.length > 0 && (
            <>
              <Text className="text-xs text-gray-300 uppercase tracking-wider mb-3 mt-2">
                Ще не відкриті
              </Text>
              {lockedAchievements.map((a) => (
                <AchievementBadge key={a.key} achievement={a} />
              ))}
            </>
          )}
        </View>

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
