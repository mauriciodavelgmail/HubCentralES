'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Edit, Image as ImageIcon, Plus, Search, Table2, Trash2, X } from 'lucide-react';
import { MainLayout } from '@/components/layout';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, EmptyState, LoadingSpinner } from '@/components/ui';
import { ProtectedRoute } from '@/lib/auth/protected-route';
import { useAuth } from '@/lib/auth/context';
import { createEvent, deleteEvent, Event, getEvents, updateEvent } from '@/lib/supabase/events';
import { supabase } from '@/lib/supabase/auth';
import { deleteFile, uploadImage } from '@/lib/supabase/storage';

type ViewMode = 'table' | 'calendar';
type SortKey = 'title' | 'event_type' | 'space' | 'start_date' | 'start_time' | 'status';
type SortDirection = 'asc' | 'desc';

interface AgendaEvent extends Event {
  spaces?: { name: string } | null;
  thumbnail_url?: string | null;
  thumbnail_path?: string | null;
  audience_access?: 'publico_fechado' | 'aberto_publico' | null;
  activity_sector?: 'sociedade_civil' | 'governo' | null;
  facilitator_name?: string | null;
  facilitator_minibio?: string | null;
  facilitator_cnpj?: string | null;
  facilitator_cpf?: string | null;
  facilitator_phone?: string | null;
  facilitator_social?: string | null;
  facilitator_photo_url?: string | null;
  facilitator_photo_path?: string | null;
  organizer_name?: string | null;
  organizer_contact?: string | null;
  interpreter_needed?: boolean;
  equipments?: string[];
  materials_needed?: boolean;
  catering_needed?: boolean;
  furniture_change_needed?: boolean;
}

interface CalendarEvent { id: string; title: string; status: string; start_date: string; start_time: string; end_time: string; }

const EVENT_TYPES = [
  ['reuniao', 'Reunião'], ['workshop', 'Workshop'], ['palestra', 'Palestra'], ['encontro', 'Encontro'], ['outros', 'Outros'],
] as const;
const EQUIPMENT_OPTIONS = ['Projetor', 'Notebook', 'Cabo HDMI', 'TV', 'Passador de Slides', 'Microfone', 'Caixa de Som', 'Sem equipamentos'];
const STATUS_LABELS: Record<string, string> = { aguardando_aprovacao: 'Aguardando aprovação', confirmada: 'Confirmada', realizada: 'Realizada', cancelada: 'Reprovada/Cancelada' };
const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500';

const EMPTY_FORM = {
  title: '', description: '', event_type: 'reuniao', space_id: '', start_date: '', start_time: '', end_time: '', capacity: '',
  audience_access: 'publico_fechado', activity_sector: 'sociedade_civil', facilitator_name: '', facilitator_minibio: '', facilitator_cnpj: '', facilitator_cpf: '', facilitator_phone: '', facilitator_social: '', organizer_name: '', organizer_contact: '', interpreter_needed: 'nao', equipments: [] as string[], materials_needed: 'nao', catering_needed: 'nao', furniture_change_needed: 'nao',
};

function onlyDigits(value: string) { return value.replace(/\D/g, ''); }
function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    const parts = [record.message, record.details, record.hint, record.code ? `Código: ${record.code}` : null]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
    if (parts.length) return [...new Set(parts)].join(' — ');
    try { return JSON.stringify(error); } catch { return 'Falha sem detalhes retornados pelo servidor.'; }
  }
  return 'Falha sem detalhes retornados pelo servidor.';
}

function validateImage(file: File | null, label: string) {
  if (!file) return '';
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) return `${label}: use uma imagem JPG, PNG, WEBP ou GIF.`;
  if (file.size > 10 * 1024 * 1024) return `${label}: o arquivo deve ter no máximo 10 MB.`;
  return '';
}
function validCpf(value: string) {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  const digit = (length: number) => { let sum = 0; for (let index = 0; index < length; index += 1) sum += Number(cpf[index]) * (length + 1 - index); const result = (sum * 10) % 11; return result === 10 ? 0 : result; };
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}
function validCnpj(value: string) {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
  const calculate = (base: string, weights: number[]) => { const sum = base.split('').reduce((total, number, index) => total + Number(number) * weights[index], 0); const remainder = sum % 11; return remainder < 2 ? 0 : 11 - remainder; };
  const first = calculate(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = calculate(cnpj.slice(0, 12) + first, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return cnpj.endsWith(`${first}${second}`);
}

export default function AgendaPage() {
  const { user, profile } = useAuth();
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [spaces, setSpaces] = useState<Array<{ id: string; name: string }>>([]);
  const [view, setView] = useState<ViewMode>('table');
  const [calendarSpace, setCalendarSpace] = useState('');
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<AgendaEvent | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'start_date', direction: 'desc' });
  const [form, setForm] = useState(EMPTY_FORM);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [facilitatorPhoto, setFacilitatorPhoto] = useState<File | null>(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try { setEvents((await getEvents()) as AgendaEvent[]); setError(''); }
    catch (loadError) { setError(`Erro ao carregar eventos: ${loadError instanceof Error ? loadError.message : 'erro desconhecido'}`); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    void loadEvents();
    void supabase.from('spaces').select('id,name').eq('status', 'disponivel').order('name').then(({ data }) => {
      setSpaces(data ?? []);
      setCalendarSpace((current) => current || data?.[0]?.id || '');
    });
  }, [loadEvents]);

  useEffect(() => {
    if (view !== 'calendar' || !calendarSpace) return;
    const monthStart = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-01`;
    const monthEnd = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;
    setCalendarLoading(true);
    void supabase.rpc('get_event_calendar', { p_space_id: calendarSpace, p_month_start: monthStart, p_month_end: monthEnd })
      .then(({ data, error: calendarError }) => { if (calendarError) setError(calendarError.message); else setCalendarEvents((data ?? []) as CalendarEvent[]); setCalendarLoading(false); });
  }, [calendarSpace, currentMonth, view]);

  const visibleEvents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return events.filter((event) => (!query || `${event.title} ${event.description ?? ''} ${event.spaces?.name ?? ''}`.toLowerCase().includes(query)) && (!filterStatus || event.status === filterStatus)).sort((first, second) => {
      const values: Record<SortKey, [string, string]> = {
        title: [first.title, second.title], event_type: [first.event_type, second.event_type], space: [first.spaces?.name ?? '', second.spaces?.name ?? ''], start_date: [first.start_date, second.start_date], start_time: [first.start_time, second.start_time], status: [first.status, second.status],
      };
      const result = values[sort.key][0].localeCompare(values[sort.key][1], 'pt-BR', { numeric: true });
      return sort.direction === 'asc' ? result : -result;
    });
  }, [events, filterStatus, search, sort]);

  const changeSort = (key: SortKey) => setSort((current) => ({ key, direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc' }));
  const SortHeader = ({ field, children }: { field: SortKey; children: React.ReactNode }) => <button type="button" onClick={() => changeSort(field)} className="flex items-center gap-1 font-semibold text-gray-700">{children}{sort.key === field && (sort.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}</button>;

  const openForm = (event?: AgendaEvent, selectedDate?: string) => {
    setEditing(event ?? null); setThumbnail(null); setFacilitatorPhoto(null); setError(''); setNotice('');
    setForm(event ? {
      title: event.title, description: event.description ?? '', event_type: event.event_type, space_id: event.space_id, start_date: event.start_date, start_time: event.start_time.slice(0, 5), end_time: event.end_time.slice(0, 5), capacity: event.capacity?.toString() ?? '', audience_access: event.audience_access ?? 'publico_fechado', activity_sector: event.activity_sector ?? 'sociedade_civil', facilitator_name: event.facilitator_name ?? '', facilitator_minibio: event.facilitator_minibio ?? '', facilitator_cnpj: event.facilitator_cnpj ?? '', facilitator_cpf: event.facilitator_cpf ?? '', facilitator_phone: event.facilitator_phone ?? '', facilitator_social: event.facilitator_social ?? '', organizer_name: event.organizer_name ?? '', organizer_contact: event.organizer_contact ?? '', interpreter_needed: event.interpreter_needed ? 'sim' : 'nao', equipments: event.equipments ?? [], materials_needed: event.materials_needed ? 'sim' : 'nao', catering_needed: event.catering_needed ? 'sim' : 'nao', furniture_change_needed: event.furniture_change_needed ? 'sim' : 'nao',
    } : { ...EMPTY_FORM, start_date: selectedDate ?? '', space_id: calendarSpace });
    setShowDialog(true);
  };

  const notifyByEmail = async (eventId: string, action: string) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    const response = await fetch('/api/events/notify', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify({ eventId, action }) });
    if (!response.ok) { const payload = await response.json().catch(() => ({})); setNotice(`Evento salvo. Aviso de e-mail: ${payload.error ?? 'não enviado'}`); }
  };

  const validateForm = () => {
    if (!form.title.trim() || !form.space_id || !form.start_date || !form.start_time || !form.end_time) return 'Preencha título, ambiente, data e horários.';
    if (form.start_time >= form.end_time) return 'O horário final deve ser posterior ao inicial.';
    if (!form.facilitator_name.trim() || !form.facilitator_minibio.trim() || !validCpf(form.facilitator_cpf) || !form.facilitator_phone.trim() || !form.facilitator_social.trim()) return 'Preencha os dados obrigatórios da pessoa facilitadora e informe um CPF válido.';
    if (form.facilitator_cnpj && !validCnpj(form.facilitator_cnpj)) return 'Informe um CNPJ válido ou deixe o campo vazio.';
    if (!form.organizer_name.trim() || !form.organizer_contact.trim()) return 'Informe o nome e contato do organizador responsável.';
    if (!editing?.thumbnail_url && !thumbnail) return 'Anexe a Imagem do Evento (Thumbnail).';
    if (!editing?.facilitator_photo_url && !facilitatorPhoto) return 'Anexe a foto da pessoa facilitadora.';
    const thumbnailError = validateImage(thumbnail, 'Imagem do Evento');
    if (thumbnailError) return thumbnailError;
    const photoError = validateImage(facilitatorPhoto, 'Foto da pessoa facilitadora');
    if (photoError) return photoError;
    return '';
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validation = validateForm(); if (validation) { setError(validation); return; }
    setSaving(true); setError(''); setNotice('');
    let uploadedThumbnailPath: string | null = null;
    let uploadedPhotoPath: string | null = null;
    try {
      let thumbnailUpload = null;
      let photoUpload = null;
      if (thumbnail) {
        try { thumbnailUpload = await uploadImage(thumbnail, 'events/thumbnails'); uploadedThumbnailPath = thumbnailUpload.path; }
        catch (uploadError) { throw new Error(`Falha no upload da Imagem do Evento: ${errorMessage(uploadError)}`); }
      }
      if (facilitatorPhoto) {
        try { photoUpload = await uploadImage(facilitatorPhoto, 'events/facilitators'); uploadedPhotoPath = photoUpload.path; }
        catch (uploadError) { throw new Error(`Falha no upload da foto da pessoa facilitadora: ${errorMessage(uploadError)}`); }
      }
      const payload = {
        title: form.title.trim(), description: form.description.trim(), event_type: form.event_type, space_id: form.space_id, start_date: form.start_date, start_time: form.start_time, end_time: form.end_time, capacity: form.capacity ? Number(form.capacity) : null,
        audience_access: form.audience_access, activity_sector: form.activity_sector, facilitator_name: form.facilitator_name.trim(), facilitator_minibio: form.facilitator_minibio.trim(), facilitator_cnpj: onlyDigits(form.facilitator_cnpj) || null, facilitator_cpf: onlyDigits(form.facilitator_cpf), facilitator_phone: form.facilitator_phone.trim(), facilitator_social: form.facilitator_social.trim(), organizer_name: form.organizer_name.trim(), organizer_contact: form.organizer_contact.trim(), interpreter_needed: form.interpreter_needed === 'sim', equipments: form.equipments, materials_needed: form.materials_needed === 'sim', catering_needed: form.catering_needed === 'sim', furniture_change_needed: form.furniture_change_needed === 'sim',
        thumbnail_url: thumbnailUpload?.url ?? editing?.thumbnail_url ?? null, thumbnail_path: thumbnailUpload?.path ?? editing?.thumbnail_path ?? null, facilitator_photo_url: photoUpload?.url ?? editing?.facilitator_photo_url ?? null, facilitator_photo_path: photoUpload?.path ?? editing?.facilitator_photo_path ?? null,
        requester_id: editing?.requester_id ?? profile?.id, responsible_id: editing?.responsible_id ?? profile?.id, created_by: editing?.created_by ?? user?.id,
      };
      let saved: AgendaEvent;
      try {
        if (editing) saved = await updateEvent(editing.id, payload as Partial<Event>) as AgendaEvent;
        else saved = await createEvent({
          ...payload,
          status: profile?.role === 'administrador' ? 'confirmada' : 'aguardando_aprovacao',
          approved_by: profile?.role === 'administrador' ? profile.id : null,
          approved_at: profile?.role === 'administrador' ? new Date().toISOString() : null,
        } as never) as AgendaEvent;
      } catch (databaseError) {
        throw new Error(`Falha ao gravar o evento no banco: ${errorMessage(databaseError)}`);
      }
      setShowDialog(false); await loadEvents(); await notifyByEmail(saved.id, editing ? 'updated' : 'created');
    } catch (saveError) {
      console.error('Erro ao salvar evento:', saveError);
      if (uploadedThumbnailPath) await deleteFile('images', uploadedThumbnailPath).catch((cleanupError) => console.error('Falha ao remover thumbnail órfã:', cleanupError));
      if (uploadedPhotoPath) await deleteFile('images', uploadedPhotoPath).catch((cleanupError) => console.error('Falha ao remover foto órfã:', cleanupError));
      setError(`Erro ao salvar evento: ${errorMessage(saveError)}`);
    }
    finally { setSaving(false); }
  };

  const changeStatus = async (event: AgendaEvent, status: Event['status']) => {
    try { const saved = await updateEvent(event.id, { status, approved_by: status === 'confirmada' ? profile?.id : event.approved_by, approved_at: status === 'confirmada' ? new Date().toISOString() : event.approved_at }); await loadEvents(); await notifyByEmail(saved.id, `status-${status}`); }
    catch (statusError) { setError(`Erro ao alterar status: ${statusError instanceof Error ? statusError.message : 'erro desconhecido'}`); }
  };

  const remove = async (event: AgendaEvent) => {
    if (!window.confirm(`Excluir definitivamente o evento “${event.title}”?`)) return;
    try { await deleteEvent(event.id); await loadEvents(); }
    catch (deleteError) { setError(`Erro ao excluir evento: ${deleteError instanceof Error ? deleteError.message : 'erro desconhecido'}`); }
  };

  const toggleEquipment = (equipment: string) => setForm((current) => {
    if (equipment === 'Sem equipamentos') return { ...current, equipments: current.equipments.includes(equipment) ? [] : [equipment] };
    const withoutNone = current.equipments.filter((item) => item !== 'Sem equipamentos');
    return { ...current, equipments: withoutNone.includes(equipment) ? withoutNone.filter((item) => item !== equipment) : [...withoutNone, equipment] };
  });

  const year = currentMonth.getFullYear(); const month = currentMonth.getMonth(); const daysInMonth = new Date(year, month + 1, 0).getDate(); const leadingDays = new Date(year, month, 1).getDay();
  const calendarDays = Array.from({ length: leadingDays + daysInMonth }, (_, index) => index < leadingDays ? null : index - leadingDays + 1);
  const dateKey = (day: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  return <ProtectedRoute allowedRoles={['administrador', 'administracao', 'recepcao', 'visitante']}>
    <MainLayout userName={profile?.full_name || 'Usuário'} userRole={profile?.role || 'visitante'} title="Agenda de Eventos" subtitle="Solicitações, aprovações e disponibilidade dos ambientes">
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center"><div className="inline-flex rounded-lg border border-gray-300 bg-white p-1"><button onClick={() => setView('table')} className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium ${view === 'table' ? 'bg-blue-600 text-white' : 'text-gray-600'}`}><Table2 size={18} />Tabela</button><button onClick={() => setView('calendar')} className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium ${view === 'calendar' ? 'bg-blue-600 text-white' : 'text-gray-600'}`}><CalendarDays size={18} />Calendário</button></div><Button onClick={() => openForm()}><Plus size={19} />Nova solicitação</Button></div>
        {error && <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"><AlertCircle className="shrink-0" size={20} />{error}</div>}
        {notice && <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">{notice}</div>}

        {view === 'table' ? <>
          <div className="flex flex-col gap-3 md:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-2.5 text-gray-400" size={20} /><input className={`${inputClass} pl-10`} placeholder="Pesquisar título, descrição ou ambiente" value={search} onChange={(event) => setSearch(event.target.value)} /></div><select className={inputClass} value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)}><option value="">Todos os status</option>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
          {loading ? <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div> : !visibleEvents.length ? <EmptyState title="Nenhuma solicitação encontrada" description="Crie uma solicitação ou ajuste os filtros." action={<Button onClick={() => openForm()}><Plus size={18} />Nova solicitação</Button>} /> : <Card><CardContent className="overflow-x-auto p-0"><table className="w-full min-w-[980px] text-sm"><thead className="bg-gray-50"><tr>{([['title', 'Título'], ['event_type', 'Tipo'], ['space', 'Ambiente'], ['start_date', 'Data'], ['start_time', 'Horário'], ['status', 'Status']] as Array<[SortKey, string]>).map(([field, label]) => <th key={field} className="px-4 py-3 text-left"><SortHeader field={field}>{label}</SortHeader></th>)}<th className="px-4 py-3 text-right font-semibold text-gray-700">Ações</th></tr></thead><tbody>{visibleEvents.map((agendaEvent) => <tr key={agendaEvent.id} className="border-t border-gray-100 hover:bg-gray-50"><td className="px-4 py-3"><div className="flex items-center gap-3">{agendaEvent.thumbnail_url ? <img src={agendaEvent.thumbnail_url} alt="" className="h-10 w-14 rounded object-cover" /> : <div className="flex h-10 w-14 items-center justify-center rounded bg-gray-100"><ImageIcon size={18} /></div>}<div><p className="font-medium text-gray-900">{agendaEvent.title}</p><p className="max-w-56 truncate text-xs text-gray-500">{agendaEvent.description}</p></div></div></td><td className="px-4 py-3">{EVENT_TYPES.find(([value]) => value === agendaEvent.event_type)?.[1] ?? agendaEvent.event_type}</td><td className="px-4 py-3">{agendaEvent.spaces?.name ?? '—'}</td><td className="px-4 py-3">{new Date(`${agendaEvent.start_date}T12:00:00`).toLocaleDateString('pt-BR')}</td><td className="px-4 py-3">{agendaEvent.start_time.slice(0, 5)}–{agendaEvent.end_time.slice(0, 5)}</td><td className="px-4 py-3"><Badge variant={agendaEvent.status === 'confirmada' || agendaEvent.status === 'realizada' ? 'success' : agendaEvent.status === 'aguardando_aprovacao' ? 'warning' : 'danger'}>{STATUS_LABELS[agendaEvent.status] ?? agendaEvent.status}</Badge></td><td className="px-4 py-3"><div className="flex justify-end gap-1">{profile?.role === 'administrador' && agendaEvent.status === 'aguardando_aprovacao' && <><Button title="Aprovar" variant="ghost" size="sm" className="text-green-700" onClick={() => void changeStatus(agendaEvent, 'confirmada')}><Check size={17} /></Button><Button title="Reprovar" variant="ghost" size="sm" className="text-red-700" onClick={() => void changeStatus(agendaEvent, 'cancelada')}><X size={17} /></Button></>} {profile?.role === 'administrador' && <><Button title="Editar" variant="ghost" size="sm" onClick={() => openForm(agendaEvent)}><Edit size={17} /></Button><Button title="Excluir" variant="ghost" size="sm" className="text-red-700" onClick={() => void remove(agendaEvent)}><Trash2 size={17} /></Button></>}</div></td></tr>)}</tbody></table></CardContent></Card>}
        </> : <>
          <div className="max-w-md"><label className="mb-1 block text-sm font-medium text-gray-700">Ambiente *</label><select value={calendarSpace} onChange={(event) => setCalendarSpace(event.target.value)} className={inputClass}><option value="">Selecione o ambiente</option>{spaces.map((space) => <option key={space.id} value={space.id}>{space.name}</option>)}</select></div>
          {!calendarSpace ? <EmptyState title="Selecione um ambiente" description="O calendário apresenta a disponibilidade individual de cada ambiente." /> : <Card><CardHeader className="flex flex-row items-center justify-between"><Button variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}><ChevronLeft size={20} /></Button><CardTitle className="capitalize">{currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</CardTitle><Button variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}><ChevronRight size={20} /></Button></CardHeader><CardContent>{calendarLoading ? <div className="flex justify-center py-20"><LoadingSpinner /></div> : <><div className="mb-2 grid grid-cols-7 gap-2 text-center text-xs font-semibold text-gray-500">{['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => <div key={day}>{day}</div>)}</div><div className="grid grid-cols-7 gap-1 sm:gap-2">{calendarDays.map((day, index) => { if (!day) return <div key={`empty-${index}`} />; const date = dateKey(day); const dayEvents = calendarEvents.filter((item) => item.start_date === date); const isPast = date < new Date().toLocaleDateString('en-CA'); const unavailable = isPast || dayEvents.length > 0; return <button key={date} disabled={unavailable} onClick={() => openForm(undefined, date)} className={`min-h-24 rounded-lg border p-1 text-left sm:min-h-28 sm:p-2 ${unavailable ? 'cursor-not-allowed border-red-200 bg-red-50' : 'border-green-200 bg-green-50 hover:bg-green-100'}`}><strong>{day}</strong><p className={`mt-1 text-[10px] font-medium sm:text-xs ${unavailable ? 'text-red-700' : 'text-green-700'}`}>{unavailable ? 'Indisponível' : 'Disponível'}</p>{dayEvents.map((item) => <div key={item.id} className="mt-1 text-[10px] text-red-800 sm:text-xs"><p className="truncate font-semibold">{item.title}</p><p>{item.start_time.slice(0, 5)}–{item.end_time.slice(0, 5)}</p></div>)}</button>; })}</div></>}</CardContent></Card>}
        </>}

        <Dialog open={showDialog} onOpenChange={setShowDialog}><DialogContent className="max-h-[94vh] max-w-4xl overflow-y-auto"><DialogHeader><DialogTitle>{editing ? 'Editar evento' : 'Solicitar evento'}</DialogTitle><DialogDescription>O status é definido automaticamente: eventos criados pelo Administrador são confirmados; demais solicitações aguardam aprovação.</DialogDescription></DialogHeader><form onSubmit={submit} className="space-y-6">
          <section className="space-y-4"><h3 className="border-b pb-2 text-lg font-semibold">Dados do evento</h3><div className="grid gap-4 sm:grid-cols-2"><Field label="Título *"><input required className={inputClass} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field><Field label="Tipo do evento *"><select className={inputClass} value={form.event_type} onChange={(event) => setForm({ ...form, event_type: event.target.value })}>{EVENT_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field></div><Field label="Descrição"><textarea rows={3} className={inputClass} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field><Field label="Imagem do Evento (Thumbnail) *" hint="Envie JPG, PNG, WEBP ou GIF de até 10 MB."><input type="file" accept="image/*" required={!editing?.thumbnail_url} onChange={(event) => setThumbnail(event.target.files?.[0] ?? null)} /></Field><div className="grid gap-4 sm:grid-cols-2"><RadioGroup label="Acesso ao evento *" value={form.audience_access} options={[['publico_fechado', 'Público fechado'], ['aberto_publico', 'Aberto ao público']]} onChange={(value) => setForm({ ...form, audience_access: value })} /><RadioGroup label="Tipo de atividade *" value={form.activity_sector} options={[['sociedade_civil', 'Sociedade civil'], ['governo', 'Governo']]} onChange={(value) => setForm({ ...form, activity_sector: value })} /></div><div className="grid gap-4 sm:grid-cols-3"><Field label="Ambiente *"><select required className={inputClass} value={form.space_id} onChange={(event) => setForm({ ...form, space_id: event.target.value })}><option value="">Selecione</option>{spaces.map((space) => <option key={space.id} value={space.id}>{space.name}</option>)}</select></Field><Field label="Data *"><input required type="date" className={inputClass} value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })} /></Field><Field label="Capacidade"><input min="1" type="number" className={inputClass} value={form.capacity} onChange={(event) => setForm({ ...form, capacity: event.target.value })} /></Field></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Horário inicial *"><input required type="time" className={inputClass} value={form.start_time} onChange={(event) => setForm({ ...form, start_time: event.target.value })} /></Field><Field label="Horário final *"><input required type="time" className={inputClass} value={form.end_time} onChange={(event) => setForm({ ...form, end_time: event.target.value })} /></Field></div></section>
          <section className="space-y-4"><div><h3 className="text-lg font-semibold">Informações Gerais</h3><h4 className="font-medium text-blue-700">Pessoa facilitadora</h4><p className="text-sm text-gray-600">Informe os dados da pessoa responsável por conduzir a atividade. Eles serão utilizados pela equipe para organização e contato.</p></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Nome completo *"><input required className={inputClass} value={form.facilitator_name} onChange={(event) => setForm({ ...form, facilitator_name: event.target.value })} /></Field><Field label="CPF *"><input required inputMode="numeric" placeholder="000.000.000-00" className={inputClass} value={form.facilitator_cpf} onChange={(event) => setForm({ ...form, facilitator_cpf: event.target.value })} /></Field></div><Field label="Minibio *"><textarea required rows={3} className={inputClass} value={form.facilitator_minibio} onChange={(event) => setForm({ ...form, facilitator_minibio: event.target.value })} /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="CNPJ (opcional)"><input inputMode="numeric" placeholder="00.000.000/0000-00" className={inputClass} value={form.facilitator_cnpj} onChange={(event) => setForm({ ...form, facilitator_cnpj: event.target.value })} /></Field><Field label="Telefone de contato *"><input required type="tel" className={inputClass} value={form.facilitator_phone} onChange={(event) => setForm({ ...form, facilitator_phone: event.target.value })} /></Field><Field label="Perfil de rede social *"><input required placeholder="@perfil ou URL" className={inputClass} value={form.facilitator_social} onChange={(event) => setForm({ ...form, facilitator_social: event.target.value })} /></Field><Field label="Foto *" hint="Escolha uma imagem ou use a câmera do celular."><input required={!editing?.facilitator_photo_url} type="file" accept="image/*" capture="environment" onChange={(event) => setFacilitatorPhoto(event.target.files?.[0] ?? null)} /></Field><Field label="Nome do organizador responsável *"><input required className={inputClass} value={form.organizer_name} onChange={(event) => setForm({ ...form, organizer_name: event.target.value })} /></Field><Field label="Contato do organizador *"><input required className={inputClass} value={form.organizer_contact} onChange={(event) => setForm({ ...form, organizer_contact: event.target.value })} /></Field></div></section>
          <section className="space-y-4"><h3 className="border-b pb-2 text-lg font-semibold">Necessidades da atividade</h3><RadioGroup label="Necessidade de intérprete *" value={form.interpreter_needed} options={[['sim', 'Sim'], ['nao', 'Não']]} onChange={(value) => setForm({ ...form, interpreter_needed: value })} /><Field label="Equipamentos"><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{EQUIPMENT_OPTIONS.map((equipment) => <label key={equipment} className="flex items-center gap-2 rounded border p-2 text-sm"><input type="checkbox" checked={form.equipments.includes(equipment)} onChange={() => toggleEquipment(equipment)} />{equipment}</label>)}</div></Field><div className="grid gap-4 sm:grid-cols-3"><RadioGroup label="Materiais *" value={form.materials_needed} options={[['sim', 'Sim'], ['nao', 'Não']]} onChange={(value) => setForm({ ...form, materials_needed: value })} /><RadioGroup label="Catering *" value={form.catering_needed} options={[['sim', 'Sim'], ['nao', 'Não']]} onChange={(value) => setForm({ ...form, catering_needed: value })} /><RadioGroup label="Mudança de mobília *" value={form.furniture_change_needed} options={[['sim', 'Sim'], ['nao', 'Não']]} onChange={(value) => setForm({ ...form, furniture_change_needed: value })} /></div></section>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button><Button type="submit" loading={saving}>{editing ? 'Salvar alterações' : 'Enviar solicitação'}</Button></DialogFooter>
        </form></DialogContent></Dialog>
      </div>
    </MainLayout>
  </ProtectedRoute>;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>{hint && <span className="mb-2 block text-xs text-gray-500">{hint}</span>}{children}</label>; }
function RadioGroup({ label, value, options, onChange }: { label: string; value: string; options: Array<[string, string]>; onChange: (value: string) => void }) { return <fieldset><legend className="mb-2 text-sm font-medium text-gray-700">{label}</legend><div className="flex flex-wrap gap-4">{options.map(([optionValue, optionLabel]) => <label key={optionValue} className="flex items-center gap-2 text-sm"><input type="radio" checked={value === optionValue} onChange={() => onChange(optionValue)} />{optionLabel}</label>)}</div></fieldset>; }
