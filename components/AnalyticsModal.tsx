import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Smartphone, Monitor, Tablet, MapPin, Globe, Loader2, Calendar, Compass, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";

type ScanData = {
  id: string;
  city: string;
  country: string;
  region: string;
  device: string;
  browser: string;
  created_at: string;
};

type AnalyticsModalProps = {
  qrCodeId: string;
  qrCodeTitle: string;
  onClose: () => void;
};

export default function AnalyticsModal({
  qrCodeId,
  qrCodeTitle,
  onClose,
}: AnalyticsModalProps) {
  const [scans, setScans] = useState<ScanData[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"7d" | "30d" | "all">("7d");

  useEffect(() => {
    const fetchScans = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("qr_scans")
        .select("*")
        .eq("qr_code_id", qrCodeId)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setScans(data);
      }
      setLoading(false);
    };

    fetchScans();
  }, [qrCodeId]);

  // Process data for charts
  const { deviceData, browserData, cityData, temporalData, peakHoursData, totalScans } = useMemo(() => {
    const now = new Date();
    
    // Filter by period
    const filteredScans = scans.filter(scan => {
      if (period === "all") return true;
      if (!scan.created_at) return false;
      
      const scanDate = new Date(scan.created_at);
      const diffTime = Math.abs(now.getTime() - scanDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (period === "7d") return diffDays <= 7;
      if (period === "30d") return diffDays <= 30;
      return true;
    });

    const total = filteredScans.length;

    // Helper to group, count, and sort
    const groupAndSort = (keyFn: (scan: ScanData) => string) => {
      const counts = filteredScans.reduce((acc, scan) => {
        const key = keyFn(scan);
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(counts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
    };

    // Device Stats
    const dData = groupAndSort(s => s.device || "Desconhecido");

    // Browser Stats
    const bData = groupAndSort(s => s.browser || "Desconhecido");

    // City Stats
    const cData = groupAndSort(s => {
      if (!s.city || s.city === "Desconhecida") return "Desconhecida";
      return `${s.city}, ${s.region || s.country}`;
    });

    // Peak Hours Stats
    const pHoursData = groupAndSort(s => {
      if (!s.created_at) return "Desconhecido";
      const hour = new Date(s.created_at).getHours();
      const formattedHour = hour.toString().padStart(2, '0');
      return `${formattedHour}:00 - ${formattedHour}:59`;
    }).filter(item => item.name !== "Desconhecido");

    // Temporal Stats
    const clicksByDate = filteredScans.reduce((acc, scan) => {
      if (!scan.created_at) return acc;
      const date = new Date(scan.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    let daysToGenerate = 7;
    if (period === "30d") daysToGenerate = 30;
    if (period === "all") {
      if (filteredScans.length > 0) {
        const oldest = new Date(Math.min(...filteredScans.map(s => new Date(s.created_at).getTime())));
        const diffTime = Math.abs(now.getTime() - oldest.getTime());
        daysToGenerate = Math.max(7, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      }
    }

    const dateArray = Array.from({ length: daysToGenerate }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (daysToGenerate - 1 - i));
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    });

    const tData = dateArray.map(date => ({
      date,
      acessos: clicksByDate[date] || 0
    }));

    return {
      deviceData: dData,
      browserData: bData,
      cityData: cData,
      temporalData: tData,
      peakHoursData: pHoursData,
      totalScans: total
    };
  }, [scans, period]);

  const colors = ["#7B48EA", "#9D72F3", "#BFA0F9", "#E1D0FE"];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#111111] border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        >
          <div className="p-6 border-b border-white/10 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">
                Detalhes de Acesso
              </h2>
              <p className="text-white/50 text-sm mt-1">
                {qrCodeTitle || "Item"}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex bg-[#050505] rounded-lg p-1 border border-white/10">
                <button 
                  onClick={() => setPeriod('7d')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${period === '7d' ? 'bg-[#7B48EA] text-white' : 'text-white/50 hover:text-white'}`}
                >
                  7 Dias
                </button>
                <button 
                  onClick={() => setPeriod('30d')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${period === '30d' ? 'bg-[#7B48EA] text-white' : 'text-white/50 hover:text-white'}`}
                >
                  30 Dias
                </button>
                <button 
                  onClick={() => setPeriod('all')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${period === 'all' ? 'bg-[#7B48EA] text-white' : 'text-white/50 hover:text-white'}`}
                >
                  Todos
                </button>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-6 overflow-y-auto flex-1">
            {/* Mobile Period Selector */}
            <div className="sm:hidden flex bg-[#050505] rounded-lg p-1 border border-white/10 mb-6">
              <button 
                onClick={() => setPeriod('7d')}
                className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${period === '7d' ? 'bg-[#7B48EA] text-white' : 'text-white/50 hover:text-white'}`}
              >
                7 Dias
              </button>
              <button 
                onClick={() => setPeriod('30d')}
                className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${period === '30d' ? 'bg-[#7B48EA] text-white' : 'text-white/50 hover:text-white'}`}
              >
                30 Dias
              </button>
              <button 
                onClick={() => setPeriod('all')}
                className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${period === 'all' ? 'bg-[#7B48EA] text-white' : 'text-white/50 hover:text-white'}`}
              >
                Todos
              </button>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-[#7B48EA] animate-spin mb-4" />
                <p className="text-white/50">Carregando dados...</p>
              </div>
            ) : totalScans === 0 ? (
              <div className="text-center py-12">
                <Globe className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white">
                  Nenhum acesso registrado
                </h3>
                <p className="text-white/50 mt-1">
                  Este item ainda não recebeu cliques.
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Temporal Stats */}
                <div>
                  <h3 className="text-sm font-medium text-white/70 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Evolução de Acessos
                  </h3>
                  <div className="h-64 w-full bg-[#050505] rounded-xl border border-white/5 p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={temporalData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis 
                          dataKey="date" 
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }}
                          dy={10}
                          minTickGap={20}
                        />
                        <YAxis 
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }}
                          allowDecimals={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#111111",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: "8px",
                            color: "#fff",
                          }}
                          itemStyle={{ color: "#7B48EA" }}
                          formatter={(value: any) => [value, "Acessos"]}
                          labelStyle={{ color: "rgba(255,255,255,0.5)", marginBottom: "4px" }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="acessos" 
                          stroke="#7B48EA" 
                          strokeWidth={3}
                          dot={{ fill: "#111111", stroke: "#7B48EA", strokeWidth: 2, r: 4 }}
                          activeDot={{ fill: "#7B48EA", stroke: "#fff", strokeWidth: 2, r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Device Stats */}
                  <div>
                    <h3 className="text-sm font-medium text-white/70 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Smartphone className="w-4 h-4" />
                      Dispositivos
                    </h3>
                    {deviceData.length > 0 ? (
                      <div className="bg-[#050505] rounded-xl border border-white/5 overflow-hidden">
                        {deviceData.map((item, i) => (
                          <div
                            key={i}
                            className="px-4 py-3 border-b border-white/5 last:border-0 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-2 rounded-full bg-[#7B48EA]" />
                              <span className="text-white/80 text-sm">{item.name}</span>
                            </div>
                            <span className="font-bold text-white">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-white/40 text-sm">Nenhum dispositivo identificado.</p>
                    )}
                  </div>

                  {/* Browser Stats */}
                  <div>
                    <h3 className="text-sm font-medium text-white/70 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Compass className="w-4 h-4" />
                      Navegadores
                    </h3>
                    {browserData.length > 0 ? (
                      <div className="bg-[#050505] rounded-xl border border-white/5 overflow-hidden">
                        {browserData.map((item, i) => (
                          <div
                            key={i}
                            className="px-4 py-3 border-b border-white/5 last:border-0 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-2 rounded-full bg-[#7B48EA]" />
                              <span className="text-white/80 text-sm">{item.name}</span>
                            </div>
                            <span className="font-bold text-white">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-white/40 text-sm">Nenhum navegador identificado.</p>
                    )}
                  </div>
                </div>

                {/* Location Stats */}
                <div>
                  <h3 className="text-sm font-medium text-white/70 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Cidades
                  </h3>
                  {cityData.length > 0 ? (
                    <div className="bg-[#050505] rounded-xl border border-white/5 overflow-hidden">
                      {cityData.map((item, i) => (
                        <div
                          key={i}
                          className="px-4 py-3 border-b border-white/5 last:border-0 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-[#7B48EA]" />
                            <span className="text-white/80 text-sm">{item.name}</span>
                          </div>
                          <span className="font-bold text-white">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-white/40 text-sm">
                      Nenhuma localização identificada.
                    </p>
                  )}
                </div>

                {/* Peak Hours Stats */}
                <div>
                  <h3 className="text-sm font-medium text-white/70 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Horários de Pico
                  </h3>
                  {peakHoursData.length > 0 ? (
                    <div className="bg-[#050505] rounded-xl border border-white/5 overflow-hidden">
                      {peakHoursData.map((item, i) => (
                        <div
                          key={i}
                          className="px-4 py-3 border-b border-white/5 last:border-0 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-[#7B48EA]" />
                            <span className="text-white/80 text-sm">{item.name}</span>
                          </div>
                          <span className="font-bold text-white">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-white/40 text-sm">
                      Nenhum horário identificado.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
