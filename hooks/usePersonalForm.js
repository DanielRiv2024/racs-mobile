// hooks/usePersonalForm.js
import { useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { Alert } from "react-native";

export function usePersonalForm() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    identification: "",
    birth_date: "",
    document_expiry_date: "",
    phone_number: "",
    email: "",
    country: "",
    nationality: "",
    province: "",
    canton: "",
    district: "",
    neighborhood: "",
    exact_location: "",
  });

  const [references, setReferences] = useState([
    { name: "", relationship: "", phone_number: "" },
    { name: "", relationship: "", phone_number: "" },
    { name: "", relationship: "", phone_number: "" },
  ]);

  const [documents, setDocuments] = useState([]);

  // Validate at least one reference has data
  const validateReferences = () => {
    const withData = references.filter(
      (ref) => ref.name.trim() || ref.phone_number.trim()
    );
    return withData.length >= 1;
  };

  // Validate form
  const validateForm = () => {
    if (!formData.first_name.trim()) {
      Alert.alert("Error", "El nombre es requerido");
      return false;
    }
    if (!formData.last_name.trim()) {
      Alert.alert("Error", "El apellido es requerido");
      return false;
    }
    if (!formData.identification.trim()) {
      Alert.alert("Error", "La identificación es requerida");
      return false;
    }
    if (!formData.phone_number.trim()) {
      Alert.alert("Error", "El teléfono es requerido");
      return false;
    }
    if (!formData.email.trim()) {
      Alert.alert("Error", "El correo es requerido");
      return false;
    }
    if (!validateReferences()) {
      Alert.alert("Error", "Al menos una referencia es requerida");
      return false;
    }
    return true;
  };

  // Save form
  const saveForm = useCallback(
    async (ticketId, userId) => {
      if (!validateForm()) {
        return false;
      }

      setLoading(true);
      try {
        // 1. Insert personal form
        const { data: formResult, error: formError } = await supabase
          .from("personal_forms")
          .insert({
            ticket_id: ticketId,
            user_id: userId,
            ...formData,
          })
          .select()
          .single();

        if (formError) {
          Alert.alert("Error", formError.message);
          setLoading(false);
          return false;
        }

        const formId = formResult.id;

        // 2. Insert references (filter empty ones)
        const validReferences = references.filter(
          (ref) => ref.name.trim() || ref.phone_number.trim()
        );

        if (validReferences.length > 0) {
          const { error: refError } = await supabase
            .from("personal_references")
            .insert(
              validReferences.map((ref) => ({
                personal_form_id: formId,
                ...ref,
              }))
            );

          if (refError) {
            Alert.alert("Error", "Error al guardar referencias: " + refError.message);
            setLoading(false);
            return false;
          }
        }

        // 3. Insert documents if any
        if (documents.length > 0) {
          const { error: docError } = await supabase
            .from("personal_form_documents")
            .insert(
              documents.map((doc) => ({
                personal_form_id: formId,
                ...doc,
              }))
            );

          if (docError) {
            Alert.alert("Error", "Error al guardar documentos: " + docError.message);
            setLoading(false);
            return false;
          }
        }

        Alert.alert("Éxito", "Formulario guardado correctamente");
        setLoading(false);
        return true;
      } catch (error) {
        Alert.alert("Error", error.message);
        setLoading(false);
        return false;
      }
    },
    [formData, references, documents]
  );

  // Get form by ticket
  const getFormByTicket = useCallback(async (ticketId) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("personal_forms_with_references")
        .select("*")
        .eq("ticket_id", ticketId)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows found (normal)
        throw error;
      }

      if (data) {
        setFormData({
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          identification: data.identification || "",
          birth_date: data.birth_date || "",
          document_expiry_date: data.document_expiry_date || "",
          phone_number: data.phone_number || "",
          email: data.email || "",
          country: data.country || "",
          nationality: data.nationality || "",
          province: data.province || "",
          canton: data.canton || "",
          district: data.district || "",
          neighborhood: data.neighborhood || "",
          exact_location: data.exact_location || "",
        });

        if (data.references && data.references.length > 0) {
          setReferences(data.references);
        }

        if (data.documents && data.documents.length > 0) {
          setDocuments(data.documents);
        }
      }

      setLoading(false);
      return data || null;
    } catch (error) {
      Alert.alert("Error", error.message);
      setLoading(false);
      return null;
    }
  }, []);

  return {
    loading,
    formData,
    setFormData,
    references,
    setReferences,
    documents,
    setDocuments,
    saveForm,
    getFormByTicket,
    validateForm,
  };
}