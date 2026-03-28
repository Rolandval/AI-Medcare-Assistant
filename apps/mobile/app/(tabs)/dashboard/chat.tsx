import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList, View, Text, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "@/services/api";
import { DOCTORS } from "@/constants/doctors";

// ---- Types ----
interface ChatMessage {
  id: string;
  doctor_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

// ---- Message Bubble ----
function MessageBubble({ msg, doctorEmoji }: { msg: ChatMessage; doctorEmoji: string }) {
  const isUser = msg.role === "user";

  return (
    <View className={`flex-row mb-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <View className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center mr-2 mt-1">
          <Text className="text-sm">{doctorEmoji}</Text>
        </View>
      )}
      <View
        className={`max-w-[78%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-blue-500 rounded-tr-md"
            : "bg-white border border-gray-100 rounded-tl-md shadow-sm"
        }`}
      >
        <Text
          className={`text-sm leading-5 ${isUser ? "text-white" : "text-gray-800"}`}
        >
          {msg.content}
        </Text>
        <Text
          className={`text-xs mt-1.5 ${isUser ? "text-blue-200" : "text-gray-300"}`}
        >
          {new Date(msg.created_at).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })}
        </Text>
      </View>
    </View>
  );
}

// ---- Typing Indicator ----
function TypingIndicator({ emoji }: { emoji: string }) {
  return (
    <View className="flex-row items-center mb-3">
      <View className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center mr-2">
        <Text className="text-sm">{emoji}</Text>
      </View>
      <View className="bg-white border border-gray-100 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
        <View className="flex-row items-center gap-1">
          <View className="w-2 h-2 rounded-full bg-gray-300 animate-pulse" />
          <View className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" />
          <View className="w-2 h-2 rounded-full bg-gray-300 animate-pulse" />
        </View>
      </View>
    </View>
  );
}

// ---- Main Screen ----
export default function ChatScreen() {
  const { doctorId } = useLocalSearchParams<{ doctorId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const flatListRef = useRef<FlatList>(null);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);

  const doctor = DOCTORS[doctorId] || DOCTORS.therapist;

  // Fetch chat history
  const { data: messages = [], isLoading } = useQuery<ChatMessage[]>({
    queryKey: ["chat-history", doctorId],
    queryFn: () => api.get(`/ai/chat/${doctorId}/history`).then((r) => r.data),
    enabled: !!doctorId,
  });

  // Send message mutation (non-streaming for mobile simplicity)
  const sendMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await api.post(`/ai/chat/${doctorId}/sync`, { message });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-history", doctorId] });
    },
  });

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isSending) return;

    setInputText("");
    setIsSending(true);

    // Optimistic: add user message locally
    const optimisticUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      doctor_id: doctorId,
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };

    queryClient.setQueryData<ChatMessage[]>(
      ["chat-history", doctorId],
      (old = []) => [...old, optimisticUserMsg]
    );

    try {
      await sendMutation.mutateAsync(text);
    } finally {
      setIsSending(false);
    }
  }, [inputText, isSending, doctorId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, isSending]);

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      {/* Header */}
      <LinearGradient
        colors={[doctor.color + "15", "#f9fafb"]}
        className="flex-row items-center px-4 py-3 border-b border-gray-100"
      >
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Text className="text-lg text-gray-600">←</Text>
        </TouchableOpacity>
        <View
          className="w-10 h-10 rounded-2xl items-center justify-center mr-3"
          style={{ backgroundColor: doctor.color + "20" }}
        >
          <Text className="text-xl">{doctor.emoji}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-base font-bold text-gray-900">{doctor.name}</Text>
          <Text className="text-xs text-gray-500">{doctor.specialty}</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push({ pathname: "/dashboard/doctor-profile", params: { doctorId } })}
          className="px-3 py-1.5 bg-gray-100 rounded-full"
        >
          <Text className="text-xs text-gray-600">Профіль</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Messages */}
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={doctor.color} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <MessageBubble msg={item} doctorEmoji={doctor.emoji} />
            )}
            contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View className="items-center justify-center py-20">
                <View
                  className="w-20 h-20 rounded-3xl items-center justify-center mb-4"
                  style={{ backgroundColor: doctor.color + "15" }}
                >
                  <Text className="text-4xl">{doctor.emoji}</Text>
                </View>
                <Text className="text-base font-semibold text-gray-900 mb-1">
                  Привіт! Я {doctor.name}
                </Text>
                <Text className="text-sm text-gray-500 text-center px-10 leading-5">
                  {doctor.specialty}. Запитай мене що завгодно про своє здоров'я!
                </Text>
              </View>
            }
            ListFooterComponent={
              isSending ? <TypingIndicator emoji={doctor.emoji} /> : null
            }
          />
        )}

        {/* Input */}
        <View className="px-4 py-3 bg-white border-t border-gray-100">
          <View className="flex-row items-end bg-gray-50 rounded-2xl border border-gray-200 px-4">
            <TextInput
              className="flex-1 py-3 text-sm text-gray-900 max-h-24"
              placeholder="Напиши повідомлення..."
              placeholderTextColor="#9ca3af"
              value={inputText}
              onChangeText={setInputText}
              multiline
              onSubmitEditing={handleSend}
              editable={!isSending}
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={!inputText.trim() || isSending}
              className={`ml-2 mb-2.5 w-9 h-9 rounded-full items-center justify-center ${
                inputText.trim() && !isSending ? "" : "opacity-40"
              }`}
              style={{ backgroundColor: inputText.trim() && !isSending ? doctor.color : "#e5e7eb" }}
            >
              <Text className="text-white text-base font-bold">➤</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
