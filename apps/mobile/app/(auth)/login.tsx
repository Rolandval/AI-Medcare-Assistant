import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@/store/authStore";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Помилка", "Введи email та пароль");
      return;
    }
    setLoading(true);
    try {
      await login(email.toLowerCase().trim(), password);
      router.replace("/(tabs)/dashboard");
    } catch (e: any) {
      Alert.alert("Помилка входу", e.response?.data?.detail || "Невірний email або пароль");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 px-8 pt-8">
          <TouchableOpacity onPress={() => router.back()} className="mb-8">
            <Text className="text-blue-500 text-lg">← Назад</Text>
          </TouchableOpacity>

          <Text className="text-3xl font-bold text-gray-900 mb-2">Вхід</Text>
          <Text className="text-base text-gray-500 mb-10">Введи свої дані</Text>

          <View className="gap-4 mb-8">
            <View>
              <Text className="text-base font-medium text-gray-700 mb-2">Email</Text>
              <TextInput
                className="border-2 border-gray-200 rounded-xl px-4 py-4 text-base text-gray-900"
                placeholder="your@email.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View>
              <Text className="text-base font-medium text-gray-700 mb-2">Пароль</Text>
              <TextInput
                className="border-2 border-gray-200 rounded-xl px-4 py-4 text-base text-gray-900"
                placeholder="Мінімум 8 символів"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
          </View>

          <TouchableOpacity
            className={`w-full rounded-2xl py-4 items-center ${loading ? "bg-blue-300" : "bg-blue-500"}`}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text className="text-white text-lg font-semibold">
              {loading ? "Входимо..." : "Увійти"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity className="mt-6 items-center" onPress={() => router.push("/(auth)/register")}>
            <Text className="text-base text-gray-500">
              Немає акаунту?{" "}
              <Text className="text-blue-500 font-semibold">Зареєструватись</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
