import React from 'react';

interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = "w-10 h-10" }) => {
  return (
    <svg 
      viewBox="0 0 100 100" 
      className={className} 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Background Gradient: Deep Blue/Purple */}
        <linearGradient id="bgGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#6366f1" /> {/* Indigo-500 */}
          <stop offset="1" stopColor="#2563eb" /> {/* Blue-600 */}
        </linearGradient>

        {/* Left Figure Gradient: Orange to Purple */}
        <linearGradient id="leftFigGrad" x1="20" y1="20" x2="50" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fb923c" /> {/* Orange-400 */}
          <stop offset="1" stopColor="#a855f7" /> {/* Purple-500 */}
        </linearGradient>

        {/* Right Figure Gradient: Cyan to Blue */}
        <linearGradient id="rightFigGrad" x1="50" y1="20" x2="80" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#38bdf8" /> {/* Sky-400 */}
          <stop offset="1" stopColor="#3b82f6" /> {/* Blue-500 */}
        </linearGradient>
      </defs>

      {/* Rounded Square Background */}
      <rect width="100" height="100" rx="22" fill="url(#bgGrad)" />

      {/* Left Figure */}
      {/* Head */}
      <circle cx="32" cy="34" r="9" fill="url(#leftFigGrad)" />
      {/* Body */}
      <path d="M22 50 C22 46 25 44 32 44 C39 44 42 46 42 50 V 80 C42 84 38 86 32 86 C26 86 22 84 22 80 V 50 Z" fill="url(#leftFigGrad)" />
      {/* Arm Reaching */}
      <path d="M38 56 L 46 64 C 48 66 50 65 50 62" stroke="url(#leftFigGrad)" strokeWidth="8" strokeLinecap="round" />

      {/* Right Figure */}
      {/* Head */}
      <circle cx="68" cy="34" r="9" fill="url(#rightFigGrad)" />
      {/* Body */}
      <path d="M58 50 C58 46 61 44 68 44 C75 44 78 46 78 50 V 80 C78 84 74 86 68 86 C62 86 58 84 58 80 V 50 Z" fill="url(#rightFigGrad)" />
      {/* Arm Reaching */}
      <path d="M62 56 L 54 64" stroke="url(#rightFigGrad)" strokeWidth="8" strokeLinecap="round" />

      {/* White Checkmark */}
      <path 
        d="M40 38 L 48 46 L 60 30" 
        stroke="white" 
        strokeWidth="6" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        filter="drop-shadow(0px 2px 2px rgba(0,0,0,0.2))"
      />
    </svg>
  );
};