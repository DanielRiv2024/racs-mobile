// screens/ChatScreen.js
import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
  Modal,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../lib/supabase";
import { useSession } from "../hooks/useSession";

const BLUE = "#1447E6";

const STATUS_CONFIG = {
  open: { label: "Open", bg: "#fef9c3", color: "#ca8a04" },
  in_progress: { label: "In Progress", bg: "#eff6ff", color: "#1447E6" },
  resolved: { label: "Resolved", bg: "#f0fdf4", color: "#16a34a" },
  rejected: { label: "Rejected", bg: "#fef2f2", color: "#dc2626" },
};

export default function ChatScreen({ route, navigation }) {
  const { ticket: initialTicket } = route.params;
  const { profile, loading: profileLoading } = useSession();

  const [ticket, setTicket] = useState(initialTicket);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [formUpdatedMessage, setFormUpdatedMessage] = useState(false);
  const [hasPersonalForm, setHasPersonalForm] = useState(false);
  const [checkingForm, setCheckingForm] = useState(false);

  const flatListRef = useRef(null);
  const channelRef = useRef(null);
  const statusChannelRef = useRef(null);
  const formChannelRef = useRef(null);
  const formMessageTimeoutRef = useRef(null);

  useEffect(() => {
    if (profileLoading) return;
    if (!profile) {
      navigation.replace("Login");
      return;
    }

    checkPersonalForm();
    fetchMessages();
    subscribeToMessages();
    subscribeToTicketUpdates();
    subscribeToFormUpdates();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      if (statusChannelRef.current) supabase.removeChannel(statusChannelRef.current);
      if (formChannelRef.current) supabase.removeChannel(formChannelRef.current);
      if (formMessageTimeoutRef.current) clearTimeout(formMessageTimeoutRef.current);
    };
  }, [profileLoading, profile, ticket.id]);

  // Verificar si existe un formulario personal para este ticket
  const checkPersonalForm = async () => {
    setCheckingForm(true);
    try {
      const { data } = await supabase
        .from("personal_forms")
        .select("id")
        .eq("ticket_id", ticket.id)
        .single();

      setHasPersonalForm(!!data);
    } catch (error) {
      setHasPersonalForm(false);
    }
    setCheckingForm(false);
  };

  // Suscribirse a cambios en el formulario personal
  const subscribeToFormUpdates = () => {
    if (!profile) return;

    formChannelRef.current = supabase
      .channel(`personal_form:${ticket.id}`)
      .on(
        "postgres_changes",
        {
          event: "*", // INSERT, UPDATE, DELETE
          schema: "public",
          table: "personal_forms",
          filter: `ticket_id=eq.${ticket.id}`,
        },
        (payload) => {
          // Mostrar mensaje de actualización
          setFormUpdatedMessage(true);
          setHasPersonalForm(true);

          // Ocultar el mensaje después de 3 segundos
          if (formMessageTimeoutRef.current) {
            clearTimeout(formMessageTimeoutRef.current);
          }
          formMessageTimeoutRef.current = setTimeout(() => {
            setFormUpdatedMessage(false);
          }, 3000);
        }
      )
      .subscribe();
  };

  const fetchMessages = async () => {
    if (!profile) return;

    const { data } = await supabase
      .from("ticket_messages")
      .select("*")
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: true });

    setMessages(data ?? []);
    setLoading(false);

    await supabase
      .from("ticket_messages")
      .update({ is_read: true })
      .eq("ticket_id", ticket.id)
      .neq("sender_id", profile.id);
  };

  const subscribeToMessages = () => {
    if (!profile) return;

    channelRef.current = supabase
      .channel(`ticket_chat:${ticket.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ticket_messages",
          filter: `ticket_id=eq.${ticket.id}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
          if (payload.new.sender_id !== profile.id) {
            supabase
              .from("ticket_messages")
              .update({ is_read: true })
              .eq("id", payload.new.id);
          }
        }
      )
      .subscribe();
  };

  const subscribeToTicketUpdates = () => {
    if (!profile) return;

    statusChannelRef.current = supabase
      .channel(`ticket_status:${ticket.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tickets",
          filter: `id=eq.${ticket.id}`,
        },
        (payload) => setTicket((prev) => ({ ...prev, ...payload.new }))
      )
      .subscribe();
  };

  // Abrir formulario personal
  const openPersonalForm = () => {
    navigation.navigate("PersonalForm", { ticket });
  };

  // ── Seleccionar imagen ────────────────────────────────────
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", error.message || "Failed to pick image");
    }
  };

  // ── Subir imagen a Supabase (usando fetch directo) ───────────────────────────────
  const uploadImage = async (imageUri) => {
    if (!profile || !ticket) {
      Alert.alert("Error", "Missing profile or ticket");
      return;
    }

    setUploading(true);

    try {
      // Obtener el archivo
      const response = await fetch(imageUri);
      const blob = await response.blob();

      // Generar nombre único
      const randomId = Math.random().toString(36).substring(2, 15) + 
                      Math.random().toString(36).substring(2, 15);
      const fileName = `${randomId}.jpg`;
      const filePath = `ticket-images/${ticket.id}/${fileName}`;

      // ✅ Obtener token del usuario autenticado
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        Alert.alert("Error", "Not authenticated");
        setUploading(false);
        return;
      }

      // ✅ URL directa para upload (usando fetch en lugar de SDK)
      const uploadUrl = `https://arzbanrxrnywgmgdrakl.supabase.co/storage/v1/object/ticket-attachments/${filePath}`;

      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": "image/jpeg",
          "Authorization": `Bearer ${token}`,
        },
        body: blob,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Upload failed: ${uploadResponse.status} ${errorText}`);
      }

      // ✅ Obtener URL pública
      const imageUrl = `https://arzbanrxrnywgmgdrakl.supabase.co/storage/v1/object/public/ticket-attachments/${filePath}`;

      // ✅ Guardar mensaje con imagen en la base de datos
      const { error: msgError } = await supabase
        .from("ticket_messages")
        .insert({
          ticket_id: ticket.id,
          sender_id: profile.id,
          type: "image",
          content: null,
          image_url: imageUrl,
        });

      if (msgError) {
        Alert.alert("Error", "Could not save message: " + msgError.message);
        setUploading(false);
        return;
      }

      setUploading(false);
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert("Error", error.message || "Failed to upload image");
      setUploading(false);
    }
  };

  // ── Enviar mensaje de texto ───────────────────────────────
  const sendText = async () => {
    if (!text.trim() || sending || !profile) return;
    setSending(true);

    try {
      await supabase.from("ticket_messages").insert({
        ticket_id: ticket.id,
        sender_id: profile.id,
        type: "text",
        content: text.trim(),
      });
      setText("");
    } catch (error) {
      Alert.alert("Error", "Failed to send message");
      console.error("Send error:", error);
    } finally {
      setSending(false);
    }
  };

  // ── Render mensaje ────────────────────────────────────────
  const renderMessage = ({ item }) => {
    if (!profile) return null;

    const isMe = item.sender_id === profile.id;

    return (
      <View
        style={[
          styles.messageRow,
          isMe ? styles.messageRowMe : styles.messageRowOther,
        ]}
      >
        <View
          style={[
            styles.bubble,
            isMe ? styles.bubbleMe : styles.bubbleOther,
          ]}
        >
          {item.type === "image" && item.image_url ? (
            <TouchableOpacity
              onPress={() => {
                setSelectedImage(item.image_url);
                setShowImageModal(true);
              }}
            >
              <Image
                source={{ uri: item.image_url }}
                style={{
                  width: 200,
                  height: 200,
                  borderRadius: 12,
                  marginBottom: 8,
                }}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ) : null}

          {item.content ? (
            <Text style={[styles.messageText, isMe && styles.messageTextMe]}>
              {item.content}
            </Text>
          ) : null}

          <Text style={[styles.messageTime, isMe && styles.messageTimeMe]}>
            {new Date(item.created_at).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })}
            {isMe && (item.is_read ? "  ✓✓" : "  ✓")}
          </Text>
        </View>
      </View>
    );
  };

  if (profileLoading || !profile) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={BLUE} size="large" style={{ flex: 1 }} />
      </View>
    );
  }

  const canChat = ticket.status === "in_progress";
  const s = STATUS_CONFIG[ticket.status] ?? STATUS_CONFIG.open;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={90}
    >
      {/* ✨ Modal para ver imagen grande */}
      <Modal
        visible={showImageModal}
        transparent={true}
        onRequestClose={() => setShowImageModal(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalOverlay}
            onPress={() => setShowImageModal(false)}
          />
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowImageModal(false)}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            {selectedImage && (
              <Image
                source={{ uri: selectedImage }}
                style={styles.fullImage}
                resizeMode="contain"
              />
            )}
          </View>
        </View>
      </Modal>

      {/* 📋 Mensaje de actualización del formulario */}
      {formUpdatedMessage && (
        <View style={styles.formUpdatedBanner}>
          <Text style={styles.formUpdatedText}>✅ Formulario actualizado correctamente</Text>
        </View>
      )}

      <View style={styles.statusBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.statusBarTitle} numberOfLines={1}>
            {ticket.subject}
          </Text>
        </View>
        
        {/* Botón pequeño para formulario */}
        <TouchableOpacity
          style={[
            styles.formButton,
            hasPersonalForm ? styles.formButtonFilled : styles.formButtonEmpty,
          ]}
          onPress={openPersonalForm}
          disabled={checkingForm}
        >
          {checkingForm ? (
            <ActivityIndicator color={BLUE} size="small" />
          ) : (
            <Text style={styles.formButtonText}>
              {hasPersonalForm ? "📝 Editar" : "📝 Llenar"}
            </Text>
          )}
        </TouchableOpacity>

        <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
          <Text style={[styles.statusLabel, { color: s.color }]}>
            {s.label}
          </Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={BLUE} style={{ flex: 1, marginTop: 40 }} />
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
          ListEmptyComponent={
            <Text style={styles.emptyChat}>
              {canChat
                ? "Envia los datos necesarios! 👋"
                : "Un Backoffice pronto tomara tu ticket."}
            </Text>
          }
        />
      )}

      {canChat ? (
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Escribe un mensaje..."
            placeholderTextColor="#94a3b8"
            value={text}
            onChangeText={setText}
            multiline
            editable={!uploading}
          />
          <TouchableOpacity
            style={[styles.imageButton, uploading && styles.sendButtonDisabled]}
            onPress={pickImage}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color="#1447E6" size="small" />
            ) : (
              <Text style={styles.imageIcon}>🖼️</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!text.trim() || sending) && styles.sendButtonDisabled,
            ]}
            onPress={sendText}
            disabled={!text.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.sendIcon}>➤</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.closedBar}>
          {ticket.status === "open" && (
            <Text style={styles.closedText}>Esperando un Backoffice disponible...</Text>
          )}
          {ticket.status === "resolved" && (
            <Text style={[styles.closedText, { color: "#16a34a" }]}>
              ✅ Ticket Activado
            </Text>
          )}
          {ticket.status === "rejected" && (
            <Text style={[styles.closedText, { color: "#dc2626" }]}>
              ❌ Ticket Rechazado
            </Text>
          )}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    gap: 8,
  },
  statusBarTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1e293b",
  },
  formButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  formButtonEmpty: {
    borderColor: BLUE,
    backgroundColor: "#eff6ff",
  },
  formButtonFilled: {
    borderColor: "#16a34a",
    backgroundColor: "#f0fdf4",
  },
  formButtonText: {
    fontSize: 11,
    fontWeight: "700",
    color: BLUE,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusLabel: { fontSize: 11, fontWeight: "700" },
  formUpdatedBanner: {
    backgroundColor: "#f0fdf4",
    borderBottomColor: "#16a34a",
    borderBottomWidth: 2,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  formUpdatedText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#16a34a",
  },
  emptyChat: {
    textAlign: "center",
    color: "#94a3b8",
    fontSize: 13,
    marginTop: 40,
    paddingHorizontal: 32,
  },
  messageRow: { flexDirection: "row", marginBottom: 4 },
  messageRowMe: { justifyContent: "flex-end" },
  messageRowOther: { justifyContent: "flex-start" },
  bubble: { maxWidth: "75%", borderRadius: 18, padding: 12 },
  bubbleMe: {
    backgroundColor: "#1447E6",
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: "#fff",
    borderBottomLeftRadius: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  messageText: { fontSize: 14, color: "#1e293b", lineHeight: 20 },
  messageTextMe: { color: "#fff" },
  messageTime: {
    fontSize: 10,
    color: "#94a3b8",
    marginTop: 4,
    textAlign: "right",
  },
  messageTimeMe: { color: "rgba(255,255,255,0.6)" },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1e293b",
    maxHeight: 100,
    backgroundColor: "#f8fafc",
  },
  imageButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#f0f5ff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#1447E6",
  },
  imageIcon: { fontSize: 18 },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#1447E6",
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: { opacity: 0.4 },
  sendIcon: { color: "#fff", fontSize: 16 },
  closedBar: {
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    alignItems: "center",
  },
  closedText: {
    fontSize: 13,
    color: "#94a3b8",
    fontWeight: "600",
  },
  // ✨ Estilos para el modal
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.9)",
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    width: "90%",
    height: "90%",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    zIndex: 10,
  },
  fullImage: {
    width: "100%",
    height: "100%",
  },
  closeButton: {
    position: "absolute",
    top: -40,
    right: 0,
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
  },
  closeButtonText: {
    fontSize: 30,
    color: "#fff",
    fontWeight: "bold",
  },
});