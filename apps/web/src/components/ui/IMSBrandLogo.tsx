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
      <svg
        viewBox="0 0 120 120"
        width={size}
        height={size}
        className="shrink-0 text-foreground"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M 5 54 L 60 5 L 115 54 H 93 L 60 25 L 27 54 H 5 Z"
          fill="currentColor"
          className="text-foreground"
        />
        <path
          d="M 5 66 L 60 115 L 115 66 H 93 L 60 95 L 27 66 H 52 L 63 76 H 93 V 66 Z"
          fill="currentColor"
          className="text-muted-foreground"
        />
        <path
          d="M 50 76 L 63 64 H 78 L 65 76 H 50 Z"
          fill="currentColor"
          className="text-foreground"
        />
      </svg>

      {showText && (
        <div className="flex flex-col select-none">
          <span className="font-serif text-base tracking-tight leading-none text-foreground">
            IMS Pro
          </span>
          <span className="text-[10px] text-muted-foreground mt-1 leading-none">
            Asset intelligence
          </span>
        </div>
      )}
    </div>
  );
};
