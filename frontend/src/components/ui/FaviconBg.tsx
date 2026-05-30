import React from 'react';

interface FaviconBgProps {
  className?: string;
}

export const FaviconBg: React.FC<FaviconBgProps> = ({ className = '' }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 120 120"
      fill="currentColor"
      className={`absolute select-none pointer-events-none z-0 ${className}`}
      aria-hidden="true"
    >
      <title>IMS Pro Logo Background</title>
      {/* Scaled & watermark representation of the new brand chevrons */}
      <g>
        {/* Top Chevron */}
        <path
          d="M 5 54 L 60 5 L 115 54 H 93 L 60 25 L 27 54 H 5 Z"
        />
        {/* Bottom Chevron */}
        <path
          d="M 5 66 L 60 115 L 115 66 H 93 L 60 95 L 27 66 H 52 L 63 76 H 93 V 66 Z"
        />
        {/* Slash */}
        <path
          d="M 50 76 L 63 64 H 78 L 65 76 H 50 Z"
        />
      </g>
    </svg>
  );
};
