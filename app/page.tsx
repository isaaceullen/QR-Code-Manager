"use client";

import { useState, useEffect, useRef } from "react";
import QRCodeWrapper, { QRCodeWrapperHandle } from "@/components/QRCodeWrapper";
import { supabase } from "@/lib/supabase";
import {
  Copy,
  ExternalLink,
  Trash2,
  BarChart2,
  Link as LinkIcon,
  Palette,
  Image as ImageIcon,
  Plus,
  Check,
  AlertCircle,
  Download,
  Upload,
  LogIn,
  Lock,
  QrCode,
  TrendingUp,
  Star,
  Type,
  LayoutTemplate,
} from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";

type QRCodeData = {
  id: string;
  title?: string;
  user_id?: string;
  original_url: string;
  slug: string;
  type: "qr" | "link";
  design_settings: {
    color: string;
    logo_url: string;
    style?: "square" | "dots" | "rounded";
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

export default function Dashboard() {
  const [isMounted, setIsMounted] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Auth State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  // QR Code State
  const [qrCodes, setQrCodes] = useState<QRCodeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [color, setColor] = useState("#000000");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoFile, setLogoFile] = useState<string>("");
  const [qrStyle, setQrStyle] = useState<"square" | "dots" | "rounded">("square");
  const [activeTab, setActiveTab] = useState<"qr" | "link">("qr");
  const [listTab, setListTab] = useState<"qr" | "link">("qr");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewQrRef = useRef<QRCodeWrapperHandle>(null);
  const listQrRefs = useRef<{ [key: string]: QRCodeWrapperHandle | null }>({});

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
      console.error("Error fetching QR codes:", error);
      setError("Erro ao carregar QR Codes.");
    } else {
      setQrCodes(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    Promise.resolve().then(() => setIsMounted(true));

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoFile(reader.result as string);
        setLogoUrl(""); // Clear URL if file is uploaded
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || !user) return;

    setGenerating(true);
    setSyncing(true);
    setError("");

    const slug = generateSlug(6);
    const finalLogo = logoFile || logoUrl;

    const newQrCode = {
      title: title || (activeTab === "qr" ? "QR Code Sem Título" : "Link Sem Título"),
      user_id: user.id,
      original_url: url,
      slug,
      type: activeTab,
      design_settings: {
        color,
        logo_url: finalLogo,
        style: qrStyle,
      },
      clicks: 0,
    };

    const { data, error: insertError } = await supabase
      .from("qr_codes")
      .insert([newQrCode])
      .select()
      .single();

    if (insertError) {
      console.error("Error generating QR code:", insertError);
      setError("Erro ao criar QR Code. Verifique as configurações do banco.");
    } else if (data) {
      setQrCodes([data, ...qrCodes]);
      setUrl("");
      setTitle("");
      setColor("#000000");
      setLogoUrl("");
      setLogoFile("");
      setQrStyle("square");
      setListTab(activeTab);
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

  const handleCopy = (slug: string) => {
    const fullUrl = `${window.location.origin}/q/${slug}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const getPreviewUrl = () => {
    if (isMounted && typeof window !== "undefined") {
      return `${window.location.origin}/q/preview`;
    }
    return "https://example.com";
  };

  const downloadSVG = () => {
    previewQrRef.current?.download("svg", "qrcode");
  };

  const downloadPNG = () => {
    previewQrRef.current?.download("png", "qrcode");
  };

  const downloadListItemSVG = (id: string, title: string) => {
    listQrRefs.current[id]?.download("svg", `qrcode-${title || id}`);
  };

  const downloadListItemPNG = (id: string, title: string) => {
    listQrRefs.current[id]?.download("png", `qrcode-${title || id}`);
  };

  const activeLogo = logoFile || logoUrl;
  const qrValue = url ? getPreviewUrl() : "https://example.com";

  const filteredQrCodes = qrCodes.filter((qr) => (qr.type || "qr") === listTab);

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-[#7B48EA] selection:text-white">
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
          <button
            onClick={handleLogout}
            className="text-sm font-medium text-white/50 hover:text-white transition-colors"
          >
            Sair
          </button>
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
                Faça login para gerenciar seus QR Codes.
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content Area */}
              <div className="lg:col-span-2 space-y-6">
                {/* Tabs */}
                <div className="flex p-1 bg-[#111111] border border-white/10 rounded-2xl w-fit">
                  <button
                    onClick={() => setActiveTab("qr")}
                    className={`relative px-6 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                      activeTab === "qr" ? "text-white" : "text-white/50 hover:text-white/80"
                    }`}
                  >
                    {activeTab === "qr" && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-[#7B48EA] rounded-xl"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                      <QrCode className="w-4 h-4" />
                      QR Code
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveTab("link")}
                    className={`relative px-6 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                      activeTab === "link" ? "text-white" : "text-white/50 hover:text-white/80"
                    }`}
                  >
                    {activeTab === "link" && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-[#7B48EA] rounded-xl"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                      <LinkIcon className="w-4 h-4" />
                      Link Curto
                    </span>
                  </button>
                </div>

                <motion.div
                  key="generator"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#111111] rounded-2xl border border-white/10 overflow-hidden"
                >
                  <div className="p-6 border-b border-white/5">
                    <h2 className="text-lg font-semibold flex items-center gap-2 text-white">
                      <Plus className="w-5 h-5 text-[#7B48EA]" />
                      {activeTab === "qr" ? "Novo QR Code Dinâmico" : "Novo Link Curto"}
                    </h2>
                  </div>
                  <form onSubmit={handleGenerate} className="p-6 space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white/70 flex items-center gap-2">
                        <Type className="w-4 h-4 text-white/40" />
                        {activeTab === "qr" ? "Título do QR Code" : "Título do Link"}
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

                    {activeTab === "qr" && (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-white/70 flex items-center gap-2">
                              <Palette className="w-4 h-4 text-white/40" />
                              Cor do QR Code
                            </label>
                            <div className="flex gap-3">
                              <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-white/10 flex-shrink-0">
                                <input
                                  type="color"
                                  value={color}
                                  onChange={(e) => setColor(e.target.value)}
                                  className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer"
                                />
                              </div>
                              <input
                                type="text"
                                value={color}
                                onChange={(e) => setColor(e.target.value)}
                                className="flex-1 px-4 py-3 rounded-xl bg-[#050505] border border-white/10 focus:border-[#7B48EA] focus:ring-1 focus:ring-[#7B48EA] outline-none transition-all font-mono text-sm uppercase text-white"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium text-white/70 flex items-center gap-2">
                              <ImageIcon className="w-4 h-4 text-white/40" />
                              Logo Central
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="url"
                                value={logoUrl}
                                onChange={(e) => {
                                  setLogoUrl(e.target.value);
                                  setLogoFile("");
                                }}
                                placeholder="URL da imagem..."
                                className="flex-1 px-4 py-3 rounded-xl bg-[#050505] border border-white/10 focus:border-[#7B48EA] focus:ring-1 focus:ring-[#7B48EA] outline-none transition-all text-white placeholder:text-white/30 text-sm"
                              />
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="px-4 py-3 rounded-xl bg-[#222222] hover:bg-[#333333] border border-white/10 transition-colors flex items-center justify-center text-white/70 hover:text-white"
                                title="Upload de Arquivo"
                              >
                                <Upload className="w-5 h-5" />
                              </button>
                              <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                accept="image/*"
                                className="hidden"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-white/70 flex items-center gap-2">
                            <LayoutTemplate className="w-4 h-4 text-white/40" />
                            Estilo de Formato
                          </label>
                          <div className="grid grid-cols-3 gap-3">
                            {(["square", "dots", "rounded"] as const).map((style) => (
                              <button
                                key={style}
                                type="button"
                                onClick={() => setQrStyle(style)}
                                className={`py-3 px-4 rounded-xl border transition-all text-sm font-medium capitalize ${
                                  qrStyle === style
                                    ? "bg-[#7B48EA]/20 border-[#7B48EA] text-white"
                                    : "bg-[#050505] border-white/10 text-white/50 hover:border-white/30"
                                }`}
                              >
                                {style === "square" ? "Quadrado" : style === "dots" ? "Pontos" : "Arredondado"}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={generating || !url}
                      className="w-full bg-[#7B48EA] hover:bg-[#6A3DE8] text-white font-medium py-3 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(123,72,234,0.3)]"
                    >
                      {generating ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>{activeTab === "qr" ? "Salvar QR Code Dinâmico" : "Criar Link Curto"}</>
                      )}
                    </button>
                  </form>
                </motion.div>
              </div>

              {/* Preview & Download */}
              <div className="bg-[#111111] rounded-2xl border border-white/10 p-6 flex flex-col">
                <h3 className="text-sm font-medium text-white/50 mb-6 uppercase tracking-wider text-center">
                  Preview
                </h3>

                <div className="flex-1 flex flex-col items-center justify-center">
                  {activeTab === "qr" ? (
                    <div className="bg-white p-4 rounded-2xl shadow-xl">
                      <QRCodeWrapper
                        ref={previewQrRef}
                        data={qrValue}
                        size={220}
                        color={color}
                        logoUrl={activeLogo}
                        style={qrStyle}
                      />
                    </div>
                  ) : (
                    <div className="bg-[#222222] p-8 rounded-2xl border border-white/10 flex flex-col items-center justify-center text-center">
                      <LinkIcon className="w-12 h-12 text-[#7B48EA] mb-4" />
                      <p className="text-white font-medium">Link Curto</p>
                      <p className="text-white/50 text-sm mt-2 max-w-[200px]">
                        O preview visual não está disponível para links curtos.
                      </p>
                    </div>
                  )}

                  <p className="text-xs text-white/40 mt-6 text-center max-w-[220px] truncate">
                    {url || "Insira uma URL para visualizar"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-8">
                  <button
                    onClick={downloadPNG}
                    disabled={!url || activeTab === "link"}
                    className="py-2.5 px-4 rounded-xl bg-[#222222] hover:bg-[#333333] border border-white/5 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="w-4 h-4" />
                    PNG
                  </button>
                  <button
                    onClick={downloadSVG}
                    disabled={!url || activeTab === "link"}
                    className="py-2.5 px-4 rounded-xl bg-[#222222] hover:bg-[#333333] border border-white/5 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="w-4 h-4" />
                    SVG
                  </button>
                </div>
              </div>
            </div>

            {/* List */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6 pt-8 border-t border-white/10"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-xl font-semibold text-white">Seus Itens</h2>
                
                {/* List Tabs */}
                <div className="flex p-1 bg-[#111111] border border-white/10 rounded-2xl w-fit">
                  <button
                    onClick={() => setListTab("qr")}
                    className={`relative px-4 py-2 text-sm font-medium rounded-xl transition-colors ${
                      listTab === "qr" ? "text-white" : "text-white/50 hover:text-white/80"
                    }`}
                  >
                    {listTab === "qr" && (
                      <motion.div
                        layoutId="listTab"
                        className="absolute inset-0 bg-[#7B48EA] rounded-xl"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                      <QrCode className="w-4 h-4" />
                      Meus QR Codes
                    </span>
                  </button>
                  <button
                    onClick={() => setListTab("link")}
                    className={`relative px-4 py-2 text-sm font-medium rounded-xl transition-colors ${
                      listTab === "link" ? "text-white" : "text-white/50 hover:text-white/80"
                    }`}
                  >
                    {listTab === "link" && (
                      <motion.div
                        layoutId="listTab"
                        className="absolute inset-0 bg-[#7B48EA] rounded-xl"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                      <LinkIcon className="w-4 h-4" />
                      Meus Links
                    </span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-[#111111] rounded-2xl border border-[#7B48EA]/30 p-6">
                  <div className="flex items-center gap-3 mb-2">
                    {listTab === "qr" ? <QrCode className="w-5 h-5 text-[#7B48EA]" /> : <LinkIcon className="w-5 h-5 text-[#7B48EA]" />}
                    <h3 className="text-white/70 font-medium">Total de {listTab === "qr" ? "QRs" : "Links"}</h3>
                  </div>
                  <p className="text-3xl font-bold text-white">
                    {filteredQrCodes.length}
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
                    {filteredQrCodes.reduce((acc, qr) => acc + (qr.clicks || 0), 0)}
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
                      filteredQrCodes.length > 0
                        ? filteredQrCodes.reduce((prev, current) =>
                            prev.clicks > current.clicks ? prev : current,
                          ).title ||
                          filteredQrCodes.reduce((prev, current) =>
                            prev.clicks > current.clicks ? prev : current,
                          ).original_url
                        : "Nenhum"
                    }
                  >
                    {filteredQrCodes.length > 0
                      ? filteredQrCodes.reduce((prev, current) =>
                          prev.clicks > current.clicks ? prev : current,
                        ).title ||
                        filteredQrCodes.reduce((prev, current) =>
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
                      className="bg-[#111111] rounded-2xl border border-white/5 p-6 h-48 animate-pulse"
                    />
                  ))}
                </div>
              ) : filteredQrCodes.length === 0 ? (
                <div className="bg-[#111111] rounded-2xl border border-white/5 p-12 text-center">
                  <div className="w-16 h-16 bg-[#222222] rounded-full flex items-center justify-center mx-auto mb-4">
                    <BarChart2 className="w-8 h-8 text-white/20" />
                  </div>
                  <h3 className="text-lg font-medium text-white">
                    Nenhum {listTab === "qr" ? "QR Code" : "Link Curto"} criado
                  </h3>
                  <p className="text-white/50 mt-1">
                    Crie seu primeiro {listTab === "qr" ? "QR Code" : "Link Curto"} acima.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredQrCodes.map((qr) => (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={qr.id}
                      className="bg-[#111111] rounded-2xl border border-white/10 overflow-hidden flex flex-col hover:border-white/20 transition-colors"
                    >
                      <div className="p-6 flex gap-6 items-center border-b border-white/5">
                        <div className="bg-white p-2 rounded-xl flex-shrink-0">
                          {qr.type === "link" ? (
                            <div className="w-[72px] h-[72px] flex items-center justify-center bg-[#f5f5f5] rounded-lg">
                              <LinkIcon className="w-8 h-8 text-[#7B48EA]" />
                            </div>
                          ) : (
                            <QRCodeWrapper
                              ref={(el) => {
                                listQrRefs.current[qr.id] = el;
                              }}
                              data={`${isMounted && typeof window !== "undefined" ? window.location.origin : ""}/q/${qr.slug}`}
                              size={72}
                              color={qr.design_settings?.color || "#000000"}
                              logoUrl={qr.design_settings?.logo_url}
                              style={qr.design_settings?.style || "square"}
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <BarChart2 className="w-4 h-4 text-[#7B48EA]" />
                            <span className="text-2xl font-bold text-white">
                              {qr.clicks}
                            </span>
                            <span className="text-sm text-white/50">cliques</span>
                          </div>
                          {qr.title && (
                            <p
                              className="text-white font-medium truncate"
                              title={qr.title}
                            >
                              {qr.title}
                            </p>
                          )}
                          <p
                            className="text-sm text-white/50 truncate"
                            title={qr.original_url}
                          >
                            {qr.original_url}
                          </p>
                          <p className="text-xs text-white/30 mt-1">
                            {new Date(qr.created_at).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                      </div>

                      <div className="bg-[#0A0A0A] p-4 flex items-center justify-between gap-2 mt-auto">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="text-xs font-mono text-white/60 bg-[#222222] px-2 py-1 rounded border border-white/5 truncate">
                            /q/{qr.slug}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          {qr.type !== "link" && (
                            <>
                              <button
                                onClick={() =>
                                  downloadListItemPNG(qr.id, qr.title || qr.slug)
                                }
                                className="p-2 text-white/40 hover:text-[#7B48EA] hover:bg-[#7B48EA]/10 rounded-lg transition-colors"
                                title="Baixar PNG"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() =>
                                  downloadListItemSVG(qr.id, qr.title || qr.slug)
                                }
                                className="p-2 text-white/40 hover:text-[#7B48EA] hover:bg-[#7B48EA]/10 rounded-lg transition-colors"
                                title="Baixar SVG"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleCopy(qr.slug)}
                            className="p-2 text-white/40 hover:text-[#7B48EA] hover:bg-[#7B48EA]/10 rounded-lg transition-colors"
                            title="Copiar Link Curto"
                          >
                            {copiedSlug === qr.slug ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                          <a
                            href={`/q/${qr.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-white/40 hover:text-[#7B48EA] hover:bg-[#7B48EA]/10 rounded-lg transition-colors"
                            title="Testar Link"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => handleDelete(qr.id)}
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
          </>
        )}
      </div>
    </div>
  );
}
