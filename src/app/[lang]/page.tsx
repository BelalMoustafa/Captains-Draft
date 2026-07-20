import { getDictionary } from '@/lib/getDictionary'
import { Locale } from '@/i18n.config'
import LobbyForm from './LobbyForm'

export default async function Home({ params }: { params: Promise<{ lang: Locale }> }) {
  const { lang } = await params;
  const dict = await getDictionary(lang)

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <LobbyForm lang={lang} dict={dict.lobby} />
    </main>
  )
}
