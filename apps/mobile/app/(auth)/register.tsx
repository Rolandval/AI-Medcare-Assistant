import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useAuthStore } from "@/store/authStore";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuthStore();

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert("Помилка", "Заповни всі поля");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Помилка", "Пароль мінімум 8 символів");
      return;
    }
    setLoading(true);
    try {
      await register(name.trim(), email.toLowerCase().trim(), password);
      router.replace("/(tabs)/dashboard");
    } catch (e: any) {
      Alert.alert("Помилка", e.response?.data?.detail || "Спробуй ще раз");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={["#f0fdf4", "#ffffff"]} className="flex-1">
      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
          <ScrollView className="flex-1 px-6 pt-6">
            <TouchableOpacity onPress={() => router.back()} className="mb-8 py-1">
              <Text className="text-blue-500 text-base font-medium">← Назад</Text>
            </TouchableOpacity>

            <View className="w-16 h-16 rounded-2xl bg-emerald-50 items-center justify-center mb-6">
              <Text className="text-3xl">✨</Text>
            </View>

            <Text className="text-3xl font-bold text-gray-900 mb-1">Реєстрація</Text>
            <Text className="text-sm text-gray-400 mb-8">Створи свій акаунт</Text>

            <View className="gap-4 mb-8">
              <View>
                <Text className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">Твоє ім'я</Text>
                <TextInput
                  className="bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-base"
                  placeholder="Ім'я Прізвище"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>

              <View>
                <Text className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">Email</Text>
                <TextInput
                  className="bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-base"
                  placeholder="your@email.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View>
                <Text className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">Пароль</Text>
                <TextInput
                  className="bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-base"
                  placeholder="Мінімум 8 символів"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>
            </View>

            <TouchableOpacity
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={loading ? ["#86efac", "#86efac"] : ["#10b981", "#059669"]}
                className="rounded-2xl py-4 items-center mb-6"
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text className="text-white text-lg font-bold">
                  {loading ? "Реєструємось..." : "Створити акаунт"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity className="mb-10 items-center" onPress={() => router.push("/(auth)/login")}>
              <Text className="text-sm text-gray-400">
                Вже є акаунт?{" "}
                <Text className="text-blue-500 font-semibold">Увійти</Text>
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}
