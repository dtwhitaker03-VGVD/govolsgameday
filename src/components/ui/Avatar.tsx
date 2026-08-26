const SIZES = {
  sm: 'w-7 h-7 text-[11px]',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-lg',
  xl: 'w-24 h-24 text-2xl',
} as const;

export function Avatar({
  url,
  username,
  size = 'md',
  className = '',
}: {
  url: string | null;
  username: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const dims = SIZES[size];
  const initials = username.slice(0, 2).toUpperCase();

  if (url) {
    return (
      <img
        src={url}
        alt={username}
        className={`${dims} rounded-full object-cover ring-2 ring-vgd-orange/40 flex-shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${dims} rounded-full bg-vgd-orange flex items-center justify-center text-white font-bold flex-shrink-0 ring-2 ring-vgd-orange/40 ${className}`}
    >
      {initials}
    </div>
  );
}
