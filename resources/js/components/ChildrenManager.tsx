import React, { useEffect, useState } from 'react';
import {
  UserPlus,
  Search,
  Filter,
  Pencil,
  Trash2,
  Phone,
  Calendar,
  Tag,
  ShieldCheck,
  Baby,
  X,
  Check,
  History,
  UsersRound,
  Send,
} from 'lucide-react';
import { Child, Group } from '../types';

interface ChildrenManagerProps {
  childrenList: Child[];
  groups: string[];
  groupDetails: Group[];
  onUpdateGroup: (group: Group) => Promise<void>;
  onAddGroup: (name: string, sortOrder: number) => Promise<void>;
  onDeleteGroup: (id: string) => Promise<void>;
  canEditGroups: boolean;
  onAddChild: (newChild: Omit<Child, 'id'>) => void;
  onUpdateChild: (child: Child) => void;
  onDeleteChild: (childId: string) => void;
  onOpenAccount?: (child: Child) => void;
}

export const ChildrenManager: React.FC<ChildrenManagerProps> = ({
  childrenList,
  groups,
  groupDetails,
  onUpdateGroup,
  onAddGroup,
  onDeleteGroup,
  canEditGroups,
  onAddChild,
  onUpdateChild,
  onDeleteChild,
  onOpenAccount,
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [filterGroup, setFilterGroup] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [groupFormOpen, setGroupFormOpen] = useState(false);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  const [groupListError, setGroupListError] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupOrder, setGroupOrder] = useState(0);
  const [groupSaving, setGroupSaving] = useState(false);
  const [groupError, setGroupError] = useState('');
  const [messageOpen, setMessageOpen] = useState(false);
  const [messageText, setMessageText] = useState('Шановні батьки! Повідомляємо вам: ');

  useEffect(() => {
    if (filterGroup !== 'all' && !groupDetails.some((item) => item.name === filterGroup)) {
      setFilterGroup('all');
    }
  }, [filterGroup, groupDetails]);

  const openGroupEditor = (item: Group) => {
    setEditingGroup(item);
    setGroupFormOpen(true);
    setGroupName(item.name);
    setGroupOrder(item.sortOrder ?? 0);
    setGroupError('');
  };

  const openNewGroup = () => {
    setEditingGroup(null);
    setGroupFormOpen(true);
    setGroupName('');
    setGroupOrder(Math.max(0, ...groupDetails.map((item) => item.sortOrder ?? 0)) + 1);
    setGroupError('');
  };

  const deleteGroup = async (item: Group) => {
    if ((item.childCount ?? 0) > 0 || deletingGroupId) return;
    if (!window.confirm(`Видалити порожню групу «${item.name}»?`)) return;
    setDeletingGroupId(item.id);
    setGroupListError('');
    try {
      await onDeleteGroup(item.id);
    } catch (error) {
      setGroupListError(error instanceof Error ? error.message : 'Не вдалося видалити групу.');
    } finally {
      setDeletingGroupId(null);
    }
  };

  const saveGroup = async (event: React.FormEvent) => {
    event.preventDefault();
    if (groupSaving) return;
    const name = groupName.trim();
    if (!name) {
      setGroupError('Вкажіть назву групи.');
      return;
    }
    if (groupDetails.some((item) => item.id !== editingGroup?.id && item.name.toLocaleLowerCase('uk') === name.toLocaleLowerCase('uk'))) {
      setGroupError('Група з такою назвою вже існує.');
      return;
    }
    setGroupSaving(true);
    setGroupError('');
    try {
      if (editingGroup) {
        await onUpdateGroup({ ...editingGroup, name, sortOrder: groupOrder });
      } else {
        await onAddGroup(name, groupOrder);
      }
      setGroupFormOpen(false);
    } catch (error) {
      setGroupError(error instanceof Error ? error.message : 'Не вдалося зберегти групу.');
    } finally {
      setGroupSaving(false);
    }
  };

  // Form State
  const [fullName, setFullName] = useState('');
  const [group, setGroup] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [notes, setNotes] = useState('');

  const handleOpenAdd = () => {
    setEditingChild(null);
    setFullName('');
    setGroup(groups[0] || '');
    setBirthDate('');
    setParentName('');
    setParentPhone('');
    setDiscountPercent(0);
    setNotes('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (child: Child) => {
    setEditingChild(child);
    setFullName(child.fullName);
    setGroup(child.group);
    setBirthDate(child.birthDate || '');
    setParentName(child.parentName);
    setParentPhone(child.parentPhone);
    setDiscountPercent(child.discountPercent || 0);
    setNotes(child.notes || '');
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    if (editingChild) {
      onUpdateChild({
        ...editingChild,
        fullName: fullName.trim(),
        group,
        birthDate,
        parentName: parentName.trim(),
        parentPhone: parentPhone.trim(),
        discountPercent: Number(discountPercent) || 0,
        notes: notes.trim(),
      });
    } else {
      onAddChild({
        fullName: fullName.trim(),
        group,
        birthDate,
        parentName: parentName.trim(),
        parentPhone: parentPhone.trim(),
        discountPercent: Number(discountPercent) || 0,
        notes: notes.trim(),
        active: true,
      });
    }
    setIsFormOpen(false);
  };

  const filteredChildren = childrenList.filter((child) => {
    const matchesGroup = filterGroup === 'all' || child.group === filterGroup;
    const matchesSearch =
      child.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      child.parentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      child.parentPhone.includes(searchQuery);
    return matchesGroup && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header with Add Button and summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-orange-100 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-stone-900 font-heading">
            Список вихованців дитячого садка
          </h2>
          <p className="text-sm text-stone-500 mt-1">
            Додавання нових дітей, керування групами, контактними даними батьків та пільгами
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMessageOpen(true)}
            className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-violet-200 hover:bg-violet-50 text-violet-800 font-semibold text-sm rounded-xl transition-colors"
          >
            <Send className="w-4 h-4" />
            <span>Повідомлення у Viber</span>
          </button>
          {canEditGroups && (
            <button
              id="manage-groups-button"
              type="button"
              onClick={() => document.getElementById('group-management')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-orange-200 hover:bg-orange-50 text-orange-800 font-semibold text-sm rounded-xl transition-colors"
            >
              <UsersRound className="w-4 h-4" />
              <span>Редагувати групи</span>
            </button>
          )}
          <button
            id="add-child-button"
            onClick={handleOpenAdd}
            className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-semibold text-sm rounded-xl shadow-md transition-all active:scale-[0.98]"
          >
            <UserPlus className="w-4 h-4" />
            <span>Додати дитину</span>
          </button>
        </div>
      </div>

      {messageOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setMessageOpen(false); }}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="viber-message-title">
            <div className="flex items-start justify-between gap-4">
              <h3 id="viber-message-title" className="text-lg font-bold text-stone-900">Повідомлення у Viber</h3>
              <button type="button" aria-label="Закрити" onClick={() => setMessageOpen(false)} className="text-stone-500 hover:text-stone-900"><X className="h-5 w-5" /></button>
            </div>
            <p className="mt-2 text-sm text-stone-600">Напишіть шаблон. Після відкриття Viber виберіть потрібних батьків у списку контактів і підтвердьте надсилання.</p>
            <label htmlFor="viber-message-text" className="mt-5 block text-sm font-semibold text-stone-800">Текст повідомлення</label>
            <textarea
              id="viber-message-text"
              value={messageText}
              onChange={(event) => setMessageText(event.target.value)}
              maxLength={200}
              rows={5}
              className="mt-2 w-full rounded-xl border border-stone-300 p-3 text-sm focus:border-violet-500 focus:outline-none"
            />
            <p className="mt-1 text-right text-xs text-stone-500">{messageText.length}/200 символів</p>
            <a
              href={messageText.trim() ? `viber://forward?text=${encodeURIComponent(messageText.trim())}` : undefined}
              onClick={(event) => { if (!messageText.trim()) event.preventDefault(); }}
              className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold text-white ${messageText.trim() ? 'bg-violet-700 hover:bg-violet-800' : 'cursor-not-allowed bg-stone-400'}`}
            >
              <Send className="h-4 w-4" /> Відкрити Viber для надсилання
            </a>
            <p className="mt-3 text-xs text-stone-500">Потрібен встановлений Viber. Сайт не надсилає повідомлення самостійно й не отримує підтвердження доставки.</p>
          </div>
        </div>
      )}

      {canEditGroups && (
        <section id="group-management" className="bg-white p-5 rounded-2xl border border-orange-100 shadow-xs scroll-mt-6">
          <div className="flex items-center justify-between gap-3 mb-1">
            <h3 className="font-bold text-stone-900">Групи</h3>
            <button id="add-group-button" type="button" onClick={openNewGroup} className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-xl">
              <UsersRound className="w-4 h-4" /> Додати групу
            </button>
          </div>
          <p className="text-sm text-stone-500 mb-4">Можна видалити лише порожню групу. Групи з дітьми залишаються в обліку.</p>
          {groupListError && <p role="alert" className="text-sm text-rose-700 mb-3">{groupListError}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {groupDetails.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 border border-stone-200 rounded-xl px-3 py-2.5">
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-stone-800 truncate">{item.name}</div>
                  <div className="text-xs text-stone-500">Порядок: {item.sortOrder ?? 0} · Дітей: {item.childCount ?? 0}{!item.active ? ' · Неактивна' : ''}</div>
                </div>
                <div className="flex shrink-0 items-center">
                  <button type="button" id={`edit-group-${item.id}`} onClick={() => openGroupEditor(item)} className="cursor-pointer p-2 text-orange-700 hover:bg-orange-50 rounded-lg" aria-label={`Редагувати групу ${item.name}`}><Pencil className="w-4 h-4" /></button>
                  <button type="button" id={`delete-group-${item.id}`} onClick={() => void deleteGroup(item)} disabled={(item.childCount ?? 0) > 0 || deletingGroupId !== null} title={(item.childCount ?? 0) > 0 ? 'Не можна видалити групу, в якій є діти' : 'Видалити порожню групу'} className="cursor-pointer p-2 text-rose-600 hover:bg-rose-50 rounded-lg disabled:opacity-35 disabled:cursor-not-allowed" aria-label={`Видалити групу ${item.name}`}><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Filters & Search */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-4 relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="search-child-registry"
            type="text"
            placeholder="Пошук за ПІБ дитини, батьків або телефоном..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-hidden"
          />
        </div>

        <div className="md:col-span-3">
          <select
            id="filter-child-group"
            value={filterGroup}
            onChange={(e) => setFilterGroup(e.target.value)}
            className="w-full px-3 py-2.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-800 font-medium focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-hidden"
          >
            <option value="all">Усі групи ({childrenList.length})</option>
            {groupDetails.map((item) => (
              <option key={item.id} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-5 flex items-center justify-end gap-2 text-xs text-stone-500">
          <span className="font-semibold text-orange-700 bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200">
            Знайдено: {filteredChildren.length}
          </span>
          <span className="bg-stone-100 px-2.5 py-1 rounded-lg">
            З пільгами: {childrenList.filter((c) => (c.discountPercent || 0) > 0).length}
          </span>
        </div>
      </div>

      {/* Children Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredChildren.map((child) => (
          <div
            key={child.id}
            className="bg-white rounded-2xl p-5 border border-stone-200 hover:border-orange-300 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-sm">
                    {child.fullName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-stone-900 text-base leading-tight">
                      {child.fullName}
                    </h3>
                    <span className="inline-block text-xs font-semibold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200/60 mt-0.5">
                      {child.group}
                    </span>
                  </div>
                </div>
                {child.discountPercent ? (
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                    -{child.discountPercent}%
                  </span>
                ) : null}
              </div>

              <div className="space-y-1.5 text-xs text-stone-600 mt-4 border-t border-stone-100 pt-3">
                {child.birthDate && (
                  <div className="flex items-center gap-2 text-stone-500">
                    <Calendar className="w-3.5 h-3.5 text-stone-400" />
                    <span>Дата нар.: {child.birthDate}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Baby className="w-3.5 h-3.5 text-stone-400" />
                  <span className="font-medium">Батьки: {child.parentName || 'Не вказано'}</span>
                </div>
                {child.parentPhone && (
                  <div className="flex items-center gap-2 text-stone-600">
                    <Phone className="w-3.5 h-3.5 text-orange-500" />
                    <a
                      href={`tel:${child.parentPhone}`}
                      className="hover:underline text-orange-800 font-medium"
                    >
                      {child.parentPhone}
                    </a>
                  </div>
                )}
                {child.notes && (
                  <div className="p-2 bg-amber-50/70 border border-amber-200/50 rounded-lg text-amber-900 mt-2 text-[11px]">
                    {child.notes}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-stone-100">
              {onOpenAccount && (
                <button
                  type="button"
                  onClick={() => onOpenAccount(child)}
                  className="cursor-pointer inline-flex items-center gap-1 text-xs px-2.5 py-1.5 text-blue-700 hover:bg-blue-50 rounded-lg transition-colors font-medium"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Історія</span>
                </button>
              )}
              <button
                id={`edit-child-${child.id}`}
                onClick={() => handleOpenEdit(child)}
                className="cursor-pointer inline-flex items-center gap-1 text-xs px-2.5 py-1.5 text-stone-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors font-medium"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Редагувати</span>
              </button>
              <button
                id={`delete-child-${child.id}`}
                onClick={() => {
                  if (
                    window.confirm(
                      `Ви впевнені, що хочете видалити вихованця «${child.fullName}»?`
                    )
                  ) {
                    onDeleteChild(child.id);
                  }
                }}
                className="cursor-pointer inline-flex items-center gap-1 text-xs px-2.5 py-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Видалити</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Dialog for Add/Edit Child */}
      {groupFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-orange-100">
            <div className="flex items-center justify-between gap-3 mb-5">
              <h3 className="text-lg font-bold text-stone-900 font-heading">{editingGroup ? 'Редагувати групу' : 'Додати групу'}</h3>
              <button type="button" onClick={() => setGroupFormOpen(false)} disabled={groupSaving} className="cursor-pointer p-1.5 text-stone-400 hover:text-stone-700 rounded-lg" aria-label="Закрити"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={saveGroup} className="space-y-4">
              <div>
                <label htmlFor="group-name-input" className="block text-sm font-semibold text-stone-700 mb-1">Назва групи</label>
                <input id="group-name-input" autoFocus required maxLength={255} value={groupName} onChange={(event) => setGroupName(event.target.value)} className="w-full px-3.5 py-2.5 border border-stone-200 rounded-xl text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-hidden" />
              </div>
              <div>
                <label htmlFor="group-order-input" className="block text-sm font-semibold text-stone-700 mb-1">Порядок у списку</label>
                <input id="group-order-input" type="number" min="0" step="1" required value={groupOrder} onChange={(event) => setGroupOrder(Number(event.target.value))} className="w-full px-3.5 py-2.5 border border-stone-200 rounded-xl text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-hidden" />
              </div>
              {groupError && <p role="alert" className="text-sm text-rose-700">{groupError}</p>}
              <div className="flex justify-end gap-3 pt-3 border-t border-stone-100">
                <button type="button" onClick={() => setGroupFormOpen(false)} disabled={groupSaving} className="cursor-pointer px-4 py-2 text-sm text-stone-600 font-medium">Скасувати</button>
                <button id="save-group-button" type="submit" disabled={groupSaving} className="cursor-pointer px-5 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl">{groupSaving ? 'Збереження…' : editingGroup ? 'Зберегти зміни' : 'Додати групу'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                <Baby className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-stone-900 font-heading">
                  {editingChild ? 'Редагувати дані дитини' : 'Додати нову дитину'}
                </h3>
                <p className="text-xs text-stone-500">
                  Заповніть інформацію для бухгалтерського обліку
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  ПІБ Дитини <span className="text-rose-500">*</span>
                </label>
                <input
                  id="child-fullname-input"
                  type="text"
                  required
                  placeholder="наприклад: Шевченко Дарина Олександрівна"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                    Група в садку
                  </label>
                  <select
                    id="child-group-select"
                    value={group}
                    onChange={(e) => setGroup(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-medium focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-hidden"
                  >
                    {groups.map((grp) => (
                      <option key={grp} value={grp}>
                        {grp}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                    Дата народження
                  </label>
                  <input
                    id="child-birthdate-input"
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                    ПІБ одного з батьків
                  </label>
                  <input
                    id="child-parentname-input"
                    type="text"
                    placeholder="наприклад: Шевченко Олена М."
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                    Контактний телефон
                  </label>
                  <input
                    id="child-parentphone-input"
                    type="tel"
                    placeholder="+380 67 000 00 00"
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Пільга / Знижка на абонемент (%)
                </label>
                <div className="flex items-center gap-2">
                  {[0, 10, 20, 50, 100].map((pct) => (
                    <button
                      type="button"
                      key={pct}
                      onClick={() => setDiscountPercent(pct)}
                      className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        discountPercent === pct
                          ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {pct === 0 ? 'Без знижки' : `-${pct}%`}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Примітки, алергії або пільгова категорія
                </label>
                <textarea
                  id="child-notes-input"
                  rows={2}
                  placeholder="наприклад: Алергія на арахіс; Багатодітна родина..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
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
                  id="save-child-button"
                  type="submit"
                  className="cursor-pointer px-5 py-2 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white text-sm font-semibold rounded-xl shadow-md transition-all"
                >
                  {editingChild ? 'Зберегти зміни' : 'Додати вихованця'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
