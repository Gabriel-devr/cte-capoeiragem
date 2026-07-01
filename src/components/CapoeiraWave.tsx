export function CapoeiraWave() {
  return (
    <svg
      className="absolute bottom-0 left-0 w-full opacity-10"
      viewBox="0 0 1440 320"
      preserveAspectRatio="none"
      style={{ height: '200px' }}
    >
      <path
        fill="#ff8c42"
        fillOpacity="1"
        d="M0,192L48,181.3C96,171,192,149,288,154.7C384,160,480,192,576,186.7C672,181,768,139,864,128C960,117,1056,139,1152,154.7C1248,171,1344,181,1392,186.7L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
      ></path>
    </svg>
  );
}

export function CapoeiraCircle({ className = "" }: { className?: string }) {
  return (
    <div className={`absolute rounded-full border-2 border-accent/30 ${className}`} />
  );
}