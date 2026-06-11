export function Avatar({
  src,
  name,
  size = 32,
}: {
  src?: string | null;
  name?: string | null;
  size?: number;
}) {
  const initial = (name ?? '?').charAt(0).toUpperCase();

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name ?? 'avatar'}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <span
      className="flex items-center justify-center rounded-full bg-acero font-display font-semibold text-white"
      style={{ width: size, height: size }}
    >
      {initial}
    </span>
  );
}
