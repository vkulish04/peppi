import React, { useEffect, useRef, useState } from 'react';
import { Building2, Ticket, Utensils, Receipt, Tags, Users, History, Database, ChevronRight, Settings2 } from 'lucide-react';
import { Activity, FinanceOption, KindergartenInfo, SubscriptionTariff } from '../types';
import { settingsApi, subscriptionTariffsApi } from '../api/client';
import { FinanceOptionsSettings } from './FinanceOptionsSettings';
import { AdministrationSettings } from './AdministrationSettings';

interface Props {
  directorId?: string;
  info: KindergartenInfo;
  subscriptions: Activity[];
  selectedYear: number;
  selectedMonth: number;
  onInfoSaved: (info: KindergartenInfo) => void;
  onSubscriptionSaved: () => Promise<void>;
  financeOptions: FinanceOption[];
  onFinanceOptionsSaved: (options: FinanceOption[]) => void;
}

type SettingsSection = 'general' | 'subscriptions' | 'food' | 'receipts' | 'finance' | 'users' | 'audit' | 'backups';
const monthKey = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}`;

export const SystemSettings: React.FC<Props> = ({ directorId, info, subscriptions, selectedYear, selectedMonth, onInfoSaved, onSubscriptionSaved, financeOptions, onFinanceOptionsSaved }) => {
  const [section, setSection] = useState<SettingsSection>('general');
  const [form, setForm] = useState(info);
  const previousInfo = useRef(info);
  const [tariffs, setTariffs] = useState<SubscriptionTariff[]>([]);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [effectiveMonths, setEffectiveMonths] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const oldInfo = previousInfo.current;
    setForm(draft => {
      const merged = { ...info };
      for (const key of Object.keys(info) as (keyof KindergartenInfo)[]) {
        if (draft[key] !== oldInfo[key]) Object.assign(merged, { [key]: draft[key] });
      }
      return merged;
    });
    previousInfo.current = info;
  }, [info]);
  useEffect(() => {
    let active = true;
    subscriptionTariffsApi.list()
      .then((rows) => { if (active) setTariffs(rows); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'Не вдалося завантажити тарифи.'); });
    return () => { active = false; };
  }, [subscriptions.length]);
  useEffect(() => {
    setPrices((previous) => Object.fromEntries(subscriptions.map((item) => [item.id, previous[item.id] ?? String(item.price)])));
    const next = new Date(selectedYear, selectedMonth, 1);
    setEffectiveMonths((previous) => Object.fromEntries(subscriptions.map((item) => [item.id, previous[item.id] ?? monthKey(next.getFullYear(), next.getMonth() + 1)])));
  }, [subscriptions, selectedYear, selectedMonth]);

  const saveInfo = async (event: React.FormEvent, keys: (keyof KindergartenInfo)[]) => {
    event.preventDefault();
    if (keys.includes('dailyFoodRate') && (!Number.isFinite(Number(form.dailyFoodRate)) || Number(form.dailyFoodRate) < 0)) {
      setError('Введіть коректну денну ставку харчування.'); return;
    }
    setError(''); setMessage(''); setSaving('info');
    try {
      const payload = { ...info, ...Object.fromEntries(keys.map(key => [key, form[key]])) };
      if (keys.includes('iban')) payload.iban = payload.iban.replace(/\s/g, '').toUpperCase();
      const saved = await settingsApi.update(payload);
      setForm(draft => ({ ...draft, ...Object.fromEntries(keys.map(key => [key, saved[key]])) }));
      onInfoSaved(saved);
      setMessage(keys.includes('dailyFoodRate') ? 'Ставку збережено. Вона діятиме для нових нарахувань.' : 'Налаштування розділу збережено.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не вдалося зберегти налаштування.');
    } finally {
      setSaving(null);
    }
  };

  const savePrice = async (activity: Activity) => {
    const price = Number(prices[activity.id]);
    const effectiveMonth = effectiveMonths[activity.id] ?? '';
    if (!Number.isFinite(price) || price < 0 || prices[activity.id]?.trim() === '') {
      setError('Введіть коректну ціну абонемента.'); return;
    }
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(effectiveMonth)) {
      setError('Виберіть місяць початку дії ціни.'); return;
    }
    const [year, month] = effectiveMonth.split('-').map(Number);
    setError(''); setMessage(''); setSaving(activity.id);
    try {
      setTariffs(await subscriptionTariffsApi.update(activity.id, year, month, price));
      await onSubscriptionSaved();
      setMessage(`Ціну «${activity.name}» з ${month}.${year} збережено.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не вдалося зберегти ціну.');
    } finally {
      setSaving(null);
    }
  };

  const uploadLogo = async (file?: File) => {
    if (!file) return;
    setError(''); setMessage(''); setSaving('logo');
    try {
      if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 2 * 1024 * 1024) {
        throw new Error('Оберіть PNG або JPG до 2 МБ.');
      }
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Не вдалося обробити логотип.');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const jpeg = await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Не вдалося підготувати логотип.')), 'image/jpeg', 0.85));
      const saved = await settingsApi.uploadLogo(new File([jpeg], 'receipt-logo.jpg', { type: 'image/jpeg' }));
      onInfoSaved(saved);
      setMessage('Логотип квитанції оновлено.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не вдалося завантажити логотип.');
    } finally {
      setSaving(null);
    }
  };

  const removeLogo = async () => {
    setError(''); setMessage(''); setSaving('logo');
    try {
      const saved = await settingsApi.removeLogo();
      onInfoSaved(saved);
      setMessage('Стандартний логотип відновлено.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не вдалося відновити логотип.');
    } finally {
      setSaving(null);
    }
  };

  const field = (key: 'name' | 'edrpou' | 'phone' | 'address' | 'email' | 'iban' | 'bankName' | 'receiptContactPhone' | 'receiptContactEmail' | 'paymentPurposeTemplate', label: string, hint?: string) => (
    <label className="block text-sm font-semibold text-stone-700">
      {label}
      <input
        className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 font-normal text-stone-800 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
        value={form[key]}
        placeholder={hint}
        onChange={(event) => setForm((old) => ({ ...old, [key]: event.target.value }))}
      />
    </label>
  );

  const sections = [
    { id: 'general', label: 'Заклад і реквізити', hint: 'Контакти та банківські дані', Icon: Building2 },
    { id: 'subscriptions', label: 'Абонемент', hint: 'Ціни та початок їх дії', Icon: Ticket },
    { id: 'food', label: 'Харчування', hint: 'Ставка для перерахунків', Icon: Utensils },
    { id: 'receipts', label: 'Квитанції', hint: 'Логотип, контакти й тексти', Icon: Receipt },
    { id: 'finance', label: 'Витрати та оплата', hint: 'Категорії, значки, способи оплати', Icon: Tags },
    ...(directorId ? [
      { id: 'users', label: 'Користувачі та доступ', hint: 'Облікові записи й ролі', Icon: Users },
      { id: 'audit', label: 'Історія змін', hint: 'Дії користувачів у системі', Icon: History },
      { id: 'backups', label: 'Резервні копії', hint: 'Перегляд і завантаження', Icon: Database },
    ] : []),
  ];
  const activeSection = sections.find(item => item.id === section) ?? sections[0];
  const changeSection = (next: SettingsSection) => { setSection(next); setError(''); setMessage(''); };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3"><span className="rounded-2xl bg-orange-100 p-3 text-orange-600"><Settings2 className="h-6 w-6" /></span><div><h2 className="text-2xl font-extrabold text-stone-900">Налаштування системи</h2><p className="mt-1 text-sm text-stone-500">Оберіть розділ, щоб змінити потрібні параметри.</p></div></div>
      <div className="grid items-start gap-5 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-6">
        <aside className="min-w-0 rounded-2xl border border-stone-200 bg-white p-2 shadow-xs lg:sticky lg:top-6 lg:p-3">
          <p className="mb-3 hidden px-3 pt-2 text-[10px] font-bold uppercase tracking-widest text-stone-400 lg:block">Розділи налаштувань</p>
          <nav aria-label="Розділи налаштувань" className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
            {sections.map(({id,label,hint,Icon}) => <button key={id} type="button" disabled={saving !== null} aria-current={section === id ? 'page' : undefined} aria-controls="settings-content" onClick={() => changeSection(id as SettingsSection)} className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-left transition disabled:opacity-50 lg:w-full ${section === id ? 'bg-orange-50 text-orange-800 ring-1 ring-orange-100' : 'text-stone-500 hover:bg-stone-50 hover:text-stone-800'}`}><span className={`rounded-lg p-2 ${section === id ? 'bg-orange-600 text-white shadow-sm' : 'bg-stone-100 text-stone-500'}`}><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block whitespace-nowrap text-xs font-bold">{label}</span><span className="mt-0.5 hidden text-[10px] leading-4 text-stone-400 lg:block">{hint}</span></span>{section === id && <ChevronRight className="hidden h-4 w-4 shrink-0 text-orange-500 lg:block" />}</button>)}
          </nav>
        </aside>
        <div id="settings-content" className="min-w-0 space-y-5">
          <div className="px-1"><p className="text-[10px] font-bold uppercase tracking-widest text-orange-600">Налаштування / {activeSection.label}</p><p className="mt-1 text-sm text-stone-500">{activeSection.hint}</p></div>
          {(error || message) && <div role="status" className={`rounded-xl px-4 py-3 text-sm ${error ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{error || message}</div>}
          {section === 'subscriptions' && (
      <section className="rounded-2xl bg-white border border-stone-200 p-5 sm:p-6 shadow-sm">
        <h3 className="text-lg font-bold text-stone-800">Абонемент</h3>
        <p className="mt-1 mb-5 text-sm text-stone-500">Оберіть нову ціну та місяць, з якого вона діє. Знижка дитини застосовується лише до абонемента. Уже створені нарахування зберігають свої суми.</p>
        {subscriptions.length === 0 && <p className="text-sm text-stone-500">Абонементів поки немає.</p>}
        <div className="space-y-4">
          {subscriptions.map((activity) => {
            const tariff = tariffs.find((item) => item.activityId === activity.id);
            return <div key={activity.id} className="rounded-xl border border-orange-100 bg-orange-50/40 p-4">
              <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <label className="flex-1 text-sm font-semibold text-stone-700">
                {activity.name} · ціна, грн
                <input type="number" min="0" step="0.01" inputMode="decimal" value={prices[activity.id] ?? ''} onChange={(event) => setPrices((old) => ({ ...old, [activity.id]: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 font-normal outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
              </label>
              <label className="flex-1 text-sm font-semibold text-stone-700">
                Діє з місяця
                <input type="month" min="2020-01" max="2100-12" value={effectiveMonths[activity.id] ?? ''} onChange={(event) => setEffectiveMonths((old) => ({ ...old, [activity.id]: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 font-normal outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
              </label>
              <button type="button" disabled={saving !== null} onClick={() => void savePrice(activity)} className="rounded-xl bg-orange-600 px-5 py-3 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50">{saving === activity.id ? 'Зберігаємо…' : 'Зберегти ціну'}</button>
              </div>
              {tariff && <p className="mt-3 text-xs text-stone-500">Базова ціна: {tariff.basePrice} грн{tariff.periods.length > 0 && <> · Зміни: {tariff.periods.map((period) => `${monthKey(period.year, period.month)} — ${period.price} грн`).join('; ')}</>}</p>}
            </div>;
          })}
        </div>
      </section>
          )}
          {section === 'general' && <form onSubmit={event => void saveInfo(event, ['name', 'edrpou', 'phone', 'address', 'email', 'iban', 'bankName'])} className="rounded-2xl bg-white border border-stone-200 p-5 sm:p-6 shadow-sm">
        <h3 className="text-lg font-bold text-stone-800">Дані та банківські реквізити</h3>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">{field('name', 'Назва закладу *')}</div>
          {field('edrpou', 'ЄДРПОУ')}
          {field('phone', 'Телефон')}
          <div className="sm:col-span-2">{field('address', 'Адреса')}</div>
          <div className="sm:col-span-2">{field('email', 'Електронна пошта')}</div>
          <div className="sm:col-span-2">{field('iban', 'Рахунок IBAN', 'UA…')}</div>
          <div className="sm:col-span-2">{field('bankName', 'Назва банку')}</div>
        </div>
        <button type="submit" disabled={saving !== null || (section === 'general' && !form.name.trim())} className="mt-6 rounded-xl bg-orange-600 px-6 py-3 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-50">{saving === 'info' ? 'Зберігаємо…' : 'Зберегти зміни'}</button>
      </form>}
          {section === 'food' && <form onSubmit={event => void saveInfo(event, ['dailyFoodRate'])} className="rounded-2xl bg-white border border-stone-200 p-5 sm:p-6 shadow-sm">
        <h3 className="text-lg font-bold text-stone-800">Харчування</h3>
        <p className="mt-1 text-sm text-stone-500">Ставка для перерахунку лікарняних і пропусків у нових нарахуваннях.</p>
        <label className="mt-4 block max-w-xs text-sm font-semibold text-stone-700">
          Денна ставка, грн
          <input type="number" min="0" max="100000" step="0.01" inputMode="decimal" value={form.dailyFoodRate} onChange={(event) => setForm((old) => ({ ...old, dailyFoodRate: Number(event.target.value) }))} className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 font-normal outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
        </label>
        <button type="submit" disabled={saving !== null} className="mt-6 rounded-xl bg-orange-600 px-6 py-3 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-50">{saving === 'info' ? 'Зберігаємо…' : 'Зберегти зміни'}</button>
      </form>}
          {section === 'receipts' && <form onSubmit={event => void saveInfo(event, ['receiptContactPhone', 'receiptContactEmail', 'paymentPurposeTemplate', 'receiptNote'])} className="rounded-2xl bg-white border border-stone-200 p-5 sm:p-6 shadow-sm">
        <h3 className="text-lg font-bold text-stone-800">Квитанції</h3>
        <p className="mt-1 text-sm text-stone-500">Контакти та текст відображаються у попередньому перегляді й PDF.</p>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <img src={form.receiptLogoUrl} alt="Логотип квитанції" className="h-20 w-20 rounded-xl border border-stone-200 bg-white object-contain" />
          <label className="text-sm font-semibold text-stone-700">
            Завантажити логотип (PNG або JPG, до 2 МБ)
            <input type="file" accept="image/png,image/jpeg" disabled={saving !== null} onChange={(event) => void uploadLogo(event.target.files?.[0])} className="mt-1 block w-full text-sm font-normal" />
          </label>
          <button type="button" disabled={saving !== null} onClick={() => void removeLogo()} className="rounded-xl border border-stone-300 px-3 py-2 text-sm text-stone-700 disabled:opacity-50">Стандартний логотип</button>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {field('receiptContactPhone', 'Телефон у квитанції', 'Якщо порожньо — телефон закладу')}
          {field('receiptContactEmail', 'Пошта у квитанції', 'Якщо порожньо — пошта закладу')}
          <div className="sm:col-span-2">{field('paymentPurposeTemplate', 'Призначення платежу *')}</div>
          <p className="sm:col-span-2 text-xs text-stone-500">Підстановки: {'{child}'} — ім’я дитини, {'{month}'} — номер місяця, {'{year}'} — рік.</p>
          <label className="sm:col-span-2 block text-sm font-semibold text-stone-700">Примітка для батьків
            <textarea value={form.receiptNote} onChange={(event) => setForm((old) => ({ ...old, receiptNote: event.target.value }))} rows={3} className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 font-normal text-stone-800 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
          </label>
        </div>
        <button type="submit" disabled={saving !== null} className="mt-6 rounded-xl bg-orange-600 px-6 py-3 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-50">{saving === 'info' ? 'Зберігаємо…' : 'Зберегти зміни'}</button>
      </form>}
          {section === 'finance' && <FinanceOptionsSettings options={financeOptions} onChanged={onFinanceOptionsSaved} />}
          {directorId && (section === 'users' || section === 'audit' || section === 'backups') && <AdministrationSettings key={section} currentUserId={directorId} section={section} />}
        </div>
      </div>
    </div>
  );
};
