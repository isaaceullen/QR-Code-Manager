"use client";

import { useState, useEffect, useRef } from "react";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";
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
} from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";

type QRCodeData = {
  id: string;
  title?: string;
  user_id?: string;
  original_url: string;
  slug: string;
  design_settings: {
    color: string;
    logo_url: string;
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
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
      title: title || "QR Code Sem Título",
      user_id: user.id,
      original_url: url,
      slug,
      design_settings: {
        color,
        logo_url: finalLogo,
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
    const svg = document.getElementById("qr-code-svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = "qrcode.svg";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadPNG = () => {
    const canvas = document.getElementById(
      "qr-code-canvas",
    ) as HTMLCanvasElement;
    if (!canvas) return;
    const downloadUrl = canvas.toDataURL("image/png", 1.0);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = "qrcode.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadListItemSVG = (id: string, title: string) => {
    const svg = document.getElementById(`qr-svg-${id}`);
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `qrcode-${title || id}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadListItemPNG = (id: string, title: string) => {
    const canvas = document.getElementById(
      `qr-canvas-${id}`,
    ) as HTMLCanvasElement;
    if (!canvas) return;
    const downloadUrl = canvas.toDataURL("image/png", 1.0);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `qrcode-${title || id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeLogo = logoFile || logoUrl;
  const qrValue = url ? getPreviewUrl() : "https://example.com";

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
                <motion.div
                  key="generator"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#111111] rounded-2xl border border-white/10 overflow-hidden"
                >
                  <div className="p-6 border-b border-white/5">
                    <h2 className="text-lg font-semibold flex items-center gap-2 text-white">
                      <Plus className="w-5 h-5 text-[#7B48EA]" />
                      Novo QR Code Dinâmico
                    </h2>
                  </div>
                  <form onSubmit={handleGenerate} className="p-6 space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white/70 flex items-center gap-2">
                        <Type className="w-4 h-4 text-white/40" />
                        Título do QR Code
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

                    <button
                      type="submit"
                      disabled={generating || !url}
                      className="w-full bg-[#7B48EA] hover:bg-[#6A3DE8] text-white font-medium py-3 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(123,72,234,0.3)]"
                    >
                      {generating ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>Salvar QR Code Dinâmico</>
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
                  <div className="bg-white p-4 rounded-2xl shadow-xl">
                    <QRCodeSVG
                      id="qr-code-svg"
                      value={qrValue}
                      size={220}
                      fgColor={color}
                      bgColor="#FFFFFF"
                      level="H"
                      imageSettings={
                        activeLogo
                          ? {
                              src: activeLogo,
                              height: 50,
                              width: 50,
                              excavate: true,
                            }
                          : undefined
                      }
                    />
                  </div>

                  {/* Hidden Canvas for High-Res PNG Download */}
                  <div className="hidden">
                    <QRCodeCanvas
                      id="qr-code-canvas"
                      value={qrValue}
                      size={2000}
                      fgColor={color}
                      bgColor="#FFFFFF"
                      level="H"
                      imageSettings={
                        activeLogo
                          ? {
                              src: activeLogo,
                              height: 450,
                              width: 450,
                              excavate: true,
                            }
                          : undefined
                      }
                    />
                  </div>

                  <p className="text-xs text-white/40 mt-6 text-center max-w-[220px] truncate">
                    {url || "Insira uma URL para visualizar"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-8">
                  <button
                    onClick={downloadPNG}
                    disabled={!url}
                    className="py-2.5 px-4 rounded-xl bg-[#222222] hover:bg-[#333333] border border-white/5 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="w-4 h-4" />
                    PNG
                  </button>
                  <button
                    onClick={downloadSVG}
                    disabled={!url}
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
              <h2 className="text-xl font-semibold text-white">Seus QR Codes</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-[#111111] rounded-2xl border border-[#7B48EA]/30 p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <QrCode className="w-5 h-5 text-[#7B48EA]" />
                    <h3 className="text-white/70 font-medium">Total de QRs</h3>
                  </div>
                  <p className="text-3xl font-bold text-white">
                    {qrCodes.length}
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
                    {qrCodes.reduce((acc, qr) => acc + (qr.clicks || 0), 0)}
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
                      qrCodes.length > 0
                        ? qrCodes.reduce((prev, current) =>
                            prev.clicks > current.clicks ? prev : current,
                          ).title ||
                          qrCodes.reduce((prev, current) =>
                            prev.clicks > current.clicks ? prev : current,
                          ).original_url
                        : "Nenhum"
                    }
                  >
                    {qrCodes.length > 0
                      ? qrCodes.reduce((prev, current) =>
                          prev.clicks > current.clicks ? prev : current,
                        ).title ||
                        qrCodes.reduce((prev, current) =>
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
              ) : qrCodes.length === 0 ? (
                <div className="bg-[#111111] rounded-2xl border border-white/5 p-12 text-center">
                  <div className="w-16 h-16 bg-[#222222] rounded-full flex items-center justify-center mx-auto mb-4">
                    <BarChart2 className="w-8 h-8 text-white/20" />
                  </div>
                  <h3 className="text-lg font-medium text-white">
                    Nenhum QR Code criado
                  </h3>
                  <p className="text-white/50 mt-1">
                    Crie seu primeiro QR Code dinâmico acima.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {qrCodes.map((qr) => (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={qr.id}
                      className="bg-[#111111] rounded-2xl border border-white/10 overflow-hidden flex flex-col hover:border-white/20 transition-colors"
                    >
                      <div className="p-6 flex gap-6 items-center border-b border-white/5">
                        <div className="bg-white p-2 rounded-xl flex-shrink-0">
                          <QRCodeSVG
                            value={`${isMounted && typeof window !== "undefined" ? window.location.origin : ""}/q/${qr.slug}`}
                            size={72}
                            fgColor={qr.design_settings?.color || "#000000"}
                            bgColor="#FFFFFF"
                            level="H"
                            imageSettings={
                              qr.design_settings?.logo_url
                                ? {
                                    src: qr.design_settings.logo_url,
                                    height: 18,
                                    width: 18,
                                    excavate: true,
                                  }
                                : undefined
                            }
                          />
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
                        </div>
                      </div>

                      {/* Hidden Canvas for High-Res PNG Download */}
                      <div className="hidden">
                        <QRCodeSVG
                          id={`qr-svg-${qr.id}`}
                          value={`${isMounted && typeof window !== "undefined" ? window.location.origin : ""}/q/${qr.slug}`}
                          size={2000}
                          fgColor={qr.design_settings?.color || "#000000"}
                          bgColor="#FFFFFF"
                          level="H"
                          imageSettings={
                            qr.design_settings?.logo_url
                              ? {
                                  src: qr.design_settings.logo_url,
                                  height: 450,
                                  width: 450,
                                  excavate: true,
                                }
                              : undefined
                          }
                        />
                        <QRCodeCanvas
                          id={`qr-canvas-${qr.id}`}
                          value={`${isMounted && typeof window !== "undefined" ? window.location.origin : ""}/q/${qr.slug}`}
                          size={2000}
                          fgColor={qr.design_settings?.color || "#000000"}
                          bgColor="#FFFFFF"
                          level="H"
                          imageSettings={
                            qr.design_settings?.logo_url
                              ? {
                                  src: qr.design_settings.logo_url,
                                  height: 450,
                                  width: 450,
                                  excavate: true,
                                }
                              : undefined
                          }
                        />
                      </div>

                      <div className="bg-[#0A0A0A] p-4 flex items-center justify-between gap-2 mt-auto">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="text-xs font-mono text-white/60 bg-[#222222] px-2 py-1 rounded border border-white/5 truncate">
                            /q/{qr.slug}
                          </span>
                        </div>
                        <div className="flex gap-1">
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
