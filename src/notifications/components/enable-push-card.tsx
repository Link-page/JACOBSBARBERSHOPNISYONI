import { Bell, BellOff, Share, SquarePlus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

import { useNotifications } from '../notifications-context'

/** Without push, time-sensitive steps still happen in the app — said plainly, never promised away. */
const CHECK_THE_APP = 'גם בלי התראות, אישור ההגעה נעשה כאן באפליקציה — היכנסו ואשרו לפני המועד.'

/** Explains and controls push on this device, for every situation the browser can be in. */
export function EnablePushCard({ className }: { className?: string }) {
  const { push } = useNotifications()

  if (push.availability === 'unavailable') {
    return <Note className={className} icon={BellOff} title="התראות יהיו זמינות בקרוב" body={CHECK_THE_APP} />
  }
  if (push.availability === 'needs-home-screen') {
    return (
      <Note className={className} icon={Bell} title="התראות באייפון" body="באייפון ובאייפד, התראות פועלות רק מהאפליקציה שעל מסך הבית:">
        <ol className="mt-2 flex flex-col gap-1.5 text-footnote">
          <li className="flex items-center gap-2">
            <Share className="size-4 text-brass" /> לחצו על כפתור השיתוף בדפדפן
          </li>
          <li className="flex items-center gap-2">
            <SquarePlus className="size-4 text-brass" /> בחרו „הוספה למסך הבית"
          </li>
          <li className="flex items-center gap-2">
            <Bell className="size-4 text-brass" /> פתחו את JACOB'S מהאייקון והפעילו כאן התראות
          </li>
        </ol>
        <p className="mt-2 text-footnote text-muted-foreground">{CHECK_THE_APP}</p>
      </Note>
    )
  }
  if (push.availability === 'unsupported') {
    return <Note className={className} icon={BellOff} title="הדפדפן הזה לא תומך בהתראות" body={CHECK_THE_APP} />
  }
  if (push.subscribed) {
    return (
      <div className={cn('flex items-center gap-3 rounded-[20px] bg-card p-4 shadow-elevation', className)}>
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brass-soft text-brass">
          <Bell className="size-5" />
        </span>
        <p className="min-w-0 flex-1 text-subhead font-medium">ההתראות פעילות במכשיר הזה</p>
        <Button variant="ghost" size="sm" disabled={push.busy} onClick={() => void push.disable()}>
          כיבוי
        </Button>
      </div>
    )
  }
  if (push.permission === 'denied') {
    return <Note className={className} icon={BellOff} title="ההתראות חסומות בדפדפן" body={`כדי לקבל אותן, אפשרו התראות לאתר בהגדרות הדפדפן. ${CHECK_THE_APP}`} />
  }
  return (
    <Note className={className} icon={Bell} title="התראות על התורים שלכם" body="בקשה לאישור הגעה יום לפני, תזכורת כשעתיים לפני התור, ועדכון כשמתפנה תור שחיכיתם לו.">
      <Button className="mt-3 w-full" disabled={push.busy} onClick={() => void push.enable()}>
        {push.busy ? <Spinner /> : <Bell className="size-4" />}
        הפעלת התראות
      </Button>
      {push.error && (
        <p role="alert" className="mt-2 text-footnote text-destructive">
          {push.error}
        </p>
      )}
      <p className="mt-2 text-footnote text-muted-foreground">{CHECK_THE_APP}</p>
    </Note>
  )
}

function Note({ icon: Icon, title, body, className, children }: { icon: typeof Bell; title: string; body: string; className?: string; children?: React.ReactNode }) {
  return (
    <div className={cn('rounded-[20px] bg-card p-4 shadow-elevation', className)}>
      <div className="flex gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brass-soft text-brass">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-subhead font-semibold">{title}</p>
          <p className="text-footnote text-muted-foreground">{body}</p>
        </div>
      </div>
      {children}
    </div>
  )
}
