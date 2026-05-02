import React from 'react';

// --- Button ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'success' | 'ghost';
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  size = 'md',
  className = '',
  ...props 
}) => {
  const baseStyles = "relative overflow-hidden font-bold transition-all duration-300 active:scale-[0.96] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 tracking-wide";
  
  const sizes = {
    sm: "px-3 py-1.5 text-sm rounded-xl",
    md: "px-6 py-3.5 text-base rounded-2xl",
    lg: "px-8 py-4 text-lg rounded-2xl"
  };

  const variants = {
    primary: "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5 dark:shadow-indigo-900/50",
    secondary: "bg-slate-800 text-white hover:bg-slate-900 shadow-lg shadow-slate-500/20 dark:bg-slate-700 dark:hover:bg-slate-600 dark:shadow-slate-900/30",
    outline: "border-2 border-indigo-100 text-indigo-600 bg-white hover:bg-indigo-50 hover:border-indigo-200 dark:bg-slate-900 dark:border-slate-700 dark:text-indigo-400 dark:hover:bg-slate-800",
    danger: "bg-red-50 text-red-500 hover:bg-red-100 border border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30",
    success: "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:-translate-y-0.5 dark:shadow-emerald-900/50",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
  };

  return (
    <button 
      className={`${baseStyles} ${sizes[size]} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

// --- Input ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => {
  return (
    <div className="flex flex-col gap-1.5 group">
      {label && <label className="text-sm font-semibold text-slate-600 dark:text-slate-400 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors">{label}</label>}
      <input
        className={`px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border-2 ${error ? 'border-red-300 dark:border-red-500/50 focus:border-red-400 bg-red-50/30 dark:bg-red-900/10' : 'border-transparent focus:border-indigo-300 dark:focus:border-indigo-500/50 focus:bg-white dark:focus:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'} outline-none transition-all duration-300 font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-red-500 dark:text-red-400 font-bold animate-enter">{error}</span>}
    </div>
  );
};

// --- TextArea ---
interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export const TextArea: React.FC<TextAreaProps> = ({ label, className = '', ...props }) => {
  return (
    <div className="flex flex-col gap-1.5 group">
      {label && <label className="text-sm font-semibold text-slate-600 dark:text-slate-400 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors">{label}</label>}
      <textarea
        className={`px-4 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-indigo-300 dark:focus:border-indigo-500/50 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all duration-300 min-h-[100px] font-medium text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 ${className}`}
        {...props}
      />
    </div>
  );
};

// --- Card ---
export const Card: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ children, className = '', onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={`bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none p-5 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:hover:bg-slate-800/80 ${className} ${onClick ? 'cursor-pointer active:scale-[0.98]' : ''}`}
    >
      {children}
    </div>
  );
};

// --- Header ---
export const Header: React.FC<{ 
  title: string; 
  subtitle?: string; 
  rightAction?: React.ReactNode; 
  onBack?: () => void;
  logo?: string;
}> = ({ title, subtitle, rightAction, onBack, logo }) => (
  <header className="bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800/50 sticky top-0 z-20 px-5 py-4 flex items-center justify-between shadow-sm transition-all">
    <div className="flex items-center gap-3">
      {onBack && (
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors">
           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
      )}
      <div className="flex items-center gap-3">
        {logo && <img src={logo} alt="Logo" className="w-10 h-10 object-contain rounded-lg" />}
        <div>
          <h1 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 leading-tight">{title}</h1>
          {subtitle && <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </div>
    {rightAction && <div className="animate-enter flex items-center gap-2">{rightAction}</div>}
  </header>
);