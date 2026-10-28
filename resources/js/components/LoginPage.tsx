import React, { useState } from 'react';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  Building,
  UserCheck,
  Check,
  Sparkles,
  ArrowRight,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { KindergartenInfo } from '../types';

interface LoginPageProps {
  onLogin: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  kindergartenInfo: KindergartenInfo;
}

export const PRESET_ACCOUNTS: {
  email: string;
  name: string;
  role: 'accountant' | 'director' | 'educator';
  roleNameUk: string;
  avatarBg: string;
  defaultPass: string;
  desc: string;
}[] = [
  {
    email: 'accountant@kindergarten.ua',
    name: 'Шевченко Оксана Миколаївна',
    role: 'accountant',
    roleNameUk: 'Головний бухгалтер',
    avatarBg: 'bg-orange-500 text-white',
    defaultPass: 'buh12345',
    desc: 'Повний доступ до каси, оплат, розтрат та зарплатного фонду',
  },
  {
    email: 'director@kindergarten.ua',
    name: 'Ковальчук Тетяна Володимирівна',
    role: 'director',
    roleNameUk: 'Завідувач закладу',
    avatarBg: 'bg-amber-600 text-white',
    defaultPass: 'admin123',
    desc: 'Загальний нагляд, штат працівників, звіти та затвердження виплат',
  },
  {
    email: 'educator@kindergarten.ua',
    name: 'Петренко Олена Петрівна',
    role: 'educator',
    roleNameUk: 'Старший вихователь',
    avatarBg: 'bg-emerald-600 text-white',
    defaultPass: 'sadok123',
    desc: 'Заповнення табеля відвідування з галочками та список груп',
  },
];

const SHOW_DEMO_ACCOUNTS = false;

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, kindergartenInfo }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Будь ласка, введіть електронну пошту та пароль');
      return;
    }

    setIsLoading(true);
    try {
      await onLogin(email.trim(), password, rememberMe);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Не вдалося увійти в систему');
    } finally {
      setIsLoading(false);
    }
  };


  const handleSelectPreset = (preset: (typeof PRESET_ACCOUNTS)[0]) => {
    setEmail(preset.email);
    setPassword(preset.defaultPass);
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen bg-[#FFFDF9] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decorative Warm Blobs */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-orange-200/50 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-amber-200/50 rounded-full blur-3xl pointer-events-none" />

      {/* Kindergarten Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <img src="/images/peppi/frame-1.png" alt="Пеппі — дитячий простір" className="block w-40 h-40 sm:w-48 sm:h-48 object-contain mx-auto mb-4" />
        <div className="inline-block px-3 py-1 bg-orange-100/90 text-orange-800 text-xs font-bold rounded-full mb-2 border border-orange-200 uppercase tracking-wider">
          Закрита бухгалтерська система
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight font-heading">
          {kindergartenInfo.name}
        </h1>
        <p className="mt-1 text-xs text-stone-600 max-w-sm mx-auto">
          Авторизація для бухгалтерів, вихователів та адміністрації дошкільного закладу
        </p>
      </div>

      {/* Main Login Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-2xl shadow-orange-950/5 rounded-3xl border border-orange-100 relative">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4 mb-6">
            <div className="flex items-center gap-2 text-stone-800 font-bold text-sm">
              <ShieldCheck className="w-4 h-4 text-orange-600" />
              <span>Вхід у систему обліку</span>
            </div>
            {kindergartenInfo.edrpou && <span className="text-[11px] text-stone-600 font-mono">ЄДРПОУ {kindergartenInfo.edrpou}</span>}
          </div>

          {errorMsg && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-700 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="font-medium">{errorMsg}</div>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-bold text-stone-700 mb-1"
              >
                Електронна пошта або логін
              </label>
              <div className="relative rounded-2xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="login-email"
                  type="email"
                  required
                  placeholder="наприклад: accountant@kindergarten.ua"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 bg-stone-50/50 text-stone-900 font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-bold text-stone-700"
                >
                  Пароль доступу
                </label>
                <span className="text-[11px] text-orange-600 hover:text-orange-700 cursor-pointer">
                  Забули пароль?
                </span>
              </div>
              <div className="relative rounded-2xl shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Введіть ваш пароль"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2.5 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 bg-stone-50/50 text-stone-900 font-medium font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-stone-300 accent-orange-600 cursor-pointer"
                />
                <span className="text-xs text-stone-600">Запам'ятати мене</span>
              </label>
              <span className="text-[11px] text-stone-600 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Авторизований доступ
              </span>
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              disabled={isLoading}
              className="w-full mt-3 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 active:scale-[0.99] shadow-md shadow-orange-600/20 transition-all cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Перевірка доступу...
                </span>
              ) : (
                <>
                  <span>Увійти в кабінет бухгалтерії</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Demo shortcuts are disabled by default for production safety. */}
          {SHOW_DEMO_ACCOUNTS && (
          <div className="mt-6 pt-5 border-t border-stone-100">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                Швидкий тестовий вхід за ролями:
              </span>
              <span className="text-[10px] text-orange-600 font-medium">Клікніть для вибору</span>
            </div>

            <div className="space-y-2">
              {PRESET_ACCOUNTS.map((preset) => (
                <button
                  key={preset.email}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className="w-full text-left p-2.5 rounded-xl border border-stone-200/80 hover:border-orange-300 hover:bg-orange-50/40 active:bg-orange-100/60 transition-all cursor-pointer flex items-center justify-between group touch-manipulation min-h-[46px]"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${preset.avatarBg}`}
                    >
                      {preset.name.slice(0, 1)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-stone-800 group-hover:text-orange-700 leading-tight truncate">
                        {preset.roleNameUk}
                      </div>
                      <div className="text-[10px] text-stone-500 truncate">
                        {preset.name}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md group-hover:bg-orange-100 group-hover:text-orange-800 shrink-0 ml-2">
                    {preset.defaultPass}
                  </span>
                </button>
              ))}
            </div>
          </div>
          )}
        </div>

        {/* Kindergarten Legal Info */}
        <div className="mt-6 text-center text-xs text-stone-600 space-y-1">
          <div>
            {kindergartenInfo.address && `Адреса: ${kindergartenInfo.address}`}{kindergartenInfo.phone && ` • Тел: ${kindergartenInfo.phone}`}
          </div>
          {kindergartenInfo.iban && <div>Розрахунковий рахунок IBAN: {kindergartenInfo.iban}</div>}
        </div>
      </div>
    </div>
  );
};
