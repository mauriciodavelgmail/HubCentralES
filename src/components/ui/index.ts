import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading = false, icon, children, disabled, ...props }, ref) => {
    const baseStyles = 'font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const variantStyles = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
      secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
      ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
      outline: 'border-2 border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500',
    };

    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    };

    return (
      <button
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        <span className="flex items-center gap-2">
          {loading && <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-current rounded-full animate-spin" />}
          {icon && <span>{icon}</span>}
          {children}
        </span>
      </button>
    );
  }
);

Button.displayName = 'Button';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(({ className, children, ...props }, ref) => (
  <div className={cn('bg-white rounded-lg shadow-sm border border-gray-200', className)} ref={ref} {...props}>
    {children}
  </div>
));

Card.displayName = 'Card';

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(({ className, children, ...props }, ref) => (
  <div className={cn('px-6 py-4 border-b border-gray-200', className)} ref={ref} {...props}>
    {children}
  </div>
));

CardHeader.displayName = 'CardHeader';

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children?: React.ReactNode;
}

export const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(({ className, children, ...props }, ref) => (
  <h3 className={cn('text-lg font-semibold text-gray-900', className)} ref={ref} {...props}>
    {children}
  </h3>
));

CardTitle.displayName = 'CardTitle';

interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children?: React.ReactNode;
}

export const CardDescription = React.forwardRef<HTMLParagraphElement, CardDescriptionProps>(({ className, children, ...props }, ref) => (
  <p className={cn('text-sm text-gray-500', className)} ref={ref} {...props}>
    {children}
  </p>
));

CardDescription.displayName = 'CardDescription';

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(({ className, children, ...props }, ref) => (
  <div className={cn('px-6 py-4', className)} ref={ref} {...props}>
    {children}
  </div>
));

CardContent.displayName = 'CardContent';

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(({ className, children, ...props }, ref) => (
  <div className={cn('px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg flex justify-end gap-2', className)} ref={ref} {...props}>
    {children}
  </div>
));

CardFooter.displayName = 'CardFooter';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  children?: React.ReactNode;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(({ className, variant = 'primary', children, ...props }, ref) => {
  const variantStyles = {
    primary: 'bg-blue-100 text-blue-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-cyan-100 text-cyan-800',
  };

  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', variantStyles[variant], className)} ref={ref} {...props}>
      {children}
    </span>
  );
});

Badge.displayName = 'Badge';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, label, error, ...props }, ref) => (
  <div className="w-full">
    {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
    <input
      className={cn(
        'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent',
        error && 'border-red-500',
        className
      )}
      ref={ref}
      {...props}
    />
    {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
  </div>
));

Input.displayName = 'Input';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, label, error, ...props }, ref) => (
  <div className="w-full">
    {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
    <textarea
      className={cn(
        'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none',
        error && 'border-red-500',
        className
      )}
      ref={ref}
      {...props}
    />
    {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
  </div>
));

Textarea.displayName = 'Textarea';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string | number; label: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, label, error, options, ...props }, ref) => (
  <div className="w-full">
    {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
    <select
      className={cn(
        'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent',
        error && 'border-red-500',
        className
      )}
      ref={ref}
      {...props}
    >
      <option value="">Selecione uma opção</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
    {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
  </div>
));

Select.displayName = 'Select';

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  children?: React.ReactNode;
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(({ className, variant = 'info', title, children, ...props }, ref) => {
  const variantStyles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  return (
    <div className={cn('p-4 border rounded-lg', variantStyles[variant], className)} ref={ref} {...props}>
      {title && <h4 className="font-semibold mb-1">{title}</h4>}
      <p className="text-sm">{children}</p>
    </div>
  );
});

Alert.displayName = 'Alert';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'white';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', variant = 'primary' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  const variants = {
    primary: 'border-blue-300 border-t-blue-600',
    white: 'border-white/30 border-t-white',
  };

  return <div className={cn('border-4 rounded-full animate-spin', sizeClasses[size], variants[variant])} />;
};

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-12 px-4">
    {icon && <div className="mb-4 text-gray-400 text-4xl">{icon}</div>}
    <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
    {description && <p className="text-gray-500 mb-6 text-center max-w-sm">{description}</p>}
    {action && <div>{action}</div>}
  </div>
);

interface ModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({ isOpen, title, onClose, children, footer, size = 'md' }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'w-full sm:max-w-sm',
    md: 'w-full sm:max-w-md',
    lg: 'w-full sm:max-w-lg',
    xl: 'w-full sm:max-w-xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <Card className={cn('relative shadow-lg', sizeClasses[size])}>
        <CardHeader className="flex justify-between items-center">
          <CardTitle>{title}</CardTitle>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ×
          </button>
        </CardHeader>
        <CardContent>{children}</CardContent>
        {footer && <CardFooter>{footer}</CardFooter>}
      </Card>
    </div>
  );
};
