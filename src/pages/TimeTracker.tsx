import React, { useState, useEffect } from 'react';
import { Play, StopCircle, Clock, DollarSign } from 'lucide-react';
import Header from '../components/Header';
import { useData } from '../contexts/DataContext';
import { formatCurrency } from '../utils/format';

const TimeTracker: React.FC = () => {
  const [hourlyRate, setHourlyRate] = useState<string>('25');
  const [timerState, setTimerState] = useState<'idle' | 'running'>('idle');
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [isPaid, setIsPaid] = useState<boolean>(true);
  const [estimatedEarnings, setEstimatedEarnings] = useState<number>(0);

  const { startTimeSession, stopTimeSession, getCurrentTimeSession } = useData();

  useEffect(() => {
    const currentSession = getCurrentTimeSession();
    if (currentSession) {
      setCurrentSessionId(currentSession.id);
      setHourlyRate(currentSession.hourlyRate.toString());
      setTimerState('running');

      const sessionStartTime = new Date(currentSession.startTime);
      setStartTime(sessionStartTime);

      const elapsed = Math.floor((Date.now() - sessionStartTime.getTime() - currentSession.pausedTime) / 1000);
      setElapsedTime(elapsed);
    }
  }, [getCurrentTimeSession]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (timerState === 'running' && startTime) {
      interval = setInterval(() => {
        const now = new Date();
        const newElapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        setElapsedTime(newElapsed);

        const hours = newElapsed / 3600;
        const rate = parseFloat(hourlyRate) || 0;
        setEstimatedEarnings(hours * rate);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerState, startTime, hourlyRate]);

  const handleStart = () => {
    const rate = parseFloat(hourlyRate) || 0;
    if (rate <= 0) {
      alert('Por favor, insira um valor válido para o valor/hora.');
      return;
    }

    const sessionId = startTimeSession(rate);
    setCurrentSessionId(sessionId);
    setStartTime(new Date());
    setTimerState('running');
    setElapsedTime(0);
  };

  const handleStop = () => {
    if (currentSessionId) {
      stopTimeSession(currentSessionId, isPaid);
      setTimerState('idle');
      setElapsedTime(0);
      setCurrentSessionId('');
      setStartTime(null);
      setEstimatedEarnings(0);
    }
  };

  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    return [
      h.toString().padStart(2, '0'),
      m.toString().padStart(2, '0'),
      s.toString().padStart(2, '0')
    ].join(':');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white flex flex-col">
      <Header title="Controle de Horas" showBackButton />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-10 max-w-4xl space-y-10">

          {/* Sessão Atual */}
          <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
            <h2 className="text-gray-700 dark:text-gray-300 text-xl mb-4 font-semibold">Sessão Atual</h2>
            <div className="text-5xl font-bold text-blue-700 dark:text-blue-400 font-mono">
              {formatTime(elapsedTime)}
            </div>
            {timerState === 'running' && (
              <p className="mt-4 text-md text-gray-600 dark:text-gray-300">
                Ganhos Estimados:
                <span className="font-semibold text-green-600 dark:text-green-400 ml-1">
                  {formatCurrency(estimatedEarnings)}
                </span>
              </p>
            )}
          </section>

          {/* Formulário de Controle */}
          <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 space-y-6">
            <h2 className="text-xl font-semibold mb-4">Configurações da Sessão</h2>

            {/* Valor por hora */}
            <div>
              <label htmlFor="hourlyRate" className="label">Valor da Hora (R$)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                  <DollarSign size={18} />
                </span>
                <input
                  id="hourlyRate"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  className="input-field pl-10"
                  placeholder="25,00"
                  disabled={timerState !== 'idle'}
                  required
                />
              </div>
            </div>

            {/* Tipo de tempo */}
            <div>
              <label className="label">Tipo de Tempo</label>
              <div className="flex gap-6">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="type"
                    checked={isPaid}
                    onChange={() => setIsPaid(true)}
                    className="form-radio text-blue-600 dark:bg-gray-700"
                  />
                  <span className="ml-2">Pago</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="type"
                    checked={!isPaid}
                    onChange={() => setIsPaid(false)}
                    className="form-radio text-blue-600 dark:bg-gray-700"
                  />
                  <span className="ml-2">Investido</span>
                </label>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                {isPaid
                  ? "Esse tempo não será adicionado aos investimentos."
                  : "Esse tempo será registrado como investimento ao finalizar."}
              </p>
            </div>

            {/* Botões de Ação */}
            <div className="flex justify-center mt-6">
              {timerState === 'idle' ? (
                <button onClick={handleStart} className="btn-primary flex items-center gap-2 px-6 py-2">
                  <Play size={20} /> Iniciar Sessão
                </button>
              ) : (
                <button onClick={handleStop} className="btn bg-red-600 hover:bg-red-700 text-white px-6 py-2 flex items-center gap-2">
                  <StopCircle size={20} /> Parar Sessão
                </button>
              )}
            </div>
          </section>

          {/* Instruções */}
          <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">Como usar</h2>
            <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
              <li className="flex items-start gap-2"><Clock size={16} /> Digite o valor/hora.</li>
              <li className="flex items-start gap-2"><Play size={16} /> Clique em "Iniciar" para começar.</li>
              <li className="flex items-start gap-2"><StopCircle size={16} /> Clique em "Parar" para finalizar.</li>
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
};

export default TimeTracker;
