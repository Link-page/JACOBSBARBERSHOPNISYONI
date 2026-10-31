import { useCallback, useState } from 'react'

import type { BroadcastAudience } from '../../data/types'

export const TITLE_MAX = 60
export const BODY_MAX = 240

const newKey = () => crypto.randomUUID()

/**
 * The message being written. One idempotency key per draft: a double click or a
 * retry after a network error can't send it twice. A fresh key after each send.
 */
export function useBroadcastDraft() {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [audience, setAudience] = useState<BroadcastAudience>('opted_in')
  const [key, setKey] = useState(newKey)

  const valid = title.trim().length > 0 && title.length <= TITLE_MAX && body.trim().length > 0 && body.length <= BODY_MAX
  const reset = useCallback(() => {
    setTitle('')
    setBody('')
    setKey(newKey())
  }, [])

  return { title, setTitle, body, setBody, audience, setAudience, key, valid, reset }
}
