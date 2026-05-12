// screens/NewTicketScreen.js
import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { supabase } from "../lib/supabase";
import { useSession } from "../hooks/useSession";

const BLUE = "#1447E6";

const SALE_TYPES = {
  postpago: {
    label: "Postpago",
    icon: "📞",
    plans: ["Conexión 1", "Conexión 2", "Conexión 3", "Conexión 4", "Conexión 5", "Conexión 6"],
  },
  gpon: {
    label: "GPON",
    icon: "🌐",
    plans: ["GPON 150", "GPON 300", "GPON 400"],
  },
};

export default function NewTicketScreen({ navigation }) {
  const { profile } = useSession();

  const [form, setForm] = useState({
    identification: "",
    name: "",
    lastName: "",
    phone: "",
    province: "",
    canton: "",
    district: "",
    saleType: null,
    plan: null,
  });

  const [expandedType, setExpandedType] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async () => {
    if (
      !form.identification?.trim() ||
      !form.name?.trim() ||
      !form.lastName?.trim() ||
      !form.phone?.trim() ||
      !form.province?.trim() ||
      !form.canton?.trim() ||
      !form.district?.trim() ||
      !form.saleType ||
      !form.plan
    ) {
      Alert.alert("Error", "Por favor completa todos los campos.");
      return;
    }

    setSubmitting(true);

    try {
      const fullMessage = `
👤 Cliente:
Nombre: ${form.name} ${form.lastName}
Cédula: ${form.identification}
Teléfono: ${form.phone}

📍 Ubicación:
Provincia: ${form.province}
Cantón: ${form.canton}
Distrito: ${form.district}

💼 Tipo de Venta:
${SALE_TYPES[form.saleType].label} - ${form.plan}
      `;

      const { error } = await supabase
        .from("tickets")
        .insert({
          company_id: profile.company_id,
          user_id: profile.id,
          subject: `${form.name} ${form.lastName}`,
          initial_message: fullMessage,
          status: "open",
        });

      if (error) {
        console.error(error);
        Alert.alert("Error", "No se pudo crear el ticket.");
        return;
      }
      Alert.alert("Éxito", "Ticket creado correctamente", [
        {
          text: "OK",
          onPress: () => {
            resetForm();
            navigation.navigate("TicketsList");  // ← Va a la lista de tickets
          },
        },
      ]);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Ocurrió un error inesperado.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm({
      identification: "",
      name: "",
      lastName: "",
      phone: "",
      province: "",
      canton: "",
      district: "",
      saleType: null,
      plan: null,
    });
    setExpandedType(null);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Nuevo Ticket</Text>
        <Text style={styles.headerSub}>Completa los datos del cliente</Text>
      </View>

      {/* Form */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Identificación */}
        <View style={styles.section}>
          <Text style={styles.label}>Identificación</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: 1-1234-5678"
            placeholderTextColor="#94a3b8"
            value={form.identification}
            onChangeText={(v) => setForm({ ...form, identification: v })}
          />
        </View>

        {/* Nombre */}
        <View style={styles.section}>
          <Text style={styles.label}>Nombre</Text>
          <TextInput
            style={styles.input}
            placeholder="Nombre"
            placeholderTextColor="#94a3b8"
            value={form.name}
            onChangeText={(v) => setForm({ ...form, name: v })}
          />
        </View>

        {/* Apellidos */}
        <View style={styles.section}>
          <Text style={styles.label}>Apellidos</Text>
          <TextInput
            style={styles.input}
            placeholder="Apellidos"
            placeholderTextColor="#94a3b8"
            value={form.lastName}
            onChangeText={(v) => setForm({ ...form, lastName: v })}
          />
        </View>

        {/* Teléfono */}
        <View style={styles.section}>
          <Text style={styles.label}>Teléfono</Text>
          <TextInput
            style={styles.input}
            placeholder="8888-8888"
            placeholderTextColor="#94a3b8"
            keyboardType="phone-pad"
            value={form.phone}
            onChangeText={(v) => setForm({ ...form, phone: v })}
          />
        </View>

        {/* Provincia */}
        <View style={styles.section}>
          <Text style={styles.label}>Provincia</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: San José"
            placeholderTextColor="#94a3b8"
            value={form.province}
            onChangeText={(v) => setForm({ ...form, province: v })}
          />
        </View>

        {/* Cantón */}
        <View style={styles.section}>
          <Text style={styles.label}>Cantón</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Desamparados"
            placeholderTextColor="#94a3b8"
            value={form.canton}
            onChangeText={(v) => setForm({ ...form, canton: v })}
          />
        </View>

        {/* Distrito */}
        <View style={styles.section}>
          <Text style={styles.label}>Distrito</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: San Rafael Arriba"
            placeholderTextColor="#94a3b8"
            value={form.district}
            onChangeText={(v) => setForm({ ...form, district: v })}
          />
        </View>

        {/* Tipo de Venta */}
        <View style={styles.section}>
          <Text style={styles.label}>Tipo de Venta</Text>

          {/* Postpago */}
          <TouchableOpacity
            style={[
              styles.typeButton,
              form.saleType === "postpago" && styles.typeButtonActive,
            ]}
            onPress={() => {
              if (form.saleType === "postpago") {
                setExpandedType(expandedType === "postpago" ? null : "postpago");
              } else {
                setForm({ ...form, saleType: "postpago", plan: null });
                setExpandedType("postpago");
              }
            }}
          >
            <Text
              style={[
                styles.typeButtonText,
                form.saleType === "postpago" && styles.typeButtonTextActive,
              ]}
            >
              📞 Postpago {expandedType === "postpago" ? "▼" : "▶"}
            </Text>
          </TouchableOpacity>

          {expandedType === "postpago" && form.saleType === "postpago" && (
            <View style={styles.plansContainer}>
              {SALE_TYPES.postpago.plans.map((plan) => (
                <TouchableOpacity
                  key={plan}
                  style={[
                    styles.planButton,
                    form.plan === plan && styles.planButtonSelected,
                  ]}
                  onPress={() => {
                    setForm({ ...form, saleType: "postpago", plan });
                  }}
                >
                  <Text
                    style={[
                      styles.planText,
                      form.plan === plan && styles.planTextSelected,
                    ]}
                  >
                    {plan}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* GPON */}
          <TouchableOpacity
            style={[
              styles.typeButton,
              form.saleType === "gpon" && styles.typeButtonActive,
            ]}
            onPress={() => {
              if (form.saleType === "gpon") {
                setExpandedType(expandedType === "gpon" ? null : "gpon");
              } else {
                setForm({ ...form, saleType: "gpon", plan: null });
                setExpandedType("gpon");
              }
            }}
          >
            <Text
              style={[
                styles.typeButtonText,
                form.saleType === "gpon" && styles.typeButtonTextActive,
              ]}
            >
              🌐 GPON {expandedType === "gpon" ? "▼" : "▶"}
            </Text>
          </TouchableOpacity>

          {expandedType === "gpon" && form.saleType === "gpon" && (
            <View style={styles.plansContainer}>
              {SALE_TYPES.gpon.plans.map((plan) => (
                <TouchableOpacity
                  key={plan}
                  style={[
                    styles.planButton,
                    form.plan === plan && styles.planButtonSelected,
                  ]}
                  onPress={() => {
                    setForm({ ...form, saleType: "gpon", plan });
                  }}
                >
                  <Text
                    style={[
                      styles.planText,
                      form.plan === plan && styles.planTextSelected,
                    ]}
                  >
                    {plan}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Plan seleccionado */}
        {form.plan && (
          <View style={styles.selectedInfo}>
            <Text style={styles.selectedLabel}>Plan seleccionado:</Text>
            <Text style={styles.selectedValue}>{form.plan}</Text>
          </View>
        )}
      </ScrollView>

      {/* Footer con botones */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelBtn} onPress={resetForm}>
          <Text style={styles.cancelText}>Limpiar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.submitBtn,
            (!form.identification?.trim() ||
              !form.name?.trim() ||
              !form.lastName?.trim() ||
              !form.phone?.trim() ||
              !form.province?.trim() ||
              !form.canton?.trim() ||
              !form.district?.trim() ||
              !form.saleType ||
              !form.plan) &&
              styles.submitBtnDisabled,
          ]}
          onPress={handleCreate}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.submitText}>Crear Ticket</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 4,
  },
  headerSub: {
    fontSize: 13,
    color: "#94a3b8",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1e293b",
    backgroundColor: "#f8fafc",
  },
  typeButton: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
  },
  typeButtonActive: {
    borderColor: BLUE,
    backgroundColor: "#eff6ff",
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
  },
  typeButtonTextActive: {
    color: BLUE,
    fontWeight: "700",
  },
  plansContainer: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  planButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  planButtonSelected: {
    borderColor: BLUE,
    backgroundColor: "#eff6ff",
  },
  planText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#64748b",
  },
  planTextSelected: {
    color: BLUE,
    fontWeight: "700",
  },
  selectedInfo: {
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    marginBottom: 20,
  },
  selectedLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
    marginBottom: 6,
  },
  selectedValue: {
    fontSize: 16,
    fontWeight: "700",
    color: BLUE,
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 24,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748b",
  },
  submitBtn: {
    flex: 1,
    backgroundColor: BLUE,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
});