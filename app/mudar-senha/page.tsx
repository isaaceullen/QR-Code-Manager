"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Lock, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function ChangePassword() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/");
      }
    };
    checkAuth();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (newPassword.length < 6) {
      setError("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      setError(updateError.message || "Erro ao atualizar a senha.");
    } else {
      setSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-[#7B48EA] selection:text-white flex flex-col">
      <header className="sticky top-0 z-40 bg-[#050505] border-b border-[#7B48EA]/30 px-4 md:px-8 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center">
          <Image src="https://i.imgur.com/864yjao.png" alt="Camerite" width={120} height={40} className="max-h-8 md:max-h-10 w-auto" referrerPolicy="no-referrer" />
        </div>
        <Link
          href="/"
          className="text-sm font-medium text-white/50 hover:text-white transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Painel
        </Link>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#111111] rounded-2xl border border-white/10 p-8 flex flex-col w-full max-w-md shadow-xl"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#7B48EA]/20 flex items-center justify-center">
              <Lock className="w-5 h-5 text-[#7B48EA]" />
            </div>
            <h2 className="text-xl font-semibold text-white">
              Trocar Senha
            </h2>
          </div>

          {success ? (
            <div className="flex flex-col items-center text-center space-y-4 py-4">
              <CheckCircle2 className="w-16 h-16 text-emerald-400" />
              <h3 className="text-lg font-medium text-white">Senha atualizada com sucesso!</h3>
              <p className="text-white/50 text-sm">Sua senha foi alterada. Você já pode usar a nova senha no próximo login.</p>
              <Link
                href="/"
                className="mt-4 w-full bg-[#222222] hover:bg-[#333333] text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                Voltar ao Painel
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/70">Nova Senha</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo de 6 caracteres"
                  className="w-full px-4 py-3 rounded-xl bg-[#050505] border border-white/10 focus:border-[#7B48EA] focus:ring-1 focus:ring-[#7B48EA] outline-none transition-all text-white placeholder:text-white/30"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/70">Confirmar Nova Senha</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Digite a senha novamente"
                  className="w-full px-4 py-3 rounded-xl bg-[#050505] border border-white/10 focus:border-[#7B48EA] focus:ring-1 focus:ring-[#7B48EA] outline-none transition-all text-white placeholder:text-white/30"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !newPassword || !confirmPassword}
                className="w-full bg-[#7B48EA] hover:bg-[#6A3DE8] text-white font-medium py-3 px-4 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-6"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  "Salvar Nova Senha"
                )}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}
