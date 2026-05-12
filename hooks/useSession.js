// hooks/useSession.js
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export function useSession() {
  const [session,  setSession]  = useState(null);
  const [profile,  setProfile]  = useState(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    // Obtener sesión activa
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) loadProfile(session.user.id);
      else setLoading(false);
    });

    // Escuchar cambios de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (session?.user) loadProfile(session.user.id);
        else { setProfile(null); setLoading(false); }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId) => {
    const { data } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, role, company_id, is_active")
      .eq("id", userId)
      .single();
    setProfile(data ?? null);
    setLoading(false);
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const fullName = profile
    ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()
    : "";

  return { session, profile, fullName, loading, logout };
}