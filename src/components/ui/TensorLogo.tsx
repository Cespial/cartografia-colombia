"use client";

interface TensorLogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

export default function TensorLogo({ size = 22, showText = true, className = "" }: TensorLogoProps) {
  return (
    <a
      href="https://tensor.lat"
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-1.5 group ${className}`}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 28 28"
        fill="none"
        className="transition-transform duration-500 group-hover:rotate-45"
      >
        <rect
          x="4"
          y="4"
          width="20"
          height="20"
          rx="2"
          stroke="#10b981"
          strokeWidth="1.5"
          transform="rotate(45 14 14)"
          className="origin-center"
        />
        <rect
          x="9"
          y="9"
          width="10"
          height="10"
          rx="1"
          fill="#10b981"
          fillOpacity="0.9"
          transform="rotate(45 14 14)"
          className="origin-center"
        />
      </svg>
      {showText && (
        <span className="text-sm font-semibold tracking-tight text-emerald-400">
          tensor<span className="text-gray-500">.lat</span>
        </span>
      )}
    </a>
  );
}
