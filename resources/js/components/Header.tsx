import React from 'react';
import {
  CalendarCheck2,
  Users,
  Sparkles,
  FileSpreadsheet,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Receipt,
  Banknote,
  LogOut,
  User,
  Settings,
  CalendarArrowUp,
} from 'lucide-react';
import { MONTH_NAMES_UK } from '../data/initialData';
import { AuthUser } from '../types';

interface HeaderProps {
  currentTab: 'journal' | 'children' | 'activities' | 'employees' | 'expenses' | 'reports' | 'settings' | 'carry-forward';
  onTabChange: (
    tab: 'journal' | 'children' | 'activities' | 'employees' | 'expenses' | 'reports' | 'settings' | 'carry-forward'
  ) => void;
  selectedYear: number;
  selectedMonth: number;
  onMonthChange: (year: number, month: number) => void;
  onExportCSV: () => void;
  onPrint: () => void;
  totalChildren: number;
  totalRevenue: number;
  totalEmployeesCount?: number;
  totalExpensesAmount?: number;
  currentUser?: AuthUser | null;
  monthClosed?: boolean;
  kindergartenName: string;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  selectedYear,
  selectedMonth,
  onMonthChange,
  onExportCSV,
  onPrint,
  totalChildren,
  totalRevenue,
  totalEmployeesCount,
  totalExpensesAmount,
  currentUser,
  monthClosed = false,
  kindergartenName,
  onLogout,
}) => {
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      onMonthChange(selectedYear - 1, 12);
    } else {
      onMonthChange(selectedYear, selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      onMonthChange(selectedYear + 1, 1);
    } else {
      onMonthChange(selectedYear, selectedMonth + 1);
    }
  };

  const canManageFinance = currentUser?.role === 'director' || currentUser?.role === 'accountant';

  return (
    <header className="no-print bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 text-white shadow-lg sticky top-0 z-40">
      {/* Top Kindergarten Info Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 sm:gap-4 border-b border-orange-400/30">
        <div className="flex items-center justify-between gap-2 sm:gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-white flex items-center justify-center shadow-sm shrink-0 overflow-hidden">
              <img src="/images/peppi/frame-1.png" alt="Пеппі — дитячий простір" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-[10px] sm:text-xs font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-white/20 text-orange-50">
                  Бухгалтерія
                </span>
                <span className="text-[11px] sm:text-xs text-orange-100 truncate max-w-[170px] sm:max-w-none">
                  {kindergartenName}
                </span>
              </div>
              <h1 className="text-sm sm:text-lg md:text-xl font-bold font-heading tracking-tight text-white leading-tight">
                Облік дітей та занять
              </h1>
            </div>
          </div>

          {/* User profile on mobile (right side of title bar) */}
          {currentUser && (
            <div className="flex items-center gap-1.5 md:hidden">
              <div
                className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-xs font-bold text-white uppercase border border-white/20"
                title={`${currentUser.name} (${currentUser.roleNameUk})`}
              >
                {currentUser.name.slice(0, 1)}
              </div>
              <button
                onClick={onLogout}
                className="p-1.5 bg-white/15 active:bg-rose-600 text-white rounded-lg border border-white/20 transition-all"
                title="Вийти"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Month Selector & Quick Actions */}
        <div className="flex items-center justify-between sm:justify-end gap-2 w-full md:w-auto overflow-x-auto no-scrollbar">
          {/* Month Navigator */}
          <div className="inline-flex items-center bg-black/15 backdrop-blur-md rounded-xl p-0.5 sm:p-1 border border-white/20 shadow-sm shrink-0">
            <button
              id="prev-month-btn"
              onClick={handlePrevMonth}
              title="Попередній місяць"
              className="p-2 sm:p-1.5 rounded-lg hover:bg-white/20 active:bg-white/30 text-white transition-colors cursor-pointer touch-manipulation min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-2 sm:px-3 text-xs sm:text-sm font-semibold tracking-wide flex items-center gap-1 min-w-[110px] sm:min-w-[130px] justify-center select-none">
              <span>{MONTH_NAMES_UK[selectedMonth - 1]}</span>
              <span className="text-orange-200 font-normal">{selectedYear}</span>
              {monthClosed && <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-orange-700">Закрито</span>}
            </div>
            <button
              id="next-month-btn"
              onClick={handleNextMonth}
              title="Наступний місяць"
              className="p-2 sm:p-1.5 rounded-lg hover:bg-white/20 active:bg-white/30 text-white transition-colors cursor-pointer touch-manipulation min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Exports */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              id="export-csv-btn"
              onClick={onExportCSV}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 bg-white/15 hover:bg-white/25 active:bg-white/30 text-white text-xs font-medium rounded-xl border border-white/20 transition-all cursor-pointer shadow-sm touch-manipulation min-h-[36px]"
              title="Експорт відомості у CSV (Excel)"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">CSV</span>
            </button>

            <button
              id="print-journal-btn"
              onClick={onPrint}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 bg-white text-orange-700 hover:bg-orange-50 active:bg-orange-100 text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-sm touch-manipulation min-h-[36px]"
              title="Роздрукувати табель"
            >
              <Printer className="w-3.5 h-3.5 text-orange-600" />
              <span>Друк</span>
            </button>
          </div>

          {/* User Profile & Logout on Tablet/Desktop */}
          {currentUser && (
            <div className="hidden md:flex items-center gap-2 pl-2 border-l border-white/20 shrink-0">
              <div
                className="hidden lg:flex items-center gap-2 bg-black/15 px-2.5 py-1 rounded-xl border border-white/10"
                title={`${currentUser.name} (${currentUser.email})`}
              >
                <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center text-[10px] font-bold text-white uppercase">
                  {currentUser.name.slice(0, 1)}
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-white leading-tight truncate max-w-[120px]">
                    {currentUser.name.split(' ')[0]}
                  </div>
                  <div className="text-[10px] text-orange-200 leading-none">
                    {currentUser.roleNameUk}
                  </div>
                </div>
              </div>

              <button
                id="logout-btn"
                onClick={onLogout}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white/15 hover:bg-rose-600 active:bg-rose-700 text-white text-xs font-medium rounded-xl border border-white/20 transition-all cursor-pointer shadow-sm min-h-[36px]"
                title="Вийти з облікового запису"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Вихід</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto py-1.5 sm:py-2 no-scrollbar touch-pan-x scroll-smooth">
          <button
            id="tab-journal"
            onClick={() => onTabChange('journal')}
            className={`cursor-pointer inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-medium rounded-xl transition-all whitespace-nowrap touch-manipulation min-h-[40px] shrink-0 ${
              currentTab === 'journal'
                ? 'bg-white text-orange-700 shadow-md font-semibold'
                : 'text-orange-100 hover:bg-white/10 hover:text-white'
            }`}
          >
            <CalendarCheck2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Табель<span className="hidden md:inline"> відвідування (Галочки)</span></span>
            <span
              className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full ${
                currentTab === 'journal'
                  ? 'bg-orange-100 text-orange-700 font-bold'
                  : 'bg-black/20 text-orange-100'
              }`}
            >
              {totalChildren}
            </span>
          </button>

          {canManageFinance && <button id="tab-carry-forward" onClick={() => onTabChange('carry-forward')}
            className={`cursor-pointer inline-flex min-h-[40px] shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold transition-all sm:px-3.5 sm:text-sm ${currentTab === 'carry-forward' ? 'bg-white text-orange-700 shadow-md' : 'text-orange-100 hover:bg-white/10 hover:text-white'}`}>
            <CalendarArrowUp className="h-4 w-4" /><span>Перенесення табеля</span>
          </button>}

          <button
            id="tab-children"
            onClick={() => onTabChange('children')}
            className={`cursor-pointer inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-medium rounded-xl transition-all whitespace-nowrap touch-manipulation min-h-[40px] shrink-0 ${
              currentTab === 'children'
                ? 'bg-white text-orange-700 shadow-md font-semibold'
                : 'text-orange-100 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Діти<span className="hidden sm:inline"> та групи</span></span>
          </button>

          <button
            id="tab-activities"
            onClick={() => onTabChange('activities')}
            className={`cursor-pointer inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-medium rounded-xl transition-all whitespace-nowrap touch-manipulation min-h-[40px] shrink-0 ${
              currentTab === 'activities'
                ? 'bg-white text-orange-700 shadow-md font-semibold'
                : 'text-orange-100 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Заняття<span className="hidden sm:inline"> та вартість</span></span>
          </button>

          {canManageFinance && (
            <>
              <button
            id="tab-employees"
            onClick={() => onTabChange('employees')}
            className={`cursor-pointer inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-medium rounded-xl transition-all whitespace-nowrap touch-manipulation min-h-[40px] shrink-0 ${
              currentTab === 'employees'
                ? 'bg-white text-orange-700 shadow-md font-semibold'
                : 'text-orange-100 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Banknote className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Зарплата<span className="hidden md:inline"> працівників</span></span>
            {totalEmployeesCount !== undefined && totalEmployeesCount > 0 && (
              <span
                className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full ${
                  currentTab === 'employees'
                    ? 'bg-orange-100 text-orange-700 font-bold'
                    : 'bg-black/20 text-orange-100'
                }`}
              >
                {totalEmployeesCount}
              </span>
            )}
          </button>

          <button
            id="tab-expenses"
            onClick={() => onTabChange('expenses')}
            className={`cursor-pointer inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-medium rounded-xl transition-all whitespace-nowrap touch-manipulation min-h-[40px] shrink-0 ${
              currentTab === 'expenses'
                ? 'bg-white text-orange-700 shadow-md font-semibold'
                : 'text-orange-100 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Витрати<span className="hidden md:inline"> (Харчування, сміття)</span></span>
          </button>

          <button
            id="tab-reports"
            onClick={() => onTabChange('reports')}
            className={`cursor-pointer inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-medium rounded-xl transition-all whitespace-nowrap touch-manipulation min-h-[40px] shrink-0 ${
              currentTab === 'reports'
                ? 'bg-white text-orange-700 shadow-md font-semibold'
                : 'text-orange-100 hover:bg-white/10 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Каса / Звіти</span>
          </button>
          <button
            id="tab-settings"
            onClick={() => onTabChange('settings')}
            className={`cursor-pointer inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 text-xs sm:text-sm font-medium rounded-xl transition-all whitespace-nowrap touch-manipulation min-h-[40px] shrink-0 ${currentTab === 'settings' ? 'bg-white text-orange-700 shadow-md font-semibold' : 'text-orange-100 hover:bg-white/10 hover:text-white'}`}
          >
            <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Налаштування</span>
          </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};
