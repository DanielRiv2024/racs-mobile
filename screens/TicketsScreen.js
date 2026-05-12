// screens/TicketsScreen.js
import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { supabase } from "../lib/supabase";
import { useSession } from "../hooks/useSession";


const BLUE = "#1447E6";

const STATUS_CONFIG = {
  open: { label: "Abierto", bg: "#fef9c3", color: "#ca8a04", dot: "#facc15" },
  in_progress: {
    label: "En Proceso",
    bg: "#eff6ff",
    color: "#1447E6",
    dot: "#1447E6",
  },
  resolved: {
    label: "Activado",
    bg: "#f0fdf4",
    color: "#16a34a",
    dot: "#22c55e",
  },
  rejected: {
    label: "Rechazado",
    bg: "#fef2f2",
    color: "#dc2626",
    dot: "#f87171",
  },
};

export default function TicketsScreen({ navigation }) {
  const { profile } = useSession();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  // ── Realtime: nuevos tickets y actualizaciones ────────────
  useEffect(() => {
    if (!profile?.id) return;

    let mounted = true;

    const setupChannel = async () => {
      const channel = supabase
        .channel(`my_tickets_realtime_${profile.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "tickets",
            filter: `user_id=eq.${profile.id}`,
          },
          (payload) => {
            if (mounted) {
              fetchTickets();
            }
          }
        )
        .subscribe();

      return channel;
    };

    let channel;
    setupChannel().then((ch) => {
      channel = ch;
    });

    return () => {
      mounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [profile?.id]);

  // ── Fetch desde la vista my_tickets ──────────────────────
  const fetchTickets = async () => {
    const { data, error } = await supabase.from("my_tickets").select("*");

    if (!error) setTickets(data ?? []);
    setLoading(false);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTickets();
    setRefreshing(false);
  }, []);

const renderTicket = ({ item }) => {
  const s = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.open;

  const assignedName = item.assigned_first_name
    ? `${item.assigned_first_name} ${item.assigned_last_name ?? ""}`.trim()
    : null;

  // Último mensaje
  const lastMessage = item.last_message_content || "Sin mensajes";
  const lastMessageTime = item.last_message_at
    ? new Date(item.last_message_at).toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : new Date(item.created_at).toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      });

  const hasUnread = item.unread_count > 0;

  return (
    <TouchableOpacity
      style={styles.ticketCard}
      onPress={() => navigation.navigate("Chat", { ticket: item })}
      activeOpacity={0.7}
    >
      {/* Top: subject + time + status */}
      <View style={styles.ticketTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.ticketSubject} numberOfLines={1}>
            {item.subject}
          </Text>
        </View>
        <View style={styles.timeAndStatus}>
          <Text style={styles.ticketTime}>{lastMessageTime}</Text>
          <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: s.dot }]} />
            <Text style={[styles.statusLabel, { color: s.color }]}>
              {s.label}
            </Text>
          </View>
        </View>
      </View>

      {/* Last message */}
      <View style={styles.messageRow}>
        <Text 
          style={[
            styles.ticketMessage,
            hasUnread && styles.ticketMessageUnread
          ]} 
          numberOfLines={1}
        >
          {lastMessage}
        </Text>
        {hasUnread && <View style={styles.unreadDot} />}
      </View>

      {/* Assigned */}
      {assignedName ? (
        <View style={styles.agentRow}>
          <View style={styles.agentAvatar}>
            <Text style={styles.agentAvatarText}>
              {item.assigned_first_name?.[0]}
            </Text>
          </View>
          <Text style={styles.agentName}>Asignado a {assignedName}</Text>
        </View>
      ) : (
        <Text style={styles.waitingText}>
          ⏳ Un Backoffice pronto tomara tu ticket.
        </Text>
      )}
    </TouchableOpacity>
  );
};

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Tus tickets</Text>
          <Text style={styles.headerSub}>{tickets.length} total</Text>
        </View>
        <TouchableOpacity
          style={styles.newButton}
          onPress={() => navigation.navigate("NewTicket")}
        >
          <Text style={styles.newButtonText}>Nuevo</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator color={BLUE} style={{ marginTop: 40 }} />
      ) : tickets.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🎫</Text>
          <Text style={styles.emptyTitle}>Aumenta tus ventas</Text>
          <Text style={styles.emptySub}>
            Presiona nuevo para agregar un nuevo ticket...
          </Text>
        </View>
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(item) => item.id}
          renderItem={renderTicket}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={BLUE}
            />
          }
        />
      )}


    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#1e293b" },
  headerSub: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  newButton: {
    backgroundColor: BLUE,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  newButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#64748b" },
  emptySub: { fontSize: 13, color: "#94a3b8", marginTop: 4, textAlign: "center" },
  ticketCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  ticketTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 8,
  },
  ticketSubject: { flex: 1, fontSize: 15, fontWeight: "700", color: "#1e293b" },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusLabel: { fontSize: 11, fontWeight: "700" },
  ticketMessage: {
    fontSize: 13,
    color: "#64748b",
    lineHeight: 18,
    marginBottom: 10,
  },
  agentRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  agentAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: BLUE,
    alignItems: "center",
    justifyContent: "center",
  },
  agentAvatarText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  agentName: { fontSize: 12, color: "#1447E6", fontWeight: "600" },
  waitingText: { fontSize: 12, color: "#94a3b8", marginBottom: 8 },
  ticketDate: { fontSize: 11, color: "#94a3b8" },
  timeAndStatus: {
  alignItems: "flex-end",
  gap: 8,
},
ticketTime: {
  fontSize: 11,
  color: "#94a3b8",
  fontWeight: "600",
},
messageRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 10,
},
ticketMessageUnread: {
  fontWeight: "700",
  color: "#1e293b",
},
unreadDot: {
  width: 8,
  height: 8,
  borderRadius: 4,
  backgroundColor: "#dc2626",
  marginLeft: 8,
},
});