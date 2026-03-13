import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Smartphone, Monitor, Tablet, MapPin, Globe, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
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
  const deviceCounts = scans.reduce((acc, scan) => {
    const device = scan.device || "Desconhecido";
    acc[device] = (acc[device] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const deviceData = Object.keys(deviceCounts).map((key) => ({
    name: key,
    value: deviceCounts[key],
  }));

  const totalScans = scans.length;

  // Recent cities
  const recentCities = scans
    .filter((s) => s.city && s.city !== "Desconhecida")
    .map((s) => `${s.city}, ${s.region || s.country}`)
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 5);

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
            <button
              onClick={onClose}
              className="p-2 text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1">
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
                {/* Device Stats */}
                <div>
                  <h3 className="text-sm font-medium text-white/70 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Smartphone className="w-4 h-4" />
                    Acessos por Dispositivo
                  </h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={deviceData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <XAxis type="number" hide />
                        <YAxis
                          dataKey="name"
                          type="category"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 12 }}
                          width={80}
                        />
                        <Tooltip
                          cursor={{ fill: "rgba(255,255,255,0.05)" }}
                          contentStyle={{
                            backgroundColor: "#050505",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: "8px",
                            color: "#fff",
                          }}
                          formatter={(value: any) => [
                            value && totalScans > 0 ? `${value} (${((value / totalScans) * 100).toFixed(1)}%)` : '0',
                            "Acessos",
                          ]}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32}>
                          {deviceData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={colors[index % colors.length]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Location Stats */}
                <div>
                  <h3 className="text-sm font-medium text-white/70 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Últimas Cidades
                  </h3>
                  {recentCities.length > 0 ? (
                    <div className="bg-[#050505] rounded-xl border border-white/5 overflow-hidden">
                      {recentCities.map((city, i) => (
                        <div
                          key={i}
                          className="px-4 py-3 border-b border-white/5 last:border-0 flex items-center gap-3"
                        >
                          <div className="w-2 h-2 rounded-full bg-[#7B48EA]" />
                          <span className="text-white/80 text-sm">{city}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-white/40 text-sm">
                      Nenhuma localização identificada.
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
