interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'red' | 'yellow' | 'cream';
  className?: string;
}

const sizeMap: Record<NonNullable<LogoProps['size']>, { box: string; svg: number }> = {
  sm: { box: 'w-9 h-9',  svg: 22 },
  md: { box: 'w-11 h-11', svg: 26 },
  lg: { box: 'w-14 h-14', svg: 34 },
  xl: { box: 'w-20 h-20', svg: 48 },
};

export const Logo = ({ size = 'md', variant = 'red', className = '' }: LogoProps) => {
  const { box, svg } = sizeMap[size];

  const palette =
    variant === 'red'
      ? { bg: 'bg-brand-red-500',   ring: 'ring-brand-red-600/40',   fork: '#FFC72C', plate: '#FFFFFF' }
      : variant === 'yellow'
      ? { bg: 'bg-brand-yellow-400', ring: 'ring-brand-yellow-500/40', fork: '#DA291C', plate: '#141414' }
      : { bg: 'bg-cream-100',        ring: 'ring-brand-yellow-300/50', fork: '#DA291C', plate: '#54100A' };

  return (
    <div
      className={`${box} ${palette.bg} ${palette.ring} ring-2 ring-offset-2 ring-offset-paper-0 rounded-2xl flex items-center justify-center shadow-md select-none transition-transform duration-200 ${className}`}
      aria-label="Food Store"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={svg}
        height={svg}
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
      >
        {/* Plato */}
        <circle cx="16" cy="20" r="9" stroke={palette.plate} strokeWidth="1.6" opacity="0.55" />
        {/* Tenedor estilizado */}
        <path
          d="M11 5v6.5a2.5 2.5 0 0 0 2.5 2.5h.2v9.5a1.3 1.3 0 1 0 2.6 0V14h.2A2.5 2.5 0 0 0 19 11.5V5"
          stroke={palette.fork}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Acento amarillo (chispa de sabor) */}
        <circle cx="24.5" cy="8" r="1.4" fill={palette.fork} />
      </svg>
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
      aria-label="Food Store"
    >
      <rect width="64" height="64" rx="16" fill="#DA291C" />
      <circle cx="32" cy="40" r="16" stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth="2" />
      <path
        d="M21 12v12a4 4 0 0 0 4 4h.5v18a2.3 2.3 0 1 0 4.6 0V28h.4a4 4 0 0 0 4-4V12"
        stroke="#FFC72C"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="48" cy="18" r="2.6" fill="#FFC72C" />
    </svg>
  );
};
