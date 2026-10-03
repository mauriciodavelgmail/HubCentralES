'use client';

import React, { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge, Button, LoadingSpinner, EmptyState, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui';
import { ProtectedRoute } from '@/lib/auth/protected-route';
import { useAuth } from '@/lib/auth/context';
import { getEvents, createEvent, updateEvent, deleteEvent, Event, getEventsByStatus } from '@/lib/supabase/events';
import { Search, Plus, Trash2, Edit, AlertCircle, CheckCircle, Clock, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase/auth';

const EVENT_TYPES = ['reuniao', 'workshop', 'palestra', 'encontro', 'outros'];
const STATUSES = ['aguardando_aprovacao', 'confirmada', 'realizada', 'cancelada'];

export default function AgendaPage() {
  const { user, profile } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [spaces, setSpaces] = useState<Array<{ id: string; name: string }>>([]);
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSpace, setFilterSpace] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'reuniao',
    status: 'aguardando_aprovacao',
    space_id: '',
    start_date: '',
    start_time: '',
    end_time: '',
    capacity: '',
  });

  // Load events
  useEffect(() => {
    loadEvents();
    supabase.from('spaces').select('id, name').eq('status', 'disponivel').order('name')
      .then(({ data }) => setSpaces(data || []));
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const data = await getEvents();
      setEvents(data);
      setError('');
    } catch (err: any) {
      setError('Erro ao carregar eventos: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (event?: Event) => {
    if (event) {
      setEditingId(event.id);
      setFormData({
        title: event.title,
        description: event.description || '',
        event_type: event.event_type,
        status: event.status,
        space_id: event.space_id || '',
        start_date: event.start_date ? event.start_date.split('T')[0] : '',
        start_time: event.start_time?.substring(0, 5) || '',
        end_time: event.end_time?.substring(0, 5) || '',
        capacity: event.capacity?.toString() || '',
      });
    } else {
      setEditingId(null);
      setFormData({
        title: '',
        description: '',
        event_type: 'reuniao',
        status: 'aguardando_aprovacao',
        space_id: '',
        start_date: '',
        start_time: '',
        end_time: '',
        capacity: '',
      });
    }
    setShowDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let submitData: Partial<Event> = {
        ...formData,
        start_date: formData.start_date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
        status: formData.status as Event['status'],
        requester_id: profile?.id,
        created_by: user?.id,
      };

      if (editingId) {
        await updateEvent(editingId, submitData);
      } else {
        await createEvent(submitData as any);
      }
      await loadEvents();
      setShowDialog(false);
      setError('');
    } catch (err: any) {
      setError('Erro ao salvar evento: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este evento?')) return;
    try {
      await deleteEvent(id);
      await loadEvents();
      setError('');
    } catch (err: any) {
      setError('Erro ao deletar evento: ' + err.message);
    }
  };

  const filteredEvents = events.filter(evt => {
    const matchesSearch = evt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !filterStatus || evt.status === filterStatus;
    const matchesSpace = !filterSpace || evt.space_id === filterSpace;
    return matchesSearch && matchesStatus && matchesSpace;
  });

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingDays = new Date(year, month, 1).getDay();
  const calendarDays = Array.from({ length: leadingDays + daysInMonth }, (_, index) =>
    index < leadingDays ? null : index - leadingDays + 1
  );
  const dateKey = (day: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const eventsForDate = (date: string) => events.filter((event) => event.start_date?.split('T')[0] === date && event.status !== 'cancelada');
  const openDate = (date: string) => {
    handleOpenDialog();
    setFormData((current) => ({ ...current, start_date: date, status: 'aguardando_aprovacao' }));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'concluido':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'em_andamento':
        return <Clock size={16} className="text-blue-600" />;
      case 'confirmado':
        return <CheckCircle size={16} className="text-blue-600" />;
      default:
        return <Clock size={16} className="text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'concluido':
        return 'success';
      case 'em_andamento':
        return 'info';
      case 'confirmado':
        return 'info';
      case 'cancelado':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  return (
    <ProtectedRoute>
      <MainLayout
        userName={profile?.full_name || 'Usuário'}
        userRole={profile?.role || 'visitante'}
        title="Agenda de Eventos"
        subtitle="Gerencie todos os eventos e espaços"
      >
        <div className="space-y-6">
          {/* Header */}
          {profile?.role !== 'visitante' && <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex gap-2 flex-1">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Pesquisar por título ou descrição..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos Status</option>
                {STATUSES.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              <select
                value={filterSpace}
                onChange={(e) => setFilterSpace(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos Espaços</option>
                {spaces.map(space => (
                  <option key={space.id} value={space.id}>{space.name}</option>
                ))}
              </select>
            </div>
            <Button
              onClick={() => handleOpenDialog()}
              className="bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus size={20} />
              Novo Evento
            </Button>
          </div>}

          {/* Error */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-2">
              <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Visitor calendar / administrative event list */}
          {profile?.role === 'visitante' ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}><ChevronLeft size={20} /></Button>
                <CardTitle className="capitalize">{currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}><ChevronRight size={20} /></Button>
              </CardHeader>
              <CardContent>
                {loading ? <div className="flex justify-center py-12"><LoadingSpinner /></div> : <>
                  <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-semibold text-gray-500">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((name) => <div key={name}>{name}</div>)}
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {calendarDays.map((day, index) => {
                      if (!day) return <div key={`empty-${index}`} />;
                      const date = dateKey(day);
                      const dayEvents = eventsForDate(date);
                      const isPast = date < new Date().toLocaleDateString('en-CA');
                      const unavailable = isPast || dayEvents.length > 0;
                      return <button key={date} type="button" disabled={unavailable} onClick={() => openDate(date)}
                        className={`min-h-28 rounded-lg border p-2 text-left transition ${unavailable ? 'bg-red-50 border-red-200 cursor-not-allowed' : 'bg-green-50 border-green-200 hover:bg-green-100'}`}>
                        <span className="font-bold text-gray-800">{day}</span>
                        <p className={`text-xs mt-1 font-medium ${unavailable ? 'text-red-700' : 'text-green-700'}`}>{isPast ? 'Indisponível' : unavailable ? 'Indisponível' : 'Disponível'}</p>
                        {dayEvents.map((event) => <div key={event.id} className="mt-1 text-xs text-red-800">
                          <p className="font-semibold truncate">{event.title}</p><p>{event.start_time?.substring(0, 5)}–{event.end_time?.substring(0, 5)}</p>
                        </div>)}
                      </button>;
                    })}
                  </div>
                </>}
              </CardContent>
            </Card>
          ) : loading ? (
            <div className="flex items-center justify-center min-h-96">
              <LoadingSpinner size="lg" />
            </div>
          ) : filteredEvents.length === 0 ? (
            <EmptyState
              title="Nenhum evento encontrado"
              description="Comece criando seu primeiro evento"
              action={<Button onClick={() => handleOpenDialog()} className="bg-blue-600 text-white">Criar Evento</Button>}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>{filteredEvents.length} Evento(s)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Título</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Tipo</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Espaço</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Data Início</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEvents.map(evt => (
                        <tr key={evt.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-gray-900">{evt.title}</p>
                              <p className="text-xs text-gray-500">{evt.description?.substring(0, 50)}...</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="info">{evt.event_type}</Badge>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {evt.space_id || '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {evt.start_date ? new Date(evt.start_date).toLocaleDateString('pt-BR') : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(evt.status)}
                              <Badge variant={getStatusColor(evt.status) as any}>{evt.status}</Badge>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenDialog(evt)}
                                className="text-gray-600 hover:bg-gray-100"
                              >
                                <Edit size={16} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(evt.id)}
                                className="text-red-600 hover:bg-red-50"
                              >
                                <Trash2 size={16} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Create/Edit Dialog */}
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogContent className="max-w-2xl max-h-screen overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Editar Evento' : 'Novo Evento'}</DialogTitle>
                <DialogDescription>
                  {editingId ? 'Atualize os dados do evento' : 'Preencha os dados do novo evento'}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Type, Status, Space */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                    <select
                      value={formData.event_type}
                      onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {EVENT_TYPES.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  {profile?.role !== 'visitante' && <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                    <select
                      required
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {STATUSES.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Espaço</label>
                    <select
                      required
                      value={formData.space_id}
                      onChange={(e) => setFormData({ ...formData, space_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Selecionar...</option>
                      {spaces.map(space => (
                        <option key={space.id} value={space.id}>{space.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Dates */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data Início</label>
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <input
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* End time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Horário de término</label>
                    <input
                      type="time"
                      required
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                {/* Capacity */}
                <div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Capacidade</label>
                    <input
                      type="number"
                      value={formData.capacity}
                      onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700">
                    {(editingId ? 'Atualizar' : 'Criar')} Evento
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
