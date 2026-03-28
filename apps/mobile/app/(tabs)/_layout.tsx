import { Tabs } from "expo-router";
import { Text, View } from "react-native";

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View className="items-center pt-2 w-16">
      <View className={`w-11 h-11 rounded-2xl items-center justify-center mb-0.5 ${
        focused ? "bg-blue-50" : "bg-transparent"
      }`}>
        <Text className={focused ? "text-2xl" : "text-xl opacity-50"}>{emoji}</Text>
      </View>
      <Text className={`text-xs ${focused ? "text-blue-600 font-bold" : "text-gray-400"}`}>
        {label}
      </Text>
      {focused && (
        <View className="w-5 h-1 rounded-full bg-blue-500 mt-1" />
      )}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: 88,
          paddingBottom: 8,
          paddingTop: 4,
          backgroundColor: "#ffffff",
          borderTopWidth: 0,
          elevation: 20,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="📊" label="Стан" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="🍽" label="Їжа" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="documents"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="📋" label="Аналізи" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="family"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="👨‍👩‍👧‍👦" label="Сім'я" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" label="Профіль" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
