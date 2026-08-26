interface ComingSoonProps {
  title: string;
  description?: string;
}

export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="w-12 h-12 rounded-lg bg-vgd-orange/10 border border-vgd-orange/20 flex items-center justify-center mb-5">
        <div className="w-2 h-2 rounded-full bg-vgd-orange" />
      </div>
      <h1 className="text-xl font-bold text-white mb-2 text-center">{title}</h1>
      <p className="text-sm text-vgd-muted text-center max-w-sm">
        {description ?? 'This section is under construction. Check back soon.'}
      </p>
    </div>
  );
}
