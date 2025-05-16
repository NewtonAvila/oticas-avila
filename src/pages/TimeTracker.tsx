import React, { useState, useEffect } from 'react';
import { Play, StopCircle, Clock, DollarSign, Pause, Edit, Trash } from 'lucide-react';
import Header from '../components/Header';
import { useData } from '../contexts/DataContext';
import { formatCurrency } from '../utils/format';

const TimeTracker: React.FC = () => {
  const [hourlyRate, setHourlyRate] = useState<string>('25');
  const [timerState, setTimerState] = useState<'idle' | 'running' | 'paused'>('idle');
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [pauseStart, setPauseStart] = useState<Date | null>(null);
  const [pausedTime, setPausedTime] = useState<number>(0);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [isPaid, setIsPaid] = useState<boolean>(true);
  const [estimatedEarnings, setEstimatedEarnings] = useState<number>(0);
  const [editSessionRow, setEditSessionRow] = useState<{ id: string; startTime: string; endTime: string | null; rate: string; isPaid: boolean } | null>(null);
  const [timeError, setTimeError] = useState<string>('');
  const [showNewSessionForm, setShowNewSessionForm] = useState<boolean>(false);
  const [newSessionRate, setNewSessionRate] = useState<string>('25');
  const [newSessionIsPaid, setNewSessionIsPaid] = useState<boolean>(true);

  const { 
    startTimeSession, 
    stopTimeSession, 
    getCurrentTimeSession, 
    timeSessions,
    updateTimeSession,
    deleteTimeSession
  } = useData();

  useEffect(() => {
    const currentSession = getCurrentTimeSession();
    if (currentSession) {
      setCurrentSessionId(currentSession.id);
      setHourlyRate(currentSession.hourlyRate.toString());
      setTimerState('running');
      setIsPaid(currentSession.isPaid);
      setStartTime(currentSession.startTime ? new Date(currentSession.startTime) : null);
      setPausedTime(currentSession.pausedTime || 0);

      const elapsed = Math.floor((Date.now() - new Date(currentSession.startTime).getTime() - (currentSession.pausedTime || 0) * 1000) / 1000);
      setElapsedTime(elapsed);
    }
  }, [getCurrentTimeSession]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (timerState === 'running' && startTime) {
      interval = setInterval(() => {
        const now = new Date();
        const baseTime = startTime.getTime() + pausedTime * 1000; // Convert pausedTime to milliseconds
        const newElapsed = Math.floor((now.getTime() - baseTime) / 1000);
        setElapsedTime(newElapsed);

        const hours = newElapsed / 3600; // Convert seconds to hours
        const rate = parseFloat(hourlyRate) || 0;
        const earnings = hours * rate;
        setEstimatedEarnings(earnings);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerState, startTime, pausedTime, hourlyRate]);

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

  const getTimePart = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toTimeString().slice(0, 5);
  };

  const handleStart = () => {
    const rate = parseFloat(newSessionRate) || 0;
    if (rate <= 0) {
      alert('Por favor, insira um valor válido para o valor/hora.');
      return;
    }

    const sessionId = startTimeSession(rate, newSessionIsPaid);
    console.log('Sessão iniciada com ID:', sessionId, 'isPaid:', newSessionIsPaid);

    setCurrentSessionId(sessionId);
    setStartTime(new Date());
    setTimerState('running');
    setElapsedTime(0);
    setPausedTime(0);
    setHourlyRate(newSessionRate);
    setIsPaid(newSessionIsPaid);
    setShowNewSessionForm(false);
  };

  const handlePause = () => {
    if (timerState === 'running' && startTime) {
      setPauseStart(new Date());
      setTimerState('paused');
    }
  };

  const handleResume = () => {
    if (timerState === 'paused' && pauseStart && startTime) {
      const pauseDuration = Math.floor((new Date().getTime() - pauseStart.getTime()) / 1000);
      setPausedTime(prev => prev + pauseDuration);
      setPauseStart(null);
      setTimerState('running');
    }
  };

  const handleStop = () => {
    if (currentSessionId) {
      stopTimeSession(currentSessionId, isPaid);
      setTimerState('idle');
      setElapsedTime(0);
      setCurrentSessionId('');
      setStartTime(null);
      setPauseStart(null);
      setPausedTime(0);
      setEstimatedEarnings(0);
    }
  };

  const handleEditRow = (id: string, startTime: string, endTime: string | null, rate: string, isPaid: boolean) => {
    setEditSessionRow({ id, startTime, endTime, rate, isPaid });
    setTimeError('');
  };

  const validateTimes = (startTime: string, endTime: string | null): boolean => {
    const startDate = new Date(startTime);
    if (isNaN(startDate.getTime())) return false;

    if (!endTime) return true;

    const endDate = new Date(endTime);
    if (isNaN(endDate.getTime())) return false;

    if (endDate <= startDate) {
      setTimeError('A hora de término deve ser posterior à hora de início.');
      return false;
    }

    setTimeError('');
    return true;
  };

  const handleSaveRow = () => {
    if (editSessionRow) {
      const startDate = new Date(editSessionRow.startTime);
      if (isNaN(startDate.getTime())) {
        alert('Data ou hora de início inválida. Por favor, corrija os valores.');
        return;
      }

      let endDate: Date | null = null;
      if (editSessionRow.endTime) {
        endDate = new Date(editSessionRow.endTime);
        if (isNaN(endDate.getTime())) {
          alert('Hora de término inválida. Por favor, corrija o valor.');
          return;
        }
      }

      if (endDate && endDate <= startDate) {
        alert('A hora de término deve ser posterior à hora de início.');
        return;
      }

      updateTimeSession(editSessionRow.id, {
        startTime: startDate.toISOString(),
        endTime: endDate ? endDate.toISOString() : null,
        hourlyRate: parseFloat(editSessionRow.rate),
        isPaid: editSessionRow.isPaid,
        pausedTime: 0,
      });
      setEditSessionRow(null);
      setTimeError('');
    }
  };

  const handleCancelRow = () => {
    setEditSessionRow(null);
    setTimeError('');
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta sessão?')) {
      deleteTimeSession(id);
    }
  };

  const sortedSessions = [...timeSessions].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white flex flex-col">
      <Header title="Controle de Horas" showBackButton />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-10 max-w-4xl space-y-10">
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
            <div className="flex justify-center mt-6 gap-4">
              {timerState === 'idle' ? (
                <button onClick={() => setShowNewSessionForm(true)} className="btn-primary flex items-center gap-2 px-6 py-2">
                  <Play size={20} /> Nova Sessão de Trabalho
                </button>
              ) : timerState === 'running' ? (
                <>
                  <button onClick={handlePause} className="btn bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2 flex items-center gap-2">
                    <Pause size={20} /> Pausar
                  </button>
                  <button onClick={handleStop} className="btn bg-red-600 hover:bg-red-700 text-white px-6 py-2 flex items-center gap-2">
                    <StopCircle size={20} /> Parar
                  </button>
                </>
              ) : (
                <button onClick={handleResume} className="btn-primary flex items-center gap-2 px-6 py-2">
                  <Play size={20} /> Retomar
                </button>
              )}
            </div>
          </section>

          {showNewSessionForm && (
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 space-y-6">
              <h2 className="text-xl font-semibold mb-4">Nova Sessão de Trabalho</h2>
              <div>
                <label htmlFor="newSessionRate" className="label">Valor da Hora (R$)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                    <DollarSign size={18} />
                  </span>
                  <input
                    id="newSessionRate"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={newSessionRate}
                    onChange={(e) => setNewSessionRate(e.target.value)}
                    className="input-field pl-10"
                    placeholder="25,00"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="label">Tipo de Tempo</label>
                <div className="flex gap-6">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="newSessionType"
                      checked={newSessionIsPaid}
                      onChange={() => setNewSessionIsPaid(true)}
                      className="form-radio text-blue-600 dark:bg-gray-700"
                    />
                    <span className="ml-2">Pago</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="newSessionType"
                      checked={!newSessionIsPaid}
                      onChange={() => setNewSessionIsPaid(false)}
                      className="form-radio text-blue-600 dark:bg-gray-700"
                    />
                    <span className="ml-2">Investido</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-4">
                <button onClick={handleStart} className="btn-primary px-6 py-2">
                  Iniciar Sessão
                </button>
                <button onClick={() => setShowNewSessionForm(false)} className="btn-outline px-2 py-1">
                  Cancelar
                </button>
              </div>
            </section>
          )}

          {timerState === 'idle' && !showNewSessionForm && (
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 space-y-6 opacity-50 pointer-events-none">
              <h2 className="text-xl font-semibold mb-4">Configurações da Sessão</h2>
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
                    disabled
                    required
                  />
                </div>
              </div>
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
                      disabled
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
                      disabled
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
            </section>
          )}

          <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Histórico de Sessões</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-200 dark:bg-gray-700">
                    <th className="p-2">Data</th>
                    <th className="p-2">Hora de Início</th>
                    <th className="p-2">Hora de Término</th>
                    <th className="p-2">Valor/Hora (R$)</th>
                    <th className="p-2">Tipo</th>
                    <th className="p-2">Total (R$)</th>
                    <th className="p-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSessions.map((session) => {
                    const start = new Date(session.startTime);
                    const end = session.endTime ? new Date(session.endTime) : null;
                    const duration = end ? Math.floor((end.getTime() - start.getTime() - (session.pausedTime || 0) * 1000) / 1000) : 0;
                    const hours = duration / 3600;
                    const total = hours * session.hourlyRate;
                    const isEditing = editSessionRow?.id === session.id;

                    return (
                      <tr key={session.id} className="border-t dark:border-gray-600">
                        <td className="p-2">
                          {isEditing && editSessionRow ? (
                            <input
                              type="date"
                              value={editSessionRow.startTime.split('T')[0]}
                              onChange={(e) => {
                                const newDate = new Date(e.target.value);
                                const currentTime = new Date(editSessionRow.startTime);
                                newDate.setHours(currentTime.getHours(), currentTime.getMinutes());
                                const newStartTime = newDate.toISOString();
                                let newEndTime = editSessionRow.endTime;
                                if (editSessionRow.endTime) {
                                  const endDate = new Date(editSessionRow.endTime);
                                  endDate.setFullYear(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());
                                  newEndTime = endDate.toISOString();
                                }
                                setEditSessionRow({ ...editSessionRow, startTime: newStartTime, endTime: newEndTime });
                                if (newEndTime) {
                                  validateTimes(newStartTime, newEndTime);
                                }
                              }}
                              className="input-field w-32"
                            />
                          ) : (
                            start.toLocaleDateString('pt-BR')
                          )}
                        </td>
                        <td className="p-2">
                          {isEditing && editSessionRow ? (
                            <input
                              type="time"
                              value={getTimePart(editSessionRow.startTime)}
                              onChange={(e) => {
                                const [hours, minutes] = e.target.value.split(':').map(Number);
                                const newStartTime = new Date(editSessionRow.startTime);
                                newStartTime.setHours(hours, minutes, 0, 0);
                                const newStartTimeISO = newStartTime.toISOString();
                                setEditSessionRow({ ...editSessionRow, startTime: newStartTimeISO });
                                if (editSessionRow.endTime) {
                                  validateTimes(newStartTimeISO, editSessionRow.endTime);
                                }
                              }}
                              className="input-field w-24"
                            />
                          ) : (
                            getTimePart(session.startTime)
                          )}
                        </td>
                        <td className="p-2">
                          {isEditing && editSessionRow ? (
                            <div>
                              <input
                                type="time"
                                value={editSessionRow.endTime ? getTimePart(editSessionRow.endTime) : ''}
                                onChange={(e) => {
                                  if (!e.target.value) {
                                    setEditSessionRow({ ...editSessionRow, endTime: null });
                                    setTimeError('');
                                    return;
                                  }
                                  const [hours, minutes] = e.target.value.split(':').map(Number);
                                  const newEndTime = new Date(editSessionRow.startTime);
                                  newEndTime.setHours(hours, minutes, 0, 0);
                                  const newEndTimeISO = newEndTime.toISOString();
                                  setEditSessionRow({ ...editSessionRow, endTime: newEndTimeISO });
                                  validateTimes(editSessionRow.startTime, newEndTimeISO);
                                }}
                                className="input-field w-24"
                              />
                              {timeError && (
                                <p className="text-red-500 text-xs mt-1">{timeError}</p>
                              )}
                            </div>
                          ) : (
                            end ? getTimePart(session.endTime!) : '-'
                          )}
                        </td>
                        <td className="p-2">
                          {isEditing && editSessionRow ? (
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={editSessionRow.rate}
                              onChange={(e) => setEditSessionRow({ ...editSessionRow, rate: e.target.value })}
                              className="input-field w-24"
                            />
                          ) : (
                            session.hourlyRate.toFixed(2)
                          )}
                        </td>
                        <td className="p-2">
                          {isEditing && editSessionRow ? (
                            <div className="flex flex-col gap-2">
                              <label className="inline-flex items-center">
                                <input
                                  type="radio"
                                  name={`type-${session.id}`}
                                  checked={editSessionRow.isPaid}
                                  onChange={() => setEditSessionRow({ ...editSessionRow, isPaid: true })}
                                  className="form-radio text-blue-600 dark:bg-gray-700"
                                />
                                <span className="ml-2">Pago</span>
                              </label>
                              <label className="inline-flex items-center">
                                <input
                                  type="radio"
                                  name={`type-${session.id}`}
                                  checked={!editSessionRow.isPaid}
                                  onChange={() => setEditSessionRow({ ...editSessionRow, isPaid: false })}
                                  className="form-radio text-blue-600 dark:bg-gray-700"
                                />
                                <span className="ml-2">Investido</span>
                              </label>
                            </div>
                          ) : (
                            session.isPaid ? 'Pago' : 'Investido'
                          )}
                        </td>
                        <td className="p-2">{formatCurrency(total)}</td>
                        <td className="p-2 flex gap-2">
                          {isEditing ? (
                            <>
                              <button onClick={handleSaveRow} className="btn-primary px-2 py-1 text-sm">
                                Salvar
                              </button>
                              <button onClick={handleCancelRow} className="btn-outline px-2 py-1 text-sm">
                                Cancelar
                              </button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => handleEditRow(session.id, session.startTime, session.endTime, session.hourlyRate.toString(), session.isPaid)} className="text-blue-600 hover:text-blue-800">
                                <Edit size={16} />
                              </button>
                              <button onClick={() => handleDelete(session.id)} className="text-red-600 hover:text-red-800">
                                <Trash size={16} />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">Como usar</h2>
            <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
              <li className="flex items-start gap-2"><Clock size={16} /> Defina o valor/hora e o tipo de tempo na nova sessão.</li>
              <li className="flex items-start gap-2"><Play size={16} /> Clique em "Nova Sessão de Trabalho" para começar.</li>
              <li className="flex items-start gap-2"><Pause size={16} /> Clique em "Pausar" para pausar.</li>
              <li className="flex items-start gap-2"><StopCircle size={16} /> Clique em "Parar" para finalizar.</li>
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
};

export default TimeTracker;