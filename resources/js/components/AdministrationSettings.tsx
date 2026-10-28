import React, { useEffect, useState } from 'react';
import { administrationApi, type AuditEntry, type BackupFile, type ManagedUser } from '../api/client';

const roles: Record<ManagedUser['role'], string> = {
  director: 'Директор', accountant: 'Бухгалтер', educator: 'Вихователь',
};
const actions: Record<string, string> = {
  'user.created': 'Створено користувача', 'user.updated': 'Змінено користувача',
  'settings.updated': 'Змінено налаштування і реквізити',
  'settings.logo_uploaded': 'Змінено логотип квитанції', 'settings.logo_removed': 'Відновлено логотип квитанції',
  'tariff.updated': 'Змінено ціну абонемента',
  'finance_option.created': 'Додано фінансовий варіант', 'finance_option.updated': 'Змінено фінансовий варіант',
  'finance_option.deleted': 'Видалено фінансовий варіант',
  'month.closed': 'Закрито місяць', 'month.reopened': 'Повторно відкрито місяць',
  'journal.carried_forward': 'Перенесено табель на наступний місяць',
  'payroll.payment_added': 'Додано аванс або виплату зарплати',
  'journal.cleared': 'Повністю очищено місяць із резервною копією',
};
const blank = (): Omit<ManagedUser, 'id'> & { password: string } => ({ name: '', email: '', role: 'educator', active: true, password: '' });
const date = (value: string) => new Date(value).toLocaleString('uk-UA');

export const AdministrationSettings: React.FC<{ currentUserId: string; section: 'users' | 'audit' | 'backups' }> = ({ currentUserId, section }) => {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [editing, setEditing] = useState<number | 'new' | null>(null);
  const [form, setForm] = useState(blank());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const refresh = async () => {
    if (section === 'users') setUsers(await administrationApi.users());
    if (section === 'audit') setAudit(await administrationApi.audit());
    if (section === 'backups') setBackups(await administrationApi.backups());
  };
  useEffect(() => { void refresh().catch((reason) => setError(reason instanceof Error ? reason.message : 'Не вдалося завантажити дані.')); }, [section]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      if (editing === 'new') await administrationApi.createUser(form);
      else if (typeof editing === 'number') await administrationApi.updateUser(editing, { ...form, password: form.password || undefined });
      await refresh(); setEditing(null); setForm(blank()); setMessage('Користувача збережено.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не вдалося зберегти користувача.'); }
    finally { setBusy(false); }
  };
  const edit = (user: ManagedUser) => { setEditing(user.id); setForm({ name: user.name, email: user.email, role: user.role, active: user.active, password: '' }); setError(''); };

  return <div className="space-y-6">
    {(error || message) && <p role="status" className={`rounded-xl p-3 text-sm ${error ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{error || message}</p>}
    {section === 'users' && <section className="rounded-2xl bg-white border border-stone-200 p-5 sm:p-6 shadow-sm">
      <h3 className="text-lg font-bold text-stone-800">Користувачі та доступ</h3>
      <p className="mt-1 text-sm text-stone-500">Директор керує користувачами. Директор і бухгалтер можуть змінювати тарифи та реквізити; вихователь має доступ до журналу.</p>
      <div className="mt-4 space-y-2">{users.map((user) => <div key={user.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-100 p-3 text-sm">
        <div><b>{user.name}</b> · {user.email}<div className="text-stone-500">{roles[user.role]} · {user.active ? 'Активний' : 'Вимкнений'}</div></div>
        <button type="button" className="rounded-lg border border-stone-300 px-3 py-2" onClick={() => edit(user)}>Редагувати</button>
      </div>)}</div>
      {editing === null && <button type="button" onClick={() => { setEditing('new'); setForm(blank()); }} className="mt-4 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white">Додати користувача</button>}
      {editing !== null && <form onSubmit={(event) => void save(event)} className="mt-5 grid gap-3 rounded-xl bg-orange-50 p-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">Ім’я<input required maxLength={255} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 w-full rounded-lg border p-2 font-normal" /></label>
        <label className="text-sm font-semibold">Email<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1 w-full rounded-lg border p-2 font-normal" /></label>
        <label className="text-sm font-semibold">Роль<select value={form.role} disabled={editing !== 'new' && String(editing) === currentUserId} onChange={(e) => setForm({ ...form, role: e.target.value as ManagedUser['role'] })} className="mt-1 w-full rounded-lg border p-2 font-normal">{Object.entries(roles).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label className="text-sm font-semibold">{editing === 'new' ? 'Пароль (від 12 символів)' : 'Новий пароль (необов’язково)'}<input type="password" autoComplete="new-password" minLength={12} required={editing === 'new'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="mt-1 w-full rounded-lg border p-2 font-normal" /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} disabled={editing !== 'new' && String(editing) === currentUserId} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Активний</label>
        <div className="flex gap-2 sm:col-span-2"><button disabled={busy} className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Зберігаємо…' : 'Зберегти'}</button><button type="button" onClick={() => setEditing(null)} className="rounded-xl border px-4 py-2 text-sm">Скасувати</button></div>
      </form>}
    </section>}
    {section === 'audit' && <section className="rounded-2xl bg-white border border-stone-200 p-5 sm:p-6 shadow-sm">
      <h3 className="text-lg font-bold text-stone-800">Історія змін</h3><p className="mt-1 text-sm text-stone-500">Останні 100 змін налаштувань, тарифів і доступу.</p>
      <div className="mt-4 max-h-80 overflow-auto divide-y">{audit.length ? audit.map((entry) => <div key={entry.id} className="py-2 text-sm"><b>{actions[entry.action] ?? entry.action}</b><span className="text-stone-500"> · {entry.actor_name} · {date(entry.created_at)}</span>{Boolean(entry.details?.name) && <span className="text-stone-500"> · {String(entry.details.name)}</span>}</div>) : <p className="text-sm text-stone-500">Змін поки немає.</p>}</div>
    </section>}
    {section === 'backups' && <section className="rounded-2xl bg-white border border-stone-200 p-5 sm:p-6 shadow-sm">
      <h3 className="text-lg font-bold text-stone-800">Резервні копії</h3>
      <p className="mt-1 text-sm text-stone-500">Остання копія: {backups[0] ? date(backups[0].createdAt) : 'відсутня'}. Копії створює локальний сценарій резервування бази.</p>
      <div className="mt-4 space-y-2">{backups.map((backup) => <div key={backup.name} className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 py-2 text-sm"><span>{date(backup.createdAt)} · {(backup.size / 1024).toFixed(1)} КБ</span><button type="button" onClick={() => void administrationApi.downloadBackup(backup.name).catch((reason) => setError(reason instanceof Error ? reason.message : 'Не вдалося завантажити копію.'))} className="rounded-lg border border-stone-300 px-3 py-2">Завантажити</button></div>)}</div>
    </section>}
  </div>;
};
