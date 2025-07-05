import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface MobileOptimizedContainerProps {
  children: React.ReactNode;
  className?: string;
  enableSafeArea?: boolean;
  enableBottomSpacing?: boolean;
}

export function MobileOptimizedContainer({ 
  children, 
  className,
  enableSafeArea = true,
  enableBottomSpacing = true
}: MobileOptimizedContainerProps) {
  const isMobile = useIsMobile();

  return (
    <div className={cn(
      "w-full",
      isMobile && [
        "mobile-container",
        enableSafeArea && "safe-left safe-right",
        enableBottomSpacing && "pb-20" // Space for bottom navigation
      ],
      !isMobile && "p-6",
      className
    )}>
      {children}
    </div>
  );
}

interface MobileOptimizedCardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
}

export function MobileOptimizedCard({ 
  children, 
  className, 
  title, 
  subtitle 
}: MobileOptimizedCardProps) {
  const isMobile = useIsMobile();

  return (
    <div className={cn(
      "bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700",
      isMobile ? "mobile-card" : "p-6",
      className
    )}>
      {(title || subtitle) && (
        <div className={cn(
          "border-b border-gray-200 dark:border-gray-700",
          isMobile ? "pb-4 mb-5" : "pb-4 mb-6"
        )}>
          {title && (
            <h2 className={cn(
              "font-bold text-gi-primary dark:text-white",
              isMobile ? "mobile-text-xl" : "text-xl"
            )}>
              {title}
            </h2>
          )}
          {subtitle && (
            <p className={cn(
              "text-gray-600 dark:text-gray-400 leading-relaxed",
              isMobile ? "mobile-text-base mt-2" : "text-base mt-2"
            )}>
              {subtitle}
            </p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

interface MobileOptimizedGridProps {
  children: React.ReactNode;
  className?: string;
  cols?: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
}

export function MobileOptimizedGrid({ 
  children, 
  className,
  cols = { mobile: 1, tablet: 2, desktop: 3 }
}: MobileOptimizedGridProps) {
  return (
    <div className={cn(
      "grid gap-4",
      `grid-cols-${cols.mobile}`,
      `sm:grid-cols-${cols.tablet}`,
      `lg:grid-cols-${cols.desktop}`,
      className
    )}>
      {children}
    </div>
  );
}

interface MobileOptimizedButtonProps {
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}

export function MobileOptimizedButton({ 
  children, 
  className, 
  variant = "primary",
  size = "md",
  fullWidth,
  onClick,
  disabled,
  type = "button"
}: MobileOptimizedButtonProps) {
  const isMobile = useIsMobile();

  const baseClasses = "font-medium rounded-lg transition-all duration-200 touch-button";
  
  const variantClasses = {
    primary: "bg-gi-primary hover:bg-gi-primary/90 text-white",
    secondary: "bg-gi-gold hover:bg-gi-gold/90 text-gi-primary",
    outline: "border-2 border-gi-primary text-gi-primary hover:bg-gi-primary hover:text-white",
    ghost: "text-gi-primary hover:bg-gi-primary/10"
  };

  const sizeClasses = {
    sm: isMobile ? "px-4 py-3 text-sm font-medium" : "px-4 py-2 text-sm",
    md: isMobile ? "mobile-button" : "px-6 py-3 text-base",
    lg: isMobile ? "px-8 py-5 text-lg font-semibold" : "px-8 py-4 text-lg"
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        (fullWidth || isMobile) && "w-full",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {children}
    </button>
  );
}

interface MobileOptimizedInputProps {
  label?: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  type?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function MobileOptimizedInput({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
  required,
  disabled,
  className
}: MobileOptimizedInputProps) {
  const isMobile = useIsMobile();

  return (
    <div className="space-y-2">
      {label && (
        <label className={cn(
          "block font-medium text-gray-700 dark:text-gray-300",
          isMobile ? "text-sm" : "text-base"
        )}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        required={required}
        disabled={disabled}
        className={cn(
          "w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-gi-primary focus:border-transparent transition-all",
          isMobile ? "touch-input mobile-input" : "px-4 py-3",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
      />
    </div>
  );
}