'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Globe } from 'lucide-react'

export default function LanguageSwitcher({ currentLang }: { currentLang: string }) {
  const router = useRouter()
  const pathname = usePathname()

  const toggleLang = () => {
    const newLang = currentLang === 'ar' ? 'en' : 'ar'
    if (!pathname) return
    
    const segments = pathname.split('/')
    // Ensure we are replacing the first segment which contains the locale
    if (segments.length > 1 && (segments[1] === 'en' || segments[1] === 'ar')) {
      segments[1] = newLang
    }
    
    router.push(segments.join('/') || '/')
  }

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={toggleLang} 
      className="fixed top-4 end-4 z-50 bg-white/80 backdrop-blur-sm border-slate-200 text-slate-700 shadow-sm"
    >
      <Globe className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
      {currentLang === 'ar' ? 'English' : 'العربية'}
    </Button>
  )
}
