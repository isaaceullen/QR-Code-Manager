"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  Copy,
  ExternalLink,
  Trash2,
  BarChart2,
  Link as LinkIcon,
  Plus,
  Check,
  LogIn,
  TrendingUp,
  Star,
  Type,
  Download,
  Upload,
  Lock,
} from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import AnalyticsModal from "@/components/AnalyticsModal";
import Navigation from "@/components/Navigation";
import { exportBackup, importBackup, BackupData } from "@/lib/backupService";
import { useRef } from "react";
import Link from "next/link";

type QRCodeData = {
  id: string;
  title?: string;
  user_id?: string;
  original_url: string;
  slug: string;
  design_settings: {
    color: string;
    logo_url: string;
    is_link_only?: boolean;
  };
  clicks: number;
  created_at: string;
};

const generateSlug = (length = 6) => {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export default function LinksDashboard() {
  const [user, setUser] = useState<any>(null);

  // Auth State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  // Links State
  const [qrCodes, setQrCodes] = useState<QRCodeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [selectedQrCode, setSelectedQrCode] = useState<string | null>(null);
  const [selectedQrCodeTitle, setSelectedQrCodeTitle] = useState<string>("");

  const backupFileInputRef = useRef<HTMLInputElement>(null);

  const loadQRCodes = async () => {
    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const currentUser = session?.user;

    let query = supabase
      .from("qr_codes")
      .select("*")
      .order("created_at", { ascending: false });

    if (currentUser) {
      query = query.eq("user_id", currentUser.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching links:", error);
      setError("Erro ao carregar Links.");
    } else {
      setQrCodes(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadQRCodes();
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadQRCodes();
      } else {
        setQrCodes([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setAuthError(error.message);
    }
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleExport = async () => {
    if (!user) return;
    setSyncing(true);
    try {
      const data = await exportBackup(user.id);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `meus-links-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      alert("Backup exportado com sucesso!");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Erro ao exportar backup.");
    } finally {
      setSyncing(false);
    }
  };

  const handleImportClick = () => {
    backupFileInputRef.current?.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setSyncing(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text) as BackupData;
      await importBackup(user.id, data);
      alert("Backup importado com sucesso!");
      loadQRCodes();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Erro ao importar backup. Verifique o formato do arquivo.");
    } finally {
      setSyncing(false);
      if (backupFileInputRef.current) {
        backupFileInputRef.current.value = "";
      }
    }
  };

  const handleGenerateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || !user) return;

    setGenerating(true);
    setSyncing(true);
    setError("");

    const slug = generateSlug(6);

    const newLink = {
      title: title || "Link Sem Título",
      user_id: user.id,
      original_url: url,
      slug,
      design_settings: {
        color: "#000000",
        logo_url: "",
        is_link_only: true,
      },
      clicks: 0,
    };

    const { data, error: insertError } = await supabase
      .from("qr_codes")
      .insert([newLink])
      .select()
      .single();

    if (insertError) {
      console.error("Error generating link:", insertError);
      setError("Erro ao criar Link. Verifique as configurações do banco.");
    } else if (data) {
      setQrCodes([data, ...qrCodes]);
      setUrl("");
      setTitle("");
    }

    setGenerating(false);
    setSyncing(false);
  };

  const handleDelete = async (id: string) => {
    setSyncing(true);
    const { error } = await supabase.from("qr_codes").delete().eq("id", id);

    if (!error) {
      setQrCodes(qrCodes.filter((qr) => qr.id !== id));
    }
    setSyncing(false);
  };

  const handleCopy = (slug: string, isLink: boolean = false) => {
    const prefix = isLink ? '/l/' : '/q/';
    const fullUrl = `${window.location.origin}${prefix}${slug}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const filteredLinks = qrCodes.filter(qr => qr.design_settings?.is_link_only);

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-[#7B48EA] selection:text-white">
      <AnimatePresence>
        {selectedQrCode && (
          <AnalyticsModal
            qrCodeId={selectedQrCode}
            qrCodeTitle={selectedQrCodeTitle}
            onClose={() => setSelectedQrCode(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {syncing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <div className="bg-[#111111] border border-[#7B48EA]/30 p-6 rounded-2xl flex flex-col items-center gap-4 shadow-[0_0_30px_rgba(123,72,234,0.15)]">
              <div className="w-8 h-8 border-2 border-white/20 border-t-[#7B48EA] rounded-full animate-spin" />
              <p className="text-white font-medium">
                Sincronizando com a Nuvem...
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-[#050505] border-b border-[#7B48EA]/30 px-4 md:px-8 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center">
          <Image src="https://i.imgur.com/864yjao.png" alt="Camerite" width={120} height={40} className="max-h-8 md:max-h-10 w-auto" referrerPolicy="no-referrer" />
        </div>
        {user && (
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept=".json"
              ref={backupFileInputRef}
              onChange={handleImportFile}
              className="hidden"
            />
            <button
              onClick={handleImportClick}
              disabled={syncing}
              className="text-sm font-medium text-white/50 hover:text-white transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Importar Dados</span>
            </button>
            <button
              onClick={handleExport}
              disabled={syncing}
              className="text-sm font-medium text-white/50 hover:text-white transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Exportar Backup</span>
            </button>
            <div className="w-px h-4 bg-white/10 mx-2 hidden sm:block"></div>
            <Link
              href="/mudar-senha"
              className="text-sm font-medium text-white/50 hover:text-white transition-colors flex items-center gap-2"
            >
              <Lock className="w-4 h-4" />
              <span className="hidden sm:inline">Trocar Senha</span>
            </Link>
            <button
              onClick={handleLogout}
              className="text-sm font-medium text-white/50 hover:text-white transition-colors"
            >
              Sair
            </button>
          </div>
        )}
      </header>

      <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
        {!user ? (
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-160px)]">
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#111111] rounded-2xl border border-white/10 p-8 flex flex-col items-center justify-center w-full max-w-md shadow-xl"
            >
              <Image src="https://i.imgur.com/864yjao.png" alt="Camerite" width={150} height={40} className="h-10 w-auto mb-8" referrerPolicy="no-referrer" />
              <h2 className="text-xl font-semibold text-white mb-2">
                Acesso Restrito
              </h2>
              <p className="text-white/50 text-center mb-8">
                Faça login para gerenciar seus Links.
              </p>

              <form
                onSubmit={handleLogin}
                className="w-full space-y-4"
              >
                {authError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                    {authError}
                  </div>
                )}
                <div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Seu e-mail"
                    className="w-full px-4 py-3 rounded-xl bg-[#050505] border border-white/10 focus:border-[#7B48EA] focus:ring-1 focus:ring-[#7B48EA] outline-none transition-all text-white placeholder:text-white/30"
                  />
                </div>
                <div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Sua senha"
                    className="w-full px-4 py-3 rounded-xl bg-[#050505] border border-white/10 focus:border-[#7B48EA] focus:ring-1 focus:ring-[#7B48EA] outline-none transition-all text-white placeholder:text-white/30"
                  />
                </div>
                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full bg-[#7B48EA] hover:bg-[#6A3DE8] text-white font-medium py-3 px-4 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {authLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <LogIn className="w-5 h-5" />
                      Entrar
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        ) : (
          <>
            <Navigation />

            <div className="space-y-8">
              <motion.div
                key="link-generator"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#111111] rounded-2xl border border-white/10 overflow-hidden max-w-2xl"
              >
                <div className="p-6 border-b border-white/5">
                  <h2 className="text-lg font-semibold flex items-center gap-2 text-white">
                    <LinkIcon className="w-5 h-5 text-[#7B48EA]" />
                    Encurtar Novo Link
                  </h2>
                </div>
                <form onSubmit={handleGenerateLink} className="p-6 space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/70 flex items-center gap-2">
                      <Type className="w-4 h-4 text-white/40" />
                      Título do Link
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ex: Campanha de Verão"
                      className="w-full px-4 py-3 rounded-xl bg-[#050505] border border-white/10 focus:border-[#7B48EA] focus:ring-1 focus:ring-[#7B48EA] outline-none transition-all text-white placeholder:text-white/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/70 flex items-center gap-2">
                      <LinkIcon className="w-4 h-4 text-white/40" />
                      URL de Destino
                    </label>
                    <input
                      type="url"
                      required
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://seusite.com/campanha"
                      className="w-full px-4 py-3 rounded-xl bg-[#050505] border border-white/10 focus:border-[#7B48EA] focus:ring-1 focus:ring-[#7B48EA] outline-none transition-all text-white placeholder:text-white/30"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={generating || !url}
                    className="w-full bg-[#7B48EA] hover:bg-[#6A3DE8] text-white font-medium py-3 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(123,72,234,0.3)]"
                  >
                    {generating ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>Encurtar Link</>
                    )}
                  </button>
                </form>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6 pt-8 border-t border-white/10"
              >
                <h2 className="text-xl font-semibold text-white">Seus Links</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-[#111111] rounded-2xl border border-[#7B48EA]/30 p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <LinkIcon className="w-5 h-5 text-[#7B48EA]" />
                      <h3 className="text-white/70 font-medium">Total de Links</h3>
                    </div>
                    <p className="text-3xl font-bold text-white">
                      {filteredLinks.length}
                    </p>
                  </div>
                  <div className="bg-[#111111] rounded-2xl border border-[#7B48EA]/30 p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <TrendingUp className="w-5 h-5 text-[#7B48EA]" />
                      <h3 className="text-white/70 font-medium">
                        Total de Cliques
                      </h3>
                    </div>
                    <p className="text-3xl font-bold text-white">
                      {filteredLinks.reduce((acc, link) => acc + (link.clicks || 0), 0)}
                    </p>
                  </div>
                  <div className="bg-[#111111] rounded-2xl border border-[#7B48EA]/30 p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <Star className="w-5 h-5 text-[#7B48EA]" />
                      <h3 className="text-white/70 font-medium">Mais Popular</h3>
                    </div>
                    <p
                      className="text-lg font-bold text-white truncate"
                      title={
                        filteredLinks.length > 0
                          ? filteredLinks.reduce((prev, current) =>
                              prev.clicks > current.clicks ? prev : current,
                            ).title ||
                            filteredLinks.reduce((prev, current) =>
                              prev.clicks > current.clicks ? prev : current,
                            ).original_url
                          : "Nenhum"
                      }
                    >
                      {filteredLinks.length > 0
                        ? filteredLinks.reduce((prev, current) =>
                            prev.clicks > current.clicks ? prev : current,
                          ).title ||
                          filteredLinks.reduce((prev, current) =>
                            prev.clicks > current.clicks ? prev : current,
                          ).original_url
                        : "Nenhum"}
                    </p>
                  </div>
                </div>

                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="bg-[#111111] rounded-2xl border border-white/5 p-6 h-32 animate-pulse"
                      />
                    ))}
                  </div>
                ) : filteredLinks.length === 0 ? (
                  <div className="bg-[#111111] rounded-2xl border border-white/5 p-12 text-center">
                    <div className="w-16 h-16 bg-[#222222] rounded-full flex items-center justify-center mx-auto mb-4">
                      <BarChart2 className="w-8 h-8 text-white/20" />
                    </div>
                    <h3 className="text-lg font-medium text-white">
                      Nenhum Link criado
                    </h3>
                    <p className="text-white/50 mt-1">
                      Crie seu primeiro Link encurtado acima.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredLinks.map((link) => (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={link.id}
                        className="bg-[#111111] rounded-2xl border border-white/10 overflow-hidden flex flex-col hover:border-white/20 transition-colors"
                      >
                        <div 
                          className="p-6 flex gap-4 items-center border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors"
                          onClick={() => {
                            setSelectedQrCode(link.id);
                            setSelectedQrCodeTitle(link.title || link.slug);
                          }}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <BarChart2 className="w-4 h-4 text-[#7B48EA]" />
                              <span className="text-2xl font-bold text-white">
                                {link.clicks}
                              </span>
                              <span className="text-sm text-white/50">cliques</span>
                            </div>
                            {link.title && (
                              <p
                                className="text-white font-medium truncate"
                                title={link.title}
                              >
                                {link.title}
                              </p>
                            )}
                            <p
                              className="text-sm text-white/50 truncate"
                              title={link.original_url}
                            >
                              {link.original_url}
                            </p>
                          </div>
                        </div>

                        <div className="bg-[#0A0A0A] p-4 flex items-center justify-between gap-2 mt-auto">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span className="text-xs font-mono text-white/60 bg-[#222222] px-2 py-1 rounded border border-white/5 truncate">
                              /l/{link.slug}
                            </span>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleCopy(link.slug, true)}
                              className="p-2 text-white/40 hover:text-[#7B48EA] hover:bg-[#7B48EA]/10 rounded-lg transition-colors"
                              title="Copiar Link Curto"
                            >
                              {copiedSlug === link.slug ? (
                                <Check className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                            <a
                              href={`/l/${link.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-white/40 hover:text-[#7B48EA] hover:bg-[#7B48EA]/10 rounded-lg transition-colors"
                              title="Testar Link"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                            <button
                              onClick={() => handleDelete(link.id)}
                              className="p-2 text-white/40 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
