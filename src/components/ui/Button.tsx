'use client';

import { forwardRef } from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'drink' | 'bedtime' | 'night';
  size?: 'md' | 'lg';
  fullWidth?: boolean;
  children: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'lg', fullWidth = false, className = '', children, ...props }, ref) => {
    const base = `inline-flex items-center justify-center gap-2 rounded-2xl font-semibold
      transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed
      focus:outline-none focus:ring-2 focus:ring-ipc-400 focus:ring-offset-2`;

    const sizes = {
      md: 'px-4 py-2.5 text-base min-h-[44px]',
      lg: 'px-6 py-3.5 text-lg min-h-[52px]',
    };

    const variants = {
      primary: 'bg-ipc-500 text-white hover:bg-ipc-600 active:bg-ipc-700',
      secondary: 'bg-ipc-50 text-ipc-800 border border-ipc-200 hover:bg-ipc-100',
      ghost: 'text-ipc-700 hover:bg-ipc-50',
      danger: 'bg-danger text-white hover:bg-danger/90',
      drink: 'bg-drink text-white hover:bg-drink/90 active:bg-drink/80 focus:ring-drink/40',
      bedtime: 'bg-bedtime text-white hover:bg-bedtime/90 active:bg-bedtime/80 focus:ring-bedtime/40',
      night: 'bg-indigo-500 text-white hover:bg-indigo-600 active:bg-indigo-700 focus:ring-indigo-400',
    };

    return (
      <button
        ref={ref}
        className={`${base} ${sizes[size]} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
export default Button;
