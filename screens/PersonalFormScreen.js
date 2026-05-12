// screens/PersonalFormScreen.js
import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { usePersonalForm } from "../hooks/usePersonalForm";
import { useSession } from "../hooks/useSession";
import { supabase } from "../lib/supabase";

const BLUE = "#1447E6";

export default function PersonalFormScreen({ route, navigation }) {
  const { ticket } = route.params;
  const { profile } = useSession();
  const {
    loading,
    saving,
    formData,
    setFormData,
    references,
    setReferences,
    documents,
    setDocuments,
    saveForm,
    getFormByTicket,
    autoSaveForm,
  } = usePersonalForm();

  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState(null);

  // Cargar formulario existente al abrir
  useEffect(() => {
    const loadForm = async () => {
      console.log("📂 Loading form for ticket:", ticket.id);
      await getFormByTicket(ticket.id);
    };
    loadForm();
  }, [ticket.id]);

  // Auto-guardar cada 5 segundos si hay cambios
  useEffect(() => {
    if (!profile) return;

    const interval = setInterval(async () => {
      console.log("⏱️ Auto-saving form...");
      await autoSaveForm(ticket.id, profile.id);
      setLastSaveTime(new Date().toLocaleTimeString());
    }, 5000);

    return () => clearInterval(interval);
  }, [ticket.id, profile?.id, formData]);

  // Validar formato de fecha YYYY-MM-DD
  const validateDateFormat = (value) => {
    if (!/^[\d\-]*$/.test(value)) return "";
    if (value.length > 10) return value.substring(0, 10);
    if (value.length === 4 && !value.includes("-")) {
      return value + "-";
    }
    if (value.length === 7 && value.split("-").length === 2) {
      return value + "-";
    }
    return value;
  };

  const updateFormField = (field, value) => {
    if (field === "birth_date" || field === "document_expiry_date") {
      value = validateDateFormat(value);
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateReference = (index, field, value) => {
    const newReferences = [...references];
    newReferences[index][field] = value;
    setReferences(newReferences);
  };

  const uploadDocument = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setUploadingDoc(true);
        console.log("📸 Uploading document...");

        const response = await fetch(result.assets[0].uri);
        const blob = await response.blob();

        const randomId = Math.random().toString(36).substring(2, 15);
        const fileName = `cedula-${randomId}.jpg`;
        const filePath = `personal-forms/${ticket.id}/${fileName}`;

        const { data: session } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) {
          console.error("❌ No token available");
          Alert.alert("Error", "No autenticado");
          setUploadingDoc(false);
          return;
        }

        const uploadUrl = `https://arzbanrxrnywgmgdrakl.supabase.co/storage/v1/object/personal-attachments/${filePath}`;

        console.log("📤 Uploading to:", uploadUrl);

        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: {
            "Content-Type": "image/jpeg",
            "Authorization": `Bearer ${token}`,
          },
          body: blob,
        });

        console.log("📤 Upload response status:", uploadResponse.status);

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.error("❌ Upload error:", errorText);
          throw new Error(`Upload failed: ${uploadResponse.status}`);
        }

        const documentUrl = `https://arzbanrxrnywgmgdrakl.supabase.co/storage/v1/object/public/personal-attachments/${filePath}`;

        console.log("✅ Document uploaded:", documentUrl);

        setDocuments((prev) => [
          ...prev,
          {
            document_type: "cedula",
            document_url: documentUrl,
          },
        ]);

        Alert.alert("Éxito", "Documento cargado correctamente");
        setUploadingDoc(false);
      }
    } catch (error) {
      console.error("❌ Upload exception:", error);
      Alert.alert("Error", error.message);
      setUploadingDoc(false);
    }
  };

  const handleSubmit = async () => {
    console.log("📝 Submitting form...");
    const success = await saveForm(ticket.id, profile.id);
    if (success) {
      setTimeout(() => navigation.goBack(), 500);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color={BLUE} size="large" />
          <Text style={{ marginTop: 10, color: "#94a3b8" }}>Cargando formulario...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Formulario Personal</Text>
            <Text style={styles.subtitle}>Completa a tu ritmo</Text>
            {saving && (
              <Text style={styles.savingIndicator}>💾 Guardando...</Text>
            )}
            {lastSaveTime && !saving && (
              <Text style={styles.lastSaveTime}>✅ Guardado a las {lastSaveTime}</Text>
            )}
          </View>

          {/* Section: Personal Data */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Datos Personales</Text>

            <TextInput
              style={styles.input}
              placeholder="Nombre"
              placeholderTextColor="#94a3b8"
              value={formData.first_name}
              onChangeText={(value) => updateFormField("first_name", value)}
            />

            <TextInput
              style={styles.input}
              placeholder="Apellido"
              placeholderTextColor="#94a3b8"
              value={formData.last_name}
              onChangeText={(value) => updateFormField("last_name", value)}
            />

            <TextInput
              style={styles.input}
              placeholder="Identificación (Cédula/Pasaporte)"
              placeholderTextColor="#94a3b8"
              value={formData.identification}
              onChangeText={(value) => updateFormField("identification", value)}
            />

            <View>
              <TextInput
                style={styles.input}
                placeholder="Fecha de Nacimiento (YYYY-MM-DD)"
                placeholderTextColor="#94a3b8"
                value={formData.birth_date}
                onChangeText={(value) => updateFormField("birth_date", value)}
                keyboardType="numeric"
                maxLength={10}
              />
              <Text style={styles.dateHint}>Formato: YYYY-MM-DD (ej: 1990-05-15)</Text>
            </View>

            <View>
              <TextInput
                style={styles.input}
                placeholder="Fecha Vencimiento Documento (YYYY-MM-DD)"
                placeholderTextColor="#94a3b8"
                value={formData.document_expiry_date}
                onChangeText={(value) => updateFormField("document_expiry_date", value)}
                keyboardType="numeric"
                maxLength={10}
              />
              <Text style={styles.dateHint}>Formato: YYYY-MM-DD (ej: 2030-12-31)</Text>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Teléfono"
              placeholderTextColor="#94a3b8"
              keyboardType="phone-pad"
              value={formData.phone_number}
              onChangeText={(value) => updateFormField("phone_number", value)}
            />

            <TextInput
              style={styles.input}
              placeholder="Correo Electrónico"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              value={formData.email}
              onChangeText={(value) => updateFormField("email", value)}
            />
          </View>

          {/* Section: Location */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ubicación</Text>

            <TextInput
              style={styles.input}
              placeholder="País"
              placeholderTextColor="#94a3b8"
              value={formData.country}
              onChangeText={(value) => updateFormField("country", value)}
            />

            <TextInput
              style={styles.input}
              placeholder="Nacionalidad"
              placeholderTextColor="#94a3b8"
              value={formData.nationality}
              onChangeText={(value) => updateFormField("nationality", value)}
            />

            <TextInput
              style={styles.input}
              placeholder="Provincia"
              placeholderTextColor="#94a3b8"
              value={formData.province}
              onChangeText={(value) => updateFormField("province", value)}
            />

            <TextInput
              style={styles.input}
              placeholder="Cantón"
              placeholderTextColor="#94a3b8"
              value={formData.canton}
              onChangeText={(value) => updateFormField("canton", value)}
            />

            <TextInput
              style={styles.input}
              placeholder="Distrito"
              placeholderTextColor="#94a3b8"
              value={formData.district}
              onChangeText={(value) => updateFormField("district", value)}
            />

            <TextInput
              style={styles.input}
              placeholder="Barrio"
              placeholderTextColor="#94a3b8"
              value={formData.neighborhood}
              onChangeText={(value) => updateFormField("neighborhood", value)}
            />

            <TextInput
              style={[styles.input, { height: 100 }]}
              placeholder="Ubicación Exacta (dirección completa)"
              placeholderTextColor="#94a3b8"
              multiline
              value={formData.exact_location}
              onChangeText={(value) => updateFormField("exact_location", value)}
            />
          </View>

          {/* Section: References */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Referencias (Opcional)</Text>

            {references.map((ref, index) => (
              <View key={index} style={styles.referenceCard}>
                <Text style={styles.referenceNumber}>Referencia {index + 1}</Text>

                <TextInput
                  style={styles.input}
                  placeholder="Nombre"
                  placeholderTextColor="#94a3b8"
                  value={ref.name}
                  onChangeText={(value) => updateReference(index, "name", value)}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Parentezco (Amigo, Familiar, etc)"
                  placeholderTextColor="#94a3b8"
                  value={ref.relationship}
                  onChangeText={(value) => updateReference(index, "relationship", value)}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Teléfono"
                  placeholderTextColor="#94a3b8"
                  keyboardType="phone-pad"
                  value={ref.phone_number}
                  onChangeText={(value) => updateReference(index, "phone_number", value)}
                />
              </View>
            ))}
          </View>

          {/* Section: Documents */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Documentos (Opcional)</Text>

            {documents.map((doc, index) => (
              <View key={index} style={styles.documentItem}>
                <Text style={styles.documentType}>📄 {doc.document_type}</Text>
                <Text style={styles.documentUrl} numberOfLines={1}>
                  {doc.document_url.split("/").pop()}
                </Text>
              </View>
            ))}

            <TouchableOpacity
              style={styles.uploadBtn}
              onPress={uploadDocument}
              disabled={uploadingDoc}
            >
              {uploadingDoc ? (
                <ActivityIndicator color="#1447E6" />
              ) : (
                <>
                  <Text style={styles.uploadIcon}>📸</Text>
                  <Text style={styles.uploadText}>Subir Documento</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Guardar y Cerrar</Text>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 28,
    marginTop: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#94a3b8",
    fontWeight: "500",
    marginBottom: 8,
  },
  savingIndicator: {
    fontSize: 12,
    color: "#1447E6",
    fontWeight: "600",
  },
  lastSaveTime: {
    fontSize: 12,
    color: "#16a34a",
    fontWeight: "600",
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1e293b",
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  dateHint: {
    fontSize: 11,
    color: "#94a3b8",
    fontStyle: "italic",
    marginTop: -8,
    marginBottom: 12,
    marginLeft: 4,
  },
  referenceCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderLeftWidth: 4,
    borderLeftColor: "#1447E6",
  },
  referenceNumber: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1447E6",
    marginBottom: 10,
  },
  documentItem: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: "#16a34a",
  },
  documentType: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1e293b",
  },
  documentUrl: {
    fontSize: 12,
    color: "#94a3b8",
    flex: 1,
    marginLeft: 10,
  },
  uploadBtn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingVertical: 12,
    backgroundColor: "#f8fafc",
    gap: 8,
    marginBottom: 20,
  },
  uploadIcon: {
    fontSize: 18,
  },
  uploadText: {
    color: "#64748b",
    fontWeight: "600",
    fontSize: 14,
  },
  submitBtn: {
    width: "100%",
    backgroundColor: "#1447E6",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 12,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});