// screens/ProfileScreen.js
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { useSession } from "../hooks/useSession";

const BLUE = "#1447E6";

export default function ProfileScreen({ navigation }) {
  const { profile, fullName, logout } = useSession();

  const handleLogout = async () => {
    await logout();
    navigation.replace("Login"); // O la pantalla que uses para login
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile?.first_name?.[0] ?? "?"}
            </Text>
          </View>
          <Text style={styles.name}>{fullName || "Usuario"}</Text>
          <Text style={styles.email}>{profile?.email || "sin email"}</Text>
        </View>

        {/* Info Simple */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Rol</Text>
            <Text style={styles.infoValue}>
              {profile?.role?.replace("_", " ")?.toUpperCase() || "—"}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Estado</Text>
            <Text
              style={[
                styles.infoValue,
                profile?.is_active
                  ? styles.activeStatus
                  : styles.inactiveStatus,
              ]}
            >
              {profile?.is_active ? "Activo" : "Inactivo"}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Versión</Text>
            <Text style={styles.infoValue}>v1.1.1</Text>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Nova Tech SA 2026</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    paddingBottom: 80,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 32,
    marginTop: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: BLUE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  avatarText: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "800",
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
  },
  email: {
    fontSize: 13,
    color: "#94a3b8",
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  infoLabel: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "600",
  },
  infoValue: {
    fontSize: 14,
    color: "#1e293b",
    fontWeight: "700",
  },
  activeStatus: {
    color: "#16a34a",
  },
  inactiveStatus: {
    color: "#dc2626",
  },
  divider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginHorizontal: 16,
  },
  logoutBtn: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 12,
    paddingVertical: 12,
    backgroundColor: "#fef2f2",
    marginBottom: 20,
  },
  logoutText: {
    color: "#dc2626",
    fontWeight: "700",
    fontSize: 14,
  },
  footer: {
    alignItems: "center",
    paddingVertical: 16,
  },
  footerText: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "600",
  },
});