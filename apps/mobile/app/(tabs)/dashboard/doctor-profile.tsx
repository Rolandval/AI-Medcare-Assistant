import { useState } from "react";
import {
  ScrollView, View, Text, TouchableOpacity, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "@/services/api";

// ---- Types ----
interface DoctorProfile {
  id: string;
  name: string;
  specialty: string;
  emoji: string;
  color: string;
  personality: string;
  motto: string;
  card_count: number;
  chat_count: number;
  recent_cards: CardItem[];
}

interface CardItem {
  id: string;
  card_type: string;
  round_type: string;
  title: string;
  body: string;
  status: string;
  created_at: string;
}

// ---- Helpers ----
function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("uk-UA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Нова", color: "text-blue-700", bg: "bg-blue-50" },
  seen: { label: "Переглянуто", color: "text-gray-600", bg: "bg-gray-100" },
  acted: { label: "Виконано", color: "text-emerald-700", bg: "bg-emerald-50" },
  dismissed: { label: "Відхилено", color: "text-red-600", bg: "bg-red-50" },
};

const CARD_TYPE_LABELS: Record<string, string> = {
  insight: "💡 Інсайт",
  challenge: "🎯 Виклик",
  survey: "📋 Опитування",
  meal_suggestion: "🥗 Порада з їжі",
  chat_prompt: "💬 Розмова",
  achievement: "🏆 Досягнення",
  alert: "🚨 Увага",
  report: "📊 Звіт",
};

// ---- Stat Box ----
function StatBox({ value, label }: { value: number; label: string }) {
  return (
    <View className="flex-1 bg-white/80 rounded-2xl py-4 items-center mx-1.5">
      <Text className="text-2xl font-bold text-gray-900">{value}</Text>
      <Text className="text-xs text-gray-500 mt-0.5">{label}</Text>
    </View>
  );
}

// ---- Card History Item ----
function CardHistoryItem({ card }: { card: CardItem }) {
  const status = STATUS_LABELS[card.status] || STATUS_LABELS.pending;
  const typeLabel = CARD_TYPE_LABELS[card.card_type] || card.card_type;

  return (
    <View className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-xs text-gray-400">{typeLabel}</Text>
        <View className={`px-2 py-0.5 rounded-full ${status.bg}`}>
          <Text className={`text-xs font-medium ${status.color}`}>{status.label}</Text>
        </View>
      </View>
      <Text className="text-sm font-semibold text-gray-900 mb-1">{card.title}</Text>
      <Text className="text-xs text-gray-500 leading-5" numberOfLines={2}>{card.body}</Text>
      <Text className="text-xs text-gray-300 mt-2">{formatDate(card.created_at)}</Text>
    </View>
  );
}

// ---- Main Screen ----
export default function DoctorProfileScreen() {
  const { doctorId } = useLocalSearchParams<{ doctorId: string }>();
  const router = useRouter();

  const { data: profile, isLoading } = useQuery<DoctorProfile>({
    queryKey: ["doctor-profile", doctorId],
    queryFn: () => api.get(`/ai/feed/doctors/${doctorId}`).then((r) => r.data),
    enabled: !!doctorId,
  });

  if (isLoading || !profile) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header with gradient */}
        <LinearGradient
          colors={[profile.color + "20", profile.color + "08", "#f9fafb"]}
          className="pb-6 pt-2"
        >
          {/* Back button */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="flex-row items-center px-4 py-2 mb-4"
          >
            <Text className="text-lg text-gray-600">← Назад</Text>
          </TouchableOpacity>

          {/* Avatar */}
          <View className="items-center">
            <View
              className="w-24 h-24 rounded-3xl items-center justify-center mb-3 shadow-md"
              style={{ backgroundColor: profile.color + "20" }}
            >
              <Text className="text-5xl">{profile.emoji}</Text>
            </View>

            <Text className="text-2xl font-bold text-gray-900">{profile.name}</Text>
            <Text className="text-sm text-gray-500 mt-0.5">{profile.specialty}</Text>

            <View className="bg-white/70 rounded-full px-4 py-1.5 mt-2">
              <Text className="text-xs text-gray-600 italic">"{profile.motto}"</Text>
            </View>
          </View>

          {/* Stats */}
          <View className="flex-row px-6 mt-5">
            <StatBox value={profile.card_count} label="Порад" />
            <StatBox value={profile.chat_count} label="Чатів" />
          </View>
        </LinearGradient>

        {/* Chat button */}
        <View className="px-5 -mt-1 mb-4">
          <TouchableOpacity
            onPress={() => router.push({ pathname: "/dashboard/chat", params: { doctorId: profile.id } })}
            className="overflow-hidden rounded-2xl shadow-md"
          >
            <LinearGradient
              colors={[profile.color, profile.color + "CC"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              className="py-4 items-center"
            >
              <Text className="text-white font-bold text-base">💬 Запитати {profile.name}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Personality */}
        <View className="px-5 mb-5">
          <View className="bg-white rounded-2xl p-4 border border-gray-100">
            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Характер</Text>
            <Text className="text-sm text-gray-700 leading-5">{profile.personality}</Text>
          </View>
        </View>

        {/* Recent cards */}
        <View className="px-5 pb-8">
          <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Останні поради
          </Text>

          {profile.recent_cards.length === 0 ? (
            <View className="bg-white rounded-2xl p-6 items-center border border-gray-100">
              <Text className="text-3xl mb-2">📭</Text>
              <Text className="text-sm text-gray-400">Поки що немає порад</Text>
            </View>
          ) : (
            profile.recent_cards.map((card) => (
              <CardHistoryItem key={card.id} card={card} />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
