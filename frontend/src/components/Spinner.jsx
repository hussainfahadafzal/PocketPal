const sizes = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-10 h-10 border-[3px]',
};

export default function Spinner({ size = 'md' }) {
  return (
    <div
      className={`${sizes[size]} border-primary/30 border-t-primary rounded-full animate-spin mx-auto`}
    />
  );
}
