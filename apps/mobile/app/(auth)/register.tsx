import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
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
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        <ScrollView className="flex-1 px-8 pt-8">
          <TouchableOpacity onPress={() => router.back()} className="mb-8">
            <Text className="text-blue-500 text-lg">← Назад</Text>
          </TouchableOpacity>

          <Text className="text-3xl font-bold text-gray-900 mb-2">Реєстрація</Text>
          <Text className="text-base text-gray-500 mb-10">Створи свій акаунт</Text>

          <View className="gap-4 mb-8">
            <View>
              <Text className="text-base font-medium text-gray-700 mb-2">Твоє ім'я</Text>
              <TextInput
                className="border-2 border-gray-200 rounded-xl px-4 py-4 text-base"
                placeholder="Ім'я Прізвище"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>

            <View>
              <Text className="text-base font-medium text-gray-700 mb-2">Email</Text>
              <TextInput
                className="border-2 border-gray-200 rounded-xl px-4 py-4 text-base"
                placeholder="your@email.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View>
              <Text className="text-base font-medium text-gray-700 mb-2">Пароль</Text>
              <TextInput
                className="border-2 border-gray-200 rounded-xl px-4 py-4 text-base"
                placeholder="Мінімум 8 символів"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
          </View>

          <TouchableOpacity
            className={`w-full rounded-2xl py-4 items-center mb-6 ${loading ? "bg-blue-300" : "bg-blue-500"}`}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text className="text-white text-lg font-semibold">
              {loading ? "Реєструємось..." : "Створити акаунт"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity className="mb-10 items-center" onPress={() => router.push("/(auth)/login")}>
            <Text className="text-base text-gray-500">
              Вже є акаунт?{" "}
              <Text className="text-blue-500 font-semibold">Увійти</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
