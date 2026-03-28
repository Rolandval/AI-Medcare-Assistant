import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
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
    <LinearGradient colors={["#eff6ff", "#ffffff"]} className="flex-1">
      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <View className="flex-1 px-6 pt-6">
            <TouchableOpacity onPress={() => router.back()} className="mb-8 py-1">
              <Text className="text-blue-500 text-base font-medium">← Назад</Text>
            </TouchableOpacity>

            <View className="w-16 h-16 rounded-2xl bg-blue-50 items-center justify-center mb-6">
              <Text className="text-3xl">🩺</Text>
            </View>

            <Text className="text-3xl font-bold text-gray-900 mb-1">Вхід</Text>
            <Text className="text-sm text-gray-400 mb-8">Введи свої дані</Text>

            <View className="gap-4 mb-8">
              <View>
                <Text className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">Email</Text>
                <TextInput
                  className="bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-base text-gray-900"
                  placeholder="your@email.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View>
                <Text className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">Пароль</Text>
                <TextInput
                  className="bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-base text-gray-900"
                  placeholder="Мінімум 8 символів"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>
            </View>

            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={loading ? ["#93c5fd", "#93c5fd"] : ["#3b82f6", "#2563eb"]}
                className="rounded-2xl py-4 items-center"
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text className="text-white text-lg font-bold">
                  {loading ? "Входимо..." : "Увійти"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity className="mt-6 items-center" onPress={() => router.push("/(auth)/register")}>
              <Text className="text-sm text-gray-400">
                Немає акаунту?{" "}
                <Text className="text-blue-500 font-semibold">Зареєструватись</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}
