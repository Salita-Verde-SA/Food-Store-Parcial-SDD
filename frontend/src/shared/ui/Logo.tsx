interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'red' | 'yellow';
  className?: string;
}

const sizeMap = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-11 h-11 text-xl',
  lg: 'w-14 h-14 text-2xl',
  xl: 'w-20 h-20 text-3xl',
};

export const Logo = ({ size = 'md', variant = 'red', className = '' }: LogoProps) => {
  const bg = variant === 'red' ? 'bg-brand-red-500' : 'bg-brand-yellow-400';
  const fg = variant === 'red' ? 'text-white' : 'text-ink-900';
  return (
    <div
      className={`${sizeMap[size]} ${bg} ${fg} rounded-md flex items-center justify-center font-black shadow-sm select-none ${className}`}
      aria-label="Food Store"
    >
      FS
    </div>
  );
};

interface BrandMarkProps {
  size?: number;
  className?: string;
}

export const BrandMark = ({ size = 48, className = '' }: BrandMarkProps) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-label="Food Store logo"
    >
      <rect width="64" height="64" rx="14" fill="#DA291C" />
      <path
        d="M16 50 L24 22 H32 L26 40 H38 L32 22 H40 L48 50 H40 L37.5 42 H26.5 L24 50 Z"
        fill="#FFC72C"
      />
      <circle cx="32" cy="14" r="3" fill="#FFC72C" />
    </svg>
  );
};
