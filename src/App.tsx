import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { MapPin, CheckCircle, Clock, ShieldAlert } from 'lucide-react';

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

function App() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>('');

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

    const channel = supabase.channel('alertas-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alertas' }, async (payload) => {
        if (payload.eventType === 'INSERT') {
          const newAlert = payload.new as Alerta;
          
          if (!newAlert.status || newAlert.status === 'pendiente') {
            await supabase.from('alertas').update({ status: 'aceptada' }).eq('id', newAlert.id);
            newAlert.status = 'aceptada';
          }
          
          setAlertas(prev => [newAlert, ...prev]);
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
      supabase.removeChannel(channel);
    };
  }, []);

  const handleStatusChange = async (id: number, newStatus: string, user_rut: string) => {
    try {
      // Actualización optimista de la UI
      if (newStatus === 'finalizada') {
        setAlertas(prev => prev.filter(a => a.id !== id));
      } else {
        setAlertas(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
      }

      // IMPORTANTE: Se envía user_rut para que Supabase lo incluya en el evento de Realtime (WAL) 
      // y la app móvil (que filtra por user_rut) reciba la notificación correctamente.
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* HEADER */}
      <header className="bg-emerald-600 shadow-md p-5 flex justify-between items-center text-white">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500 p-2 rounded-lg">
            <ShieldAlert size={28} />
          </div>
          <h1 className="text-2xl font-bold tracking-wide">Panel Operador CENCO</h1>
        </div>
        <div className="flex items-center gap-2 bg-emerald-700/50 px-4 py-2 rounded-full border border-emerald-500/30">
          <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse"></div>
          <span className="font-semibold text-sm">Conectado y En Línea</span>
        </div>
      </header>

      {/* ERROR BANNER */}
      {errorMsg && (
        <div className="bg-red-500 text-white p-4 text-center font-bold shadow-md">
          ⚠️ Ocurrió un error: {errorMsg} <br/>
          <span className="text-sm font-normal">¿Añadiste la columna 'status' en la base de datos?</span>
        </div>
      )}

      {/* MAIN CONTENT */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col gap-6">
        <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
          <h2 className="text-2xl font-extrabold text-slate-800">Emergencias Activas</h2>
          <span className="bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full text-sm shadow-sm">
            {alertas.length}
          </span>
        </div>

        {alertas.length === 0 && !errorMsg ? (
          <div className="flex flex-col items-center justify-center flex-1 text-slate-400 mt-20 gap-4">
            <CheckCircle size={64} className="text-emerald-300 opacity-50" />
            <p className="text-lg font-medium">No hay emergencias pendientes en este momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {alertas.map(alerta => {
              const isEnCurso = alerta.status === 'en curso';
              
              let borderColor = 'border-emerald-500';
              let badgeColor = 'bg-emerald-100 text-emerald-700';
              if (alerta.button_color === 'red') {
                borderColor = 'border-red-500';
                badgeColor = 'bg-red-100 text-red-700';
              } else if (alerta.button_color === 'yellow') {
                borderColor = 'border-amber-400';
                badgeColor = 'bg-amber-100 text-amber-700';
              }

              return (
                <div 
                  key={alerta.id} 
                  className={`bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow border-l-[6px] ${borderColor} flex flex-col gap-4 relative overflow-hidden`}
                >
                  {isEnCurso && (
                    <div className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg uppercase tracking-wider">
                      Patrulla Notificada
                    </div>
                  )}

                  <div className="flex justify-between items-start mt-2">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 leading-tight">
                        {alerta.user_name || 'Desconocido'}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium mt-1">RUT: {alerta.user_rut || 'N/A'}</p>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-md uppercase ${isEnCurso ? 'bg-blue-100 text-blue-700' : badgeColor}`}>
                      {alerta.status || 'Aceptada'}
                    </span>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3 flex flex-col gap-2 border border-slate-100">
                    <div className="flex items-center gap-2 text-slate-600">
                      <MapPin size={16} className="text-emerald-500" />
                      <span className="text-sm font-medium">Lat: {alerta.lat}, Lng: {alerta.lng}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                      <Clock size={14} className="text-slate-400" />
                      <span className="text-xs">Recibido: {new Date(alerta.created_at).toLocaleTimeString('es-CL')}</span>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-auto pt-2">
                    <button
                      onClick={() => handleStatusChange(alerta.id, 'en curso', alerta.user_rut)}
                      disabled={isEnCurso}
                      className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${isEnCurso ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 text-white shadow-sm hover:shadow-md'}`}
                    >
                      Notificar Patrulla
                    </button>
                    <button
                      onClick={() => handleStatusChange(alerta.id, 'finalizada', alerta.user_rut)}
                      className="flex-1 py-2.5 rounded-xl font-bold text-sm bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm hover:shadow-md transition-all"
                    >
                      Finalizar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
