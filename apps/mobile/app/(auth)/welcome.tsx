import { View, Text, TouchableOpacity, Image } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Welcome() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center px-8">

        {/* Logo */}
        <View className="w-24 h-24 rounded-full bg-blue-500 items-center justify-center mb-8">
          <Text className="text-5xl">🩺</Text>
        </View>

        {/* Title */}
        <Text className="text-3xl font-bold text-gray-900 text-center mb-3">
          AI-Medcare
        </Text>
        <Text className="text-lg text-gray-500 text-center mb-12">
          Твій персональний{"\n"}сімейний лікар
        </Text>

        {/* Features */}
        <View className="w-full mb-12 gap-4">
          {[
            { icon: "🏥", text: "Команда AI-лікарів для аналізу" },
            { icon: "🍽", text: "Харчування та меню для сім'ї" },
            { icon: "📊", text: "Динаміка показників здоров'я" },
            { icon: "📱", text: "Щоденні нагадування в Telegram" },
          ].map((item, i) => (
            <View key={i} className="flex-row items-center gap-3">
              <Text className="text-2xl">{item.icon}</Text>
              <Text className="text-base text-gray-700">{item.text}</Text>
            </View>
          ))}
        </View>

        {/* Buttons */}
        <TouchableOpacity
          className="w-full bg-blue-500 rounded-2xl py-4 mb-4 items-center"
          onPress={() => router.push("/(auth)/register")}
        >
          <Text className="text-white text-lg font-semibold">Розпочати безкоштовно</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="w-full border-2 border-blue-500 rounded-2xl py-4 items-center"
          onPress={() => router.push("/(auth)/login")}
        >
          <Text className="text-blue-500 text-lg font-semibold">Вже є акаунт</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}
