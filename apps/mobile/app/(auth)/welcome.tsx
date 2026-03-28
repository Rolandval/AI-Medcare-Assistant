import { View, Text, TouchableOpacity, Dimensions } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");

const FEATURES = [
  { icon: "🏥", title: "AI-лікар", desc: "Персональний аналіз здоров'я" },
  { icon: "🍽", title: "Харчування", desc: "AI розпізнає калорії з фото" },
  { icon: "📊", title: "Динаміка", desc: "Графіки та тренди показників" },
  { icon: "💊", title: "Нагадування", desc: "Ліки та опитування вчасно" },
];

export default function Welcome() {
  return (
    <LinearGradient colors={["#eff6ff", "#ffffff", "#f0fdf4"]} className="flex-1">
      <SafeAreaView className="flex-1">
        <View className="flex-1 items-center justify-center px-6">

          {/* Logo */}
          <View className="mb-6 items-center">
            <LinearGradient
              colors={["#3b82f6", "#2563eb"]}
              className="w-28 h-28 rounded-full items-center justify-center"
              style={{ elevation: 8, shadowColor: "#3b82f6", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 }}
            >
              <Text className="text-5xl">🩺</Text>
            </LinearGradient>
          </View>

          {/* Title */}
          <Text className="text-3xl font-bold text-gray-900 text-center mb-1">
            AI-Medcare
          </Text>
          <Text className="text-lg text-gray-400 text-center mb-10 tracking-wide">
            Твій персональний сімейний лікар
          </Text>

          {/* Feature Cards */}
          <View className="w-full mb-10">
            <View className="flex-row flex-wrap gap-3">
              {FEATURES.map((item, i) => (
                <View
                  key={i}
                  className="bg-white rounded-2xl p-4 border border-gray-100"
                  style={{
                    width: (width - 60) / 2,
                    elevation: 2,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.06,
                    shadowRadius: 6,
                  }}
                >
                  <View className="w-10 h-10 rounded-xl bg-blue-50 items-center justify-center mb-3">
                    <Text className="text-xl">{item.icon}</Text>
                  </View>
                  <Text className="text-base font-semibold text-gray-900 mb-0.5">{item.title}</Text>
                  <Text className="text-xs text-gray-400">{item.desc}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Buttons */}
          <View className="w-full gap-3">
            <TouchableOpacity
              onPress={() => router.push("/(auth)/register")}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={["#3b82f6", "#2563eb"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="rounded-2xl py-4 items-center"
                style={{ elevation: 4, shadowColor: "#3b82f6", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 8 }}
              >
                <Text className="text-white text-lg font-bold tracking-wide">Розпочати безкоштовно</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              className="w-full bg-white border border-gray-200 rounded-2xl py-4 items-center"
              onPress={() => router.push("/(auth)/login")}
              activeOpacity={0.7}
            >
              <Text className="text-gray-700 text-lg font-semibold">Вже є акаунт</Text>
            </TouchableOpacity>
          </View>

        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
