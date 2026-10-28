import React, { useState } from 'react';
import {
  Sparkles,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Coins,
  BookOpen,
  Palette,
  Dumbbell,
  Languages,
  BrainCircuit,
  Utensils,
  Layers,
} from 'lucide-react';
import { Activity, ActivityBillingType } from '../types';
import { formatCurrency } from '../utils/calculations';

interface ActivitiesManagerProps {
  activities: Activity[];
  onAddActivity: (newAct: Omit<Activity, 'id'>) => void;
  onUpdateActivity: (act: Activity) => void;
  onDeleteActivity: (actId: string) => void;
}

export const ActivitiesManager: React.FC<ActivitiesManagerProps> = ({
  activities,
  onAddActivity,
  onUpdateActivity,
  onDeleteActivity,
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [price, setPrice] = useState<number>(500);
  const [billingType, setBillingType] =
    useState<ActivityBillingType>('monthly');
  const [category, setCategory] = useState<
    'core' | 'creative' | 'sport' | 'languages' | 'development'
  >('creative');
  const [instructor, setInstructor] = useState('');
  const [description, setDescription] = useState('');

  const handleOpenAdd = () => {
    setEditingActivity(null);
    setName('');
    setPrice(500);
    setBillingType('monthly');
    setCategory('creative');
    setInstructor('');
    setDescription('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (act: Activity) => {
    setEditingActivity(act);
    setName(act.name);
    setPrice(act.price);
    setBillingType(act.billingType);
    setCategory(act.category);
    setInstructor(act.instructor || '');
    setDescription(act.description || '');
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingActivity) {
      onUpdateActivity({
        ...editingActivity,
        name: name.trim(),
        price: Number(price) || 0,
        billingType,
        category,
        instructor: instructor.trim(),
        description: description.trim(),
      });
    } else {
      onAddActivity({
        name: name.trim(),
        price: Number(price) || 0,
        billingType,
        category,
        instructor: instructor.trim(),
        description: description.trim(),
        color: 'orange',
        active: true,
      });
    }
    setIsFormOpen(false);
  };

  const getCategoryIcon = (cat: Activity['category']) => {
    switch (cat) {
      case 'core':
        return <Utensils className="w-5 h-5 text-orange-600" />;
      case 'languages':
        return <Languages className="w-5 h-5 text-amber-600" />;
      case 'sport':
        return <Dumbbell className="w-5 h-5 text-rose-600" />;
      case 'creative':
        return <Palette className="w-5 h-5 text-emerald-600" />;
      case 'development':
        return <BrainCircuit className="w-5 h-5 text-indigo-600" />;
      default:
        return <BookOpen className="w-5 h-5 text-orange-600" />;
    }
  };

  const getCategoryLabel = (cat: Activity['category']) => {
    switch (cat) {
      case 'core':
        return 'Базове / Харчування';
      case 'languages':
        return 'Іноземні мови';
      case 'sport':
        return 'Спорт і танці';
      case 'creative':
        return 'Творчість і мистецтво';
      case 'development':
        return 'Розвиток та корекція';
      default:
        return 'Загальне';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Add button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-orange-100 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-stone-900 font-heading">
            Заняття, гуртки та прейскурант цін
          </h2>
          <p className="text-sm text-stone-500 mt-1">
            Налаштування тарифів, вартості харчування та додаткових гуртків для табеля
          </p>
          <p className="text-xs text-orange-700 mt-1">Ціна абонементу змінюється у «Налаштуваннях».</p>
        </div>

        <button
          id="add-activity-btn"
          onClick={handleOpenAdd}
          className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-semibold text-sm rounded-xl shadow-md transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>Додати заняття / послугу</span>
        </button>
      </div>

      {/* Grid of activities */}
      <label className="flex items-center gap-2 text-sm text-stone-600">
        <input type="checkbox" checked={showInactive} onChange={(event) => setShowInactive(event.target.checked)} />
        Показати неактивні заняття
      </label>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {activities.filter((act) => showInactive || act.active).map((act) => (
          <div
            key={act.id}
            className={`bg-white rounded-2xl p-5 border transition-all flex flex-col justify-between ${
              act.active
                ? 'border-stone-200 hover:border-orange-300 hover:shadow-md'
                : 'border-stone-200 bg-stone-50/70 opacity-60'
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200/50 flex items-center justify-center flex-shrink-0">
                    {getCategoryIcon(act.category)}
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                      {getCategoryLabel(act.category)}
                    </span>
                    <h3 className="font-bold text-stone-900 text-base leading-snug">
                      {act.name}
                    </h3>
                  </div>
                </div>
              </div>

              {/* Price badge */}
              <div className="my-3 p-3 bg-gradient-to-r from-orange-50/70 to-amber-50/40 rounded-xl border border-orange-200/60 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-stone-500 uppercase block font-medium">
                    Тариф (вартість)
                  </span>
                  <span className="text-xl font-extrabold text-orange-700 font-heading">
                    {formatCurrency(act.price)}
                  </span>
                </div>
                <span className="text-xs font-medium text-orange-800 bg-white px-2.5 py-1 rounded-lg border border-orange-200 shadow-2xs">
                  {act.billingType === 'monthly'
                    ? 'на місяць'
                    : act.billingType === 'per_lesson'
                    ? 'за заняття'
                    : 'за день'}
                </span>
              </div>

              {act.instructor && (
                <p className="text-xs text-stone-600 mb-1 flex items-center gap-1.5">
                  <span className="font-medium text-stone-800">Викладач:</span>{' '}
                  {act.instructor}
                </p>
              )}

              {act.description && (
                <p className="text-xs text-stone-500 mt-2 line-clamp-2 leading-relaxed">
                  {act.description}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 mt-4 border-t border-stone-100">
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                  act.active
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-stone-200 text-stone-600'
                }`}
              >
                {act.active ? 'Активне в табелі' : 'В архіві'}
              </span>

              <div className="flex items-center gap-1">
                <button
                  id={`edit-act-${act.id}`}
                  onClick={() => handleOpenEdit(act)}
                  className="cursor-pointer p-1.5 text-stone-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors"
                  title="Редагувати вартість та інформацію"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  id={`delete-act-${act.id}`}
                  onClick={() => {
                    if (
                      window.confirm(
                        `Видалити заняття «${act.name}»? Якщо за ним є відмітки, краще змінити статус.`
                      )
                    ) {
                      onDeleteActivity(act.id);
                    }
                  }}
                  className="cursor-pointer p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Видалити заняття"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Activity Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-orange-100 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsFormOpen(false)}
              className="cursor-pointer absolute top-4 right-4 p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-stone-900 font-heading">
                  {editingActivity
                    ? 'Редагувати заняття та вартість'
                    : 'Додати нове заняття або послугу'}
                </h3>
                <p className="text-xs text-stone-500">
                  Вкажіть назву та тариф для нарахування в табелі
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Назва заняття / послуги <span className="text-rose-500">*</span>
                </label>
                <input
                  id="act-name-input"
                  type="text"
                  required
                  placeholder="наприклад: Англійська мова для малюків"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                    {billingType === 'per_lesson' ? 'Ціна одного заняття (грн)' : 'Вартість (грн ₴)'} <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="act-price-input"
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={price}
                      onChange={(e) => setPrice(Number(e.target.value))}
                      className="w-full pl-3.5 pr-8 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold text-stone-900 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-hidden"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-stone-500 font-semibold">
                      ₴
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                    Спосіб нарахування
                  </label>
                  <select
                    id="act-billing-type-select"
                    value={billingType}
                    onChange={(e) =>
                      setBillingType(e.target.value as ActivityBillingType)
                    }
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-medium focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-hidden"
                  >
                    <option value="monthly">Фіксовано за місяць — галочка</option>
                    <option value="per_lesson">За кожне заняття — вибір кількості</option>
                    <option value="daily_food">Харчування (за день)</option>
                  </select>
                  {billingType === 'per_lesson' && <p className="mt-2 text-xs text-orange-700">У табелі вводиться кількість замість галочки. Сума = ціна одного заняття × кількість. Нуль прибирає заняття з рахунку.</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                    Категорія
                  </label>
                  <select
                    id="act-category-select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-medium focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-hidden"
                  >
                    <option value="core">Базове перебування / Харчування</option>
                    <option value="languages">Іноземні мови</option>
                    <option value="sport">Спорт і танці</option>
                    <option value="creative">Творчість і мистецтво</option>
                    <option value="development">Розвиток та корекція</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                    Викладач / Інструктор
                  </label>
                  <input
                    id="act-instructor-input"
                    type="text"
                    placeholder="наприклад: Олена Петрівна"
                    value={instructor}
                    onChange={(e) => setInstructor(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Опис заняття або програми
                </label>
                <textarea
                  id="act-desc-input"
                  rows={2}
                  placeholder="Короткий опис для батьків..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="cursor-pointer px-4 py-2 text-sm text-stone-600 hover:text-stone-800 font-medium transition-colors"
                >
                  Скасувати
                </button>
                <button
                  id="save-act-btn"
                  type="submit"
                  className="cursor-pointer px-5 py-2 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white text-sm font-semibold rounded-xl shadow-md transition-all"
                >
                  {editingActivity ? 'Зберегти зміни' : 'Створити заняття'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
