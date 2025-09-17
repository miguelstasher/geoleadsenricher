interface AppIconProps {
  size?: number;
  className?: string;
}

export default function AppIcon({ size = 32, className = "" }: AppIconProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 32 32" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{stopColor: '#8B5CF6', stopOpacity: 1}} />
          <stop offset="50%" style={{stopColor: '#EC4899', stopOpacity: 1}} />
          <stop offset="100%" style={{stopColor: '#3B82F6', stopOpacity: 1}} />
        </linearGradient>
      </defs>
      
      {/* Background rounded square */}
      <rect width="32" height="32" rx="8" fill="url(#gradient)"/>
      
      {/* Location pin icon */}
      <path 
        d="M16 6C12.686 6 10 8.686 10 12C10 17 16 26 16 26S22 17 22 12C22 8.686 19.314 6 16 6ZM16 15C14.343 15 13 13.657 13 12C13 10.343 14.343 9 16 9C17.657 9 19 10.343 19 12C19 13.657 17.657 15 16 15Z" 
        fill="white"
      />
      
      {/* Data visualization dots */}
      <circle cx="8" cy="8" r="1.5" fill="white" opacity="0.8"/>
      <circle cx="24" cy="8" r="1.5" fill="white" opacity="0.8"/>
      <circle cx="8" cy="24" r="1.5" fill="white" opacity="0.8"/>
      <circle cx="24" cy="24" r="1.5" fill="white" opacity="0.8"/>
    </svg>
  )
}
