export default function Logo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]">
        {/* Outer Shield/Diamond */}
        <path d="M50 5 L90 25 L90 60 L50 95 L10 60 L10 25 Z" fill="#0f172a" stroke="#10b981" strokeWidth="4" />
        {/* Inner C */}
        <path d="M65 35 C 55 25, 35 25, 35 50 C 35 75, 55 75, 65 65" fill="none" stroke="#6366f1" strokeWidth="8" strokeLinecap="round" />
        {/* Inner D/Armband */}
        <path d="M50 35 L50 65" fill="none" stroke="#10b981" strokeWidth="8" strokeLinecap="round" />
        <circle cx="50" cy="50" r="4" fill="#6366f1" />
      </svg>
      <div className="flex flex-col tracking-tighter leading-none">
        <span className="font-black text-xl text-white uppercase tracking-wider">Captains</span>
        <span className="font-bold text-sm text-emerald-400 uppercase tracking-[0.2em]">Draft</span>
      </div>
    </div>
  )
}
