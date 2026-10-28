import React, { useState } from 'react';
import {
  X,
  Calendar,
  Stethoscope,
  UserX,
  Coins,
  FileText,
  Save,
  Trash2,
  AlertCircle,
  HelpCircle,
  ArrowDown,
  CheckCircle2,
} from 'lucide-react';
import { Child, MonthlyRecord } from '../types';
import { formatCurrency } from '../utils/calculations';
import { MONTH_NAMES_UK } from '../data/initialData';

interface AbsenceDeductionModalProps {
  child: Child;
  record?: MonthlyRecord;
  selectedYear: number;
  selectedMonth: number;
  defaultDailyRate: number;
  onSave: (childId: string, data: {
    sickLeaveDays: number;
    absenceDays: number;
    dailyFoodDeductionRate: number;
    customDeduction: number;
    absenceNote: string;
  }) => Promise<void>;
  onClose: () => void;
}

export const AbsenceDeductionModal: React.FC<AbsenceDeductionModalProps> = ({
  child,
  record,
  selectedYear,
  selectedMonth,
  defaultDailyRate,
  onSave,
  onClose,
}) => {
  const [sickLeaveDays, setSickLeaveDays] = useState<number>(
    record?.sickLeaveDays ?? 0
  );
  const [absenceDays, setAbsenceDays] = useState<number>(
    record?.absenceDays ?? 0
  );
  const [dailyRate, setDailyRate] = useState<number>(
    record?.dailyFoodDeductionRate ?? defaultDailyRate
  );
  const [customDeduction, setCustomDeduction] = useState<number>(
    record?.customDeduction ?? 0
  );
  const [absenceNote, setAbsenceNote] = useState<string>(
    record?.absenceNote ?? ''
  );
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  // Quick preset days buttons
  const addDays = (setter: React.Dispatch<React.SetStateAction<number>>, current: number, delta: number) => {
    setter(Math.max(0, current + delta));
  };

  const sickLeaveAmount = sickLeaveDays * dailyRate;
  const absenceAmount = absenceDays * dailyRate;
  const totalDeductionAmount = sickLeaveAmount + absenceAmount + (customDeduction || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError('');
    setSaving(true);
    try {
      await onSave(child.id, {
        sickLeaveDays: Math.max(0, Number(sickLeaveDays) || 0),
        absenceDays: Math.max(0, Number(absenceDays) || 0),
        dailyFoodDeductionRate: Math.max(0, Number(dailyRate) || 0),
        customDeduction: Math.max(0, Number(customDeduction) || 0),
        absenceNote: absenceNote.trim(),
      });
      onClose();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Не вдалося зберегти пропуски.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSickLeaveDays(0);
    setAbsenceDays(0);
    setCustomDeduction(0);
    setAbsenceNote('');
  };

  const monthName = MONTH_NAMES_UK[selectedMonth - 1];

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-orange-100 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-white backdrop-blur-xs border border-white/20">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-medium text-orange-100 uppercase tracking-wider">
                Перерахунок за відсутність дитини
              </div>
              <h3 className="text-lg font-bold text-white font-heading leading-tight">
                {child.fullName}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Context pill */}
          <div className="flex items-center justify-between bg-orange-50/80 border border-orange-100 rounded-2xl px-4 py-2.5 text-xs text-orange-900">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-orange-600" />
              <span>
                Період: <b>{monthName} {selectedYear} року</b> • Група: <b>{child.group}</b>
              </span>
            </div>
            <span className="text-[11px] text-stone-500">
              Базова ставка харчування: <b>{defaultDailyRate} ₴/день</b>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 1. Sick leave days */}
            <div className="bg-stone-50/70 p-4 rounded-2xl border border-stone-200/80">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                  <Stethoscope className="w-4 h-4 text-emerald-600" />
                  <span>Лікарняні (довідка)</span>
                </label>
                <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  -{formatCurrency(sickLeaveAmount)}
                </span>
              </div>
              <p className="text-[11px] text-stone-500 mb-2.5">
                Дні хвороби, підтверджені меддовідкою лікаря
              </p>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={31}
                  value={sickLeaveDays}
                  onChange={(e) => setSickLeaveDays(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-20 px-3 py-2 text-center text-sm font-bold bg-white border border-stone-300 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-orange-500 focus:outline-hidden"
                />
                <span className="text-xs text-stone-600 font-medium">днів</span>

                <div className="flex items-center gap-1 ml-auto">
                  <button
                    type="button"
                    onClick={() => addDays(setSickLeaveDays, sickLeaveDays, 1)}
                    className="px-2 py-1 text-xs font-semibold bg-white hover:bg-stone-100 border border-stone-200 rounded-lg text-stone-700 cursor-pointer"
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    onClick={() => addDays(setSickLeaveDays, sickLeaveDays, 5)}
                    className="px-2 py-1 text-xs font-semibold bg-white hover:bg-stone-100 border border-stone-200 rounded-lg text-stone-700 cursor-pointer"
                  >
                    +5
                  </button>
                </div>
              </div>
            </div>

            {/* 2. Absence days without sick leave */}
            <div className="bg-stone-50/70 p-4 rounded-2xl border border-stone-200/80">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                  <UserX className="w-4 h-4 text-amber-600" />
                  <span>Відсутність (за заявою)</span>
                </label>
                <span className="text-[11px] text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  -{formatCurrency(absenceAmount)}
                </span>
              </div>
              <p className="text-[11px] text-stone-500 mb-2.5">
                Пропуски за сімейними обставинами / заявою батьків
              </p>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={31}
                  value={absenceDays}
                  onChange={(e) => setAbsenceDays(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="w-20 px-3 py-2 text-center text-sm font-bold bg-white border border-stone-300 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-orange-500 focus:outline-hidden"
                />
                <span className="text-xs text-stone-600 font-medium">днів</span>

                <div className="flex items-center gap-1 ml-auto">
                  <button
                    type="button"
                    onClick={() => addDays(setAbsenceDays, absenceDays, 1)}
                    className="px-2 py-1 text-xs font-semibold bg-white hover:bg-stone-100 border border-stone-200 rounded-lg text-stone-700 cursor-pointer"
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    onClick={() => addDays(setAbsenceDays, absenceDays, 3)}
                    className="px-2 py-1 text-xs font-semibold bg-white hover:bg-stone-100 border border-stone-200 rounded-lg text-stone-700 cursor-pointer"
                  >
                    +3
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Daily Rate & Custom Deduction */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Тариф компенсації харчування за 1 день
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={dailyRate}
                  onChange={(e) => setDailyRate(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full px-3 py-2 text-xs font-semibold bg-white border border-stone-300 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-orange-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-500 font-medium">
                  грн / день
                </span>
              </div>
              <p className="text-[10px] text-stone-400 mt-1">
                Сума, яка списується з харчування за кожен пропущений день
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Додаткове разове списання / коригування (грн)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={customDeduction}
                  onChange={(e) => setCustomDeduction(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="0"
                  className="w-full px-3 py-2 text-xs font-semibold bg-white border border-stone-300 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-orange-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-500 font-medium">
                  ₴
                </span>
              </div>
              <p className="text-[10px] text-stone-400 mt-1">
                Наприклад, переплата за минулий місяць або скасоване заняття
              </p>
            </div>
          </div>

          {/* Notes for record / doctor certificate */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-stone-400" />
              <span>Номер довідки / підстава відсутності</span>
            </label>
            <input
              type="text"
              placeholder="наприклад: Меддовідка №45/12 від лікаря педіатра з 10.09 по 15.09"
              value={absenceNote}
              onChange={(e) => setAbsenceNote(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-orange-500 text-stone-800"
            />
          </div>

          {/* Calculation summary banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <ArrowDown className="w-4 h-4 text-emerald-600" />
                <span>Загалом буде відраховано з квитанції:</span>
              </div>
              <div className="text-[11px] text-emerald-800 mt-0.5">
                {sickLeaveDays + absenceDays > 0 ? (
                  <>
                    {sickLeaveDays > 0 && `${sickLeaveDays} дн. лікарн.`}
                    {sickLeaveDays > 0 && absenceDays > 0 && ' + '}
                    {absenceDays > 0 && `${absenceDays} дн. пропусків`}
                    {` × ${dailyRate} ₴/день`}
                    {customDeduction > 0 && ` + ${customDeduction} ₴ коригування`}
                  </>
                ) : (
                  'Пропусків не зафіксовано'
                )}
              </div>
            </div>

            <div className="text-right">
              <div className="text-lg font-extrabold text-emerald-700">
                -{formatCurrency(totalDeductionAmount)}
              </div>
              <div className="text-[10px] text-emerald-600 font-medium">зняття з оплати</div>
            </div>
          </div>

          {/* Actions */}
          {saveError && <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{saveError}</p>}
          <div className="flex items-center justify-between pt-2 border-t border-stone-200">
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-stone-500 hover:text-rose-600 flex items-center gap-1 px-3 py-2 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Очистити пропуски</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
              >
                Скасувати
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 active:scale-98 rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Зберігаємо…' : 'Зберегти перерахунок'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
