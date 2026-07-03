import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { MapPin, CheckCircle, Clock, AlertTriangle, ShieldCheck, Shield, Bell, Radio } from 'lucide-react';

interface Alerta {
  id: number;
  user_rut: string;
  user_name: string;
  button_color: string;
  lat: number;
  lng: number;
  status: string;
  created_at: string;
}

type RiskLevel = "alto" | "medio" | "bajo";

const riskConfig = {
  alto: {
    label: "Riesgo Alto",
    border: "border-red-500",
    glow: "shadow-red-500/30",
    badge: "bg-red-500/20 text-red-400 border border-red-500/40",
    icon: AlertTriangle,
    iconColor: "text-red-400",
    dot: "bg-red-500",
    pulse: "animate-pulse",
    headerBg: "bg-red-500/10",
    btnPrimary: "bg-red-600 hover:bg-red-500 text-white",
  },
  medio: {
    label: "Riesgo Medio",
    border: "border-yellow-500",
    glow: "shadow-yellow-500/20",
    badge: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40",
    icon: Shield,
    iconColor: "text-yellow-400",
    dot: "bg-yellow-400",
    pulse: "animate-pulse",
    headerBg: "bg-yellow-500/10",
    btnPrimary: "bg-yellow-600 hover:bg-yellow-500 text-white",
  },
  bajo: {
    label: "Bajo Riesgo",
    border: "border-emerald-500",
    glow: "shadow-emerald-500/20",
    badge: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40",
    icon: ShieldCheck,
    iconColor: "text-emerald-400",
    dot: "bg-emerald-400",
    pulse: "",
    headerBg: "bg-emerald-500/10",
    btnPrimary: "bg-emerald-700 hover:bg-emerald-600 text-white",
  },
};

const getRiskLevel = (color: string): RiskLevel => {
  if (color === 'red') return 'alto';
  if (color === 'yellow') return 'medio';
  return 'bajo';
};

function AlertCard({ alert, handleStatusChange }: { alert: Alerta; handleStatusChange: (id: number, status: string, rut: string) => void }) {
  const risk = getRiskLevel(alert.button_color);
  const cfg = riskConfig[risk];
  const Icon = cfg.icon;
  const isEnCurso = alert.status === 'en curso';

  return (
    <div
      className={`relative rounded-xl border-2 ${cfg.border} bg-zinc-900 shadow-lg ${cfg.glow} flex flex-col overflow-hidden transition-transform hover:-translate-y-0.5 duration-200`}
    >
      {/* Header strip */}
      <div className={`flex items-center gap-2 px-4 py-2.5 ${cfg.headerBg}`}>
        <span className={`relative flex h-2.5 w-2.5`}>
          <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${cfg.dot} ${cfg.pulse}`} />
          <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${cfg.dot}`} />
        </span>
        <Icon size={14} className={cfg.iconColor} />
        <span className={`text-xs font-semibold uppercase tracking-widest ${cfg.iconColor}`}>{cfg.label}</span>
        <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium ${isEnCurso ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' : cfg.badge}`}>
          {alert.status || 'Aceptada'}
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 px-4 py-4 space-y-2.5">
        <p className="text-white font-bold text-base leading-tight">{alert.user_name || 'Desconocido'}</p>
        <p className="text-zinc-400 text-xs font-mono">RUT: {alert.user_rut || 'N/A'}</p>

        <div className="flex items-start gap-1.5 text-zinc-400 text-xs">
          <MapPin size={12} className="mt-0.5 shrink-0 text-zinc-500" />
          <span className="font-mono">Lat: {alert.lat}, Lng: {alert.lng}</span>
        </div>

        <div className="flex items-center gap-1.5 text-zinc-400 text-xs">
          <Clock size={12} className="shrink-0 text-zinc-500" />
          <span>Recibido: {new Date(alert.created_at).toLocaleTimeString('es-CL')}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 px-4 pb-4">
        <button
          onClick={() => handleStatusChange(alert.id, 'en curso', alert.user_rut)}
          disabled={isEnCurso}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors border ${isEnCurso ? 'bg-zinc-800 text-zinc-600 border-zinc-800 cursor-not-allowed' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'}`}
        >
          <Bell size={12} />
          Notificar Patrulla
        </button>
        <button
          onClick={() => handleStatusChange(alert.id, 'finalizada', alert.user_rut)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${cfg.btnPrimary}`}
        >
          <CheckCircle size={12} />
          Finalizar
        </button>
      </div>
    </div>
  );
}

function App() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const fetchAlertas = async () => {
      try {
        const { data, error } = await supabase
          .from('alertas')
          .select('*')
          .neq('status', 'finalizada')
          .order('created_at', { ascending: false });

        if (error) {
          setErrorMsg(error.message);
          return;
        }

        setAlertas(data || []);
      } catch (err: any) {
        setErrorMsg(err.message || 'Error de conexión.');
      }
    };

    fetchAlertas();

    const pollInterval = setInterval(() => {
      fetchAlertas();
    }, 5000);

    const channel = supabase.channel('alertas-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alertas' }, async (payload) => {
        if (payload.eventType === 'INSERT') {
          const newAlert = payload.new as Alerta;
          
          if (!newAlert.status || newAlert.status === 'pendiente') {
            await supabase.from('alertas').update({ status: 'aceptada' }).eq('id', newAlert.id);
            newAlert.status = 'aceptada';
          }
          
          setAlertas(prev => {
            const exists = prev.some(a => a.id === newAlert.id);
            if (!exists) return [newAlert, ...prev];
            return prev;
          });
        } else if (payload.eventType === 'UPDATE') {
          const updatedAlert = payload.new as Alerta;
          
          setAlertas(prev => {
            if (updatedAlert.status === 'finalizada') {
              return prev.filter(a => a.id !== updatedAlert.id);
            }
            const exists = prev.some(a => a.id === updatedAlert.id);
            if (exists) {
              return prev.map(a => a.id === updatedAlert.id ? updatedAlert : a);
            }
            return [updatedAlert, ...prev];
          });
        }
      })
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, []);

  const handleStatusChange = async (id: number, newStatus: string, user_rut: string) => {
    try {
      if (newStatus === 'finalizada') {
        setAlertas(prev => prev.filter(a => a.id !== id));
      } else {
        setAlertas(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
      }

      const { error } = await supabase.from('alertas').update({ status: newStatus, user_rut }).eq('id', id);
      if (error) {
        console.error(error);
        alert('Error al actualizar en la base de datos: ' + error.message);
      }
    } catch (err: any) {
      console.error(err);
      alert('Excepción: ' + err.message);
    }
  };

  const counts = {
    alto: alertas.filter(a => getRiskLevel(a.button_color) === "alto").length,
    medio: alertas.filter(a => getRiskLevel(a.button_color) === "medio").length,
    bajo: alertas.filter(a => getRiskLevel(a.button_color) === "bajo").length,
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center">
              <Radio size={18} className="text-orange-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight leading-none">Panel Operador CENCO</h1>
              <p className="text-xs text-emerald-400 mt-0.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                Conectado y Actualizándose...
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="text-zinc-400">Alto</span>
              <span className="font-bold text-red-400">{counts.alto}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
              <span className="text-zinc-400">Medio</span>
              <span className="font-bold text-yellow-400">{counts.medio}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="text-zinc-400">Bajo</span>
              <span className="font-bold text-emerald-400">{counts.bajo}</span>
            </div>
            <div className="pl-4 border-l border-zinc-700 text-zinc-400 font-mono text-xs">
              {time.toLocaleTimeString("es-CL")}
            </div>
          </div>
        </div>
      </header>

      {/* ERROR BANNER */}
      {errorMsg && (
        <div className="bg-red-500 text-white p-4 text-center font-bold shadow-md">
          ⚠️ Ocurrió un error: {errorMsg} <br/>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-white">Emergencias Activas</h2>
            <p className="text-zinc-500 text-sm">Total: {alertas.length} — En orden de llegada</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 items-start">
          {(["alto", "medio", "bajo"] as RiskLevel[]).map(risk => {
            const cfg = riskConfig[risk];
            const column = alertas.filter(a => getRiskLevel(a.button_color) === risk);
            const Icon = cfg.icon;
            
            return (
              <div key={risk} className="flex flex-col gap-3">
                {/* Column header */}
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${cfg.border} ${cfg.headerBg}`}>
                  <Icon size={14} className={cfg.iconColor} />
                  <span className={`text-xs font-semibold uppercase tracking-widest ${cfg.iconColor}`}>{cfg.label}</span>
                  <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>{column.length}</span>
                </div>
                {/* Cards */}
                {column.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-zinc-700 gap-2 border border-dashed border-zinc-800 rounded-xl">
                    <Icon size={28} className="text-zinc-800" />
                    <p className="text-xs">Sin alertas</p>
                  </div>
                ) : (
                  column.map(alert => (
                    <AlertCard
                      key={alert.id}
                      alert={alert}
                      handleStatusChange={handleStatusChange}
                    />
                  ))
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

export default App;
