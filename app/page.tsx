"use client";

import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
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
} from "lucide-react";
import { motion } from "motion/react";

type QRCodeData = {
  id: string;
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
  const [qrCodes, setQrCodes] = useState<QRCodeData[]>([]);
  const [loading, setLoading] = useState(true);

  const [url, setUrl] = useState("");
  const [color, setColor] = useState("#000000");
  const [logoUrl, setLogoUrl] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    let mounted = true;
    const loadQRCodes = async () => {
      // Avoid synchronous setState in effect by using a microtask
      await Promise.resolve();
      if (!mounted) return;

      setLoading(true);
      const { data, error } = await supabase
        .from("qr_codes")
        .select("*")
        .order("created_at", { ascending: false });

      if (!mounted) return;

      if (error) {
        console.error("Error fetching QR codes:", error);
        setError(
          'Erro ao carregar QR Codes. Verifique se a tabela "qr_codes" existe no Supabase.',
        );
      } else {
        setQrCodes(data || []);
      }
      setLoading(false);
    };

    loadQRCodes();
    return () => {
      mounted = false;
    };
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setGenerating(true);
    setError("");

    const slug = generateSlug(6);

    const newQrCode = {
      original_url: url,
      slug,
      design_settings: {
        color,
        logo_url: logoUrl,
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
      setError(
        'Erro ao criar QR Code. Certifique-se de que a tabela "qr_codes" foi criada corretamente.',
      );
    } else if (data) {
      setQrCodes([data, ...qrCodes]);
      setUrl("");
      setColor("#000000");
      setLogoUrl("");
    }

    setGenerating(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("qr_codes").delete().eq("id", id);

    if (!error) {
      setQrCodes(qrCodes.filter((qr) => qr.id !== id));
    }
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              QR Code Manager
            </h1>
            <p className="text-slate-500 mt-1">
              Crie, gerencie e rastreie seus QR Codes dinâmicos.
            </p>
          </div>
        </header>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Erro de Conexão</p>
              <p className="text-sm mt-1">{error}</p>
              <div className="mt-3 text-sm font-mono bg-white/50 p-3 rounded-lg overflow-x-auto">
                {`CREATE TABLE qr_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  original_url TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  design_settings JSONB DEFAULT '{}'::jsonb,
  clicks INT8 DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);`}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create Form */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-500" />
                Novo QR Code
              </h2>
            </div>
            <form onSubmit={handleGenerate} className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-slate-400" />
                  URL de Destino
                </label>
                <input
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://seusite.com/campanha"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <Palette className="w-4 h-4 text-slate-400" />
                    Cor do QR Code
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="h-12 w-12 rounded-xl cursor-pointer border-0 p-0"
                    />
                    <input
                      type="text"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-mono text-sm uppercase"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-slate-400" />
                    URL da Logo (Opcional)
                  </label>
                  <input
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://site.com/logo.png"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={generating || !url}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {generating ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Gerar QR Code Dinâmico</>
                )}
              </button>
            </form>
          </div>

          {/* Preview */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col items-center justify-center min-h-[300px]">
            <h3 className="text-sm font-medium text-slate-500 mb-6 uppercase tracking-wider">
              Preview
            </h3>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <QRCodeSVG
                value={url || getPreviewUrl()}
                size={200}
                fgColor={color}
                level="H"
                imageSettings={
                  logoUrl
                    ? {
                        src: logoUrl,
                        height: 48,
                        width: 48,
                        excavate: true,
                      }
                    : undefined
                }
              />
            </div>
            <p className="text-xs text-slate-400 mt-6 text-center max-w-[200px] truncate">
              {url || "Insira uma URL para visualizar"}
            </p>
          </div>
        </div>

        {/* List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">
            Seus QR Codes
          </h2>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-slate-200 p-6 h-48 animate-pulse"
                />
              ))}
            </div>
          ) : qrCodes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart2 className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-medium text-slate-900">
                Nenhum QR Code criado
              </h3>
              <p className="text-slate-500 mt-1">
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
                  className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col"
                >
                  <div className="p-6 flex gap-6 items-center border-b border-slate-100">
                    <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-100 flex-shrink-0">
                      <QRCodeSVG
                        value={`${isMounted && typeof window !== "undefined" ? window.location.origin : ""}/q/${qr.slug}`}
                        size={80}
                        fgColor={qr.design_settings?.color || "#000000"}
                        level="H"
                        imageSettings={
                          qr.design_settings?.logo_url
                            ? {
                                src: qr.design_settings.logo_url,
                                height: 20,
                                width: 20,
                                excavate: true,
                              }
                            : undefined
                        }
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <BarChart2 className="w-4 h-4 text-indigo-500" />
                        <span className="text-2xl font-bold text-slate-900">
                          {qr.clicks}
                        </span>
                        <span className="text-sm text-slate-500">cliques</span>
                      </div>
                      <p
                        className="text-sm text-slate-500 truncate"
                        title={qr.original_url}
                      >
                        {qr.original_url}
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 flex items-center justify-between gap-2 mt-auto">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="text-xs font-mono text-slate-500 bg-white px-2 py-1 rounded border border-slate-200 truncate">
                        /q/{qr.slug}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCopy(qr.slug)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Copiar Link Curto"
                      >
                        {copiedSlug === qr.slug ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                      <a
                        href={`/q/${qr.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Testar Link"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => handleDelete(qr.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
        </div>
      </div>
    </div>
  );
}
