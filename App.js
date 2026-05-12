// App.js
import "react-native-url-polyfill/auto";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, StyleSheet } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useSession } from "./hooks/useSession";
import SplashScreen from "./screens/SplashScreen";
import LoginScreen from "./screens/LoginScreen";
import TicketsScreen from "./screens/TicketsScreen";
import ChatScreen from "./screens/ChatScreen";
import ProfileScreen from "./screens/ProfileScreen";
import PersonalFormScreen from "./screens/PersonalFormScreen";
import NewTicketScreen from "./screens/NewTicketScreen";


const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const BLUE = "#1447E6";

// ── Tickets Stack (Tickets → Chat → PersonalForm) ────────────────────────────
function TicketsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: "#ffffff",
          marginTop: 30
        },
      }}
    >
      <Stack.Screen
        name="TicketsList"
        component={TicketsScreen}
      />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={({ route }) => ({
          title: route.params?.ticket?.subject ?? "",
          headerTitleStyle: { fontSize: 16, fontWeight: "700", color: "#1e293b" },
        })}
      />
      <Stack.Screen
        name="NewTicket"
        component={NewTicketScreen}
        options={{
          title: "Nuevo Ticket",
          headerShown: true,
          headerTitleStyle: { fontSize: 16, fontWeight: "700", color: "#1e293b" },
        }}
      />
      <Stack.Screen
        name="PersonalForm"
        component={PersonalFormScreen}
        options={{
          title: "Formulario Personal",
          headerTitleStyle: { fontSize: 16, fontWeight: "700", color: "#1e293b" },
        }}
      />
    </Stack.Navigator>
  );
}

// ── Custom Tab Bar Icon ─────────────────────────────────────
const TabBarIcon = ({ focused, iconName }) => {
  return (
    <View
      style={[
        styles.iconContainer,
        {
          borderColor: focused ? BLUE : "#cbd5e1",
          borderWidth: focused ? 1.5 : 1,
        },
      ]}
    >
      <MaterialIcons
        name={iconName}
        size={23}
        color={focused ? BLUE : "#cbd5e1"}
      />
    </View>
  );
};

// ── Main Tabs ─────────────────────────────────────────────────
function MainTabs({ logout }) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: BLUE,
        tabBarInactiveTintColor: "#cbd5e1",
        tabBarStyle: {
          borderTopColor: "#e2e8f0",
          borderTopWidth: 1,
          elevation: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          backgroundColor: "#fff",
          height: 70,
          paddingBottom: 12,
          paddingTop: 8,

        },
        tabBarLabelStyle: {
          fontWeight: "600",
          fontSize: 11,
          marginTop: 6,
        },
      }}
    >
      <Tab.Screen
        name="TicketsTab"
        options={{
          tabBarLabel: "Tickets",
          tabBarIcon: ({ focused }) => (
            <TabBarIcon focused={focused} iconName="assignment" />
          ),
        }}
      >
        {() => <TicketsStack />}
      </Tab.Screen>
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarLabel: "Perfil",
          tabBarIcon: ({ focused }) => (
            <TabBarIcon focused={focused} iconName="person" />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// ── Root ──────────────────────────────────────────────────────
export default function App() {
  const { session, profile, loading, logout } = useSession();

  if (loading || (session && !profile)) {
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />

        <Stack.Screen name="Root">
          {() =>
            session && profile ? (
              <MainTabs logout={logout} />
            ) : (
              <LoginScreen />
            )
          }
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});