import React from 'react';

interface IMSBrandLogoProps {
  className?: string;
  size?: number | string;
  showText?: boolean;
}

export const IMSBrandLogo: React.FC<IMSBrandLogoProps> = ({ 
  className = '', 
  size = '100%', 
  showText = true 
}) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* SVG Vector Logo */}
      <svg
        viewBox="0 0 120 120"
        width={size}
        height={size}
        className="shrink-0"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Top Chevron - Brand Orange */}
        <path
          d="M 5 54 
             L 60 5 
             L 115 54 
             H 93 
             L 60 25 
             L 27 54 
             H 5 Z"
          fill="#eb5a00"
        />

        {/* Bottom Chevron (G-Shape) - Brand Blue */}
        {/* Matches the G shape: bottom chevron with a horizontal internal return on the right */}
        <path
          d="M 5 66 
             L 60 115 
             L 115 66 
             H 93 
             L 60 95 
             L 27 66 
             H 52 
             L 63 76 
             H 93 
             V 66 
             Z"
          fill="currentColor"
          className="brand-logo-bottom text-[#00508a] dark:text-[#38bdf8]"
        />

        {/* Center Diagonal Slash - Brand Orange */}
        <path
          d="M 50 76 
             L 63 64 
             H 78 
             L 65 76 
             H 50 Z"
          fill="#eb5a00"
        />
      </svg>

      {/* Brand Text */}
      {showText && (
        <div className="flex flex-col select-none">
          <span className="text-base font-black tracking-tight leading-none text-foreground font-sans">
            IMS <span className="text-[#eb5a00]">PRO</span>
          </span>
          <span className="text-[7.5px] font-mono text-muted-foreground uppercase tracking-[0.25em] mt-1 leading-none">
            Asset Intelligence
          </span>
        </div>
      )}
    </div>
  );
};
