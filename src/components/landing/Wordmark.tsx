export function Wordmark() {
  return (
    <div className="flex items-center gap-2.5">
      {/* Circuit "N" mark — two vertical rails + a diagonal trace with nodes */}
      <svg
        width="22"
        height="22"
        viewBox="0 0 22 22"
        fill="none"
        aria-hidden="true"
        className="text-brand"
      >
        <rect
          x="1.25"
          y="1.25"
          width="19.5"
          height="19.5"
          rx="3"
          stroke="currentColor"
          strokeOpacity="0.35"
          strokeWidth="1"
        />
        {/* left rail */}
        <line
          x1="6"
          y1="5"
          x2="6"
          y2="17"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        {/* right rail */}
        <line
          x1="16"
          y1="5"
          x2="16"
          y2="17"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        {/* diagonal trace */}
        <line
          x1="6"
          y1="5"
          x2="16"
          y2="17"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        {/* nodes */}
        <circle cx="6" cy="5" r="1.4" fill="currentColor" />
        <circle cx="16" cy="17" r="1.4" fill="currentColor" />
        <circle cx="16" cy="5" r="1" fill="currentColor" fillOpacity="0.55" />
        <circle cx="6" cy="17" r="1" fill="currentColor" fillOpacity="0.55" />
      </svg>
      <span className="font-mono text-sm font-medium tracking-tight text-foreground">
        naty<span className="text-brand">md</span>
      </span>
    </div>
  );
}
