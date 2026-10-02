'use client';

import React from 'react';
import { cn } from '@/lib/utils';

// Button Component
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = 'primary', size = 'md', loading = false, icon, children, disabled, ...props },
    ref
  ) => {
    const baseStyles =
      'font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const variantStyles: Record<string, string> = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
      secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
      ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
      outline: 'border-2 border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500',
    };

    const sizeStyles: Record<string, string> = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    };

    return (
      <button
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        <span className="flex items-center gap-2">
          {loading && (
            <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-current rounded-full animate-spin" />
          )}
          {icon && <span>{icon}</span>}
          {children}
        </span>
      </button>
    );
  }
);

Button.displayName = 'Button';

// Card Component
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, children, ...props }, ref) => (
    <div
      className={cn(
        'bg-white rounded-lg shadow-sm border border-gray-200',
        className
      )}
      ref={ref}
      {...props}
    >
      {children}
    </div>
  )
);

Card.displayName = 'Card';

// CardHeader Component
interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, children, ...props }, ref) => (
    <div
      className={cn('px-6 py-4 border-b border-gray-200', className)}
      ref={ref}
      {...props}
    >
      {children}
    </div>
  )
);

CardHeader.displayName = 'CardHeader';

// CardTitle Component
interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children?: React.ReactNode;
}

export const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, children, ...props }, ref) => (
    <h3
      className={cn('text-lg font-semibold text-gray-900', className)}
      ref={ref}
      {...props}
    >
      {children}
    </h3>
  )
);

CardTitle.displayName = 'CardTitle';

// CardDescription Component
interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children?: React.ReactNode;
}

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  CardDescriptionProps
>(({ className, children, ...props }, ref) => (
  <p
    className={cn('text-sm text-gray-500', className)}
    ref={ref}
    {...props}
  >
    {children}
  </p>
));

CardDescription.displayName = 'CardDescription';

// CardContent Component
interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, children, ...props }, ref) => (
    <div className={cn('px-6 py-4', className)} ref={ref} {...props}>
      {children}
    </div>
  )
);

CardContent.displayName = 'CardContent';

// Badge Component
interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'danger' | 'info' | 'success' | 'warning';
  children?: React.ReactNode;
}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variantStyles = {
      default: 'bg-blue-100 text-blue-800',
      secondary: 'bg-gray-100 text-gray-800',
      destructive: 'bg-red-100 text-red-800',
      danger: 'bg-red-100 text-red-800',
      info: 'bg-blue-100 text-blue-800',
      success: 'bg-green-100 text-green-800',
      warning: 'bg-yellow-100 text-yellow-800',
    };

    return (
      <div
        className={cn(
          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
          variantStyles[variant],
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Badge.displayName = 'Badge';

// LoadingSpinner Component
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md' }) => {
  const sizeClasses: Record<string, string> = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div
      className={cn(
        'border-gray-300 border-t-blue-600 rounded-full animate-spin',
        sizeClasses[size]
      )}
    />
  );
};

LoadingSpinner.displayName = 'LoadingSpinner';

// EmptyState Component
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
}) => (
  <div className="text-center py-12">
    {icon && <div className="flex justify-center mb-4">{icon}</div>}
    <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
    <p className="text-sm text-gray-600 mb-4">{description}</p>
    {action && action}
  </div>
);

EmptyState.displayName = 'EmptyState';

// Dialog Component
interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({
  open = false,
  onOpenChange,
  children,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => onOpenChange?.(false)}
      />
      <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        {children}
      </div>
    </div>
  );
};

Dialog.displayName = 'Dialog';

// DialogContent Component
interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export const DialogContent = React.forwardRef<
  HTMLDivElement,
  DialogContentProps
>(({ className, children, ...props }, ref) => (
  <div className={cn('p-6', className)} ref={ref} {...props}>
    {children}
  </div>
));

DialogContent.displayName = 'DialogContent';

// DialogHeader Component
interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export const DialogHeader = React.forwardRef<HTMLDivElement, DialogHeaderProps>(
  ({ className, children, ...props }, ref) => (
    <div className={cn('mb-4', className)} ref={ref} {...props}>
      {children}
    </div>
  )
);

DialogHeader.displayName = 'DialogHeader';

// DialogTitle Component
interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children?: React.ReactNode;
}

export const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  DialogTitleProps
>(({ className, children, ...props }, ref) => (
  <h2
    className={cn('text-lg font-semibold text-gray-900', className)}
    ref={ref}
    {...props}
  >
    {children}
  </h2>
));

DialogTitle.displayName = 'DialogTitle';

// DialogDescription Component
interface DialogDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children?: React.ReactNode;
}

export const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  DialogDescriptionProps
>(({ className, children, ...props }, ref) => (
  <p className={cn('text-sm text-gray-600', className)} ref={ref} {...props}>
    {children}
  </p>
));

DialogDescription.displayName = 'DialogDescription';

// DialogFooter Component
interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export const DialogFooter = React.forwardRef<HTMLDivElement, DialogFooterProps>(
  ({ className, children, ...props }, ref) => (
    <div
      className={cn('mt-6 flex justify-end gap-3', className)}
      ref={ref}
      {...props}
    >
      {children}
    </div>
  )
);

DialogFooter.displayName = 'DialogFooter';

// Input Component
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <input
        className={cn(
          'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent',
          error && 'border-red-500',
          className
        )}
        ref={ref}
        {...props}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
);

Input.displayName = 'Input';

// Alert Component
interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive' | 'info' | 'success' | 'warning' | 'secondary' | 'danger';
  title?: string;
  children?: React.ReactNode;
}

export const Alert: React.FC<AlertProps> = ({
  variant = 'default',
  title,
  children,
  className,
  ...props
}) => {
  const variantStyles: Record<string, string> = {
    default: 'bg-gray-50 border-gray-200 text-gray-800',
    destructive: 'bg-red-50 border-red-200 text-red-800',
    danger: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    secondary: 'bg-gray-100 border-gray-300 text-gray-900',
  };

  return (
    <div
      className={cn('p-4 border rounded-lg', variantStyles[variant], className)}
      {...props}
    >
      {title && <h4 className="font-semibold mb-1">{title}</h4>}
      <div className="text-sm">{children}</div>
    </div>
  );
};

Alert.displayName = 'Alert';
