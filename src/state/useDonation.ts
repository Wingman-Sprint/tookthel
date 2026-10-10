import { useEffect, useState } from 'react'
import { countBill, dismissDonation, markDonated, shouldAskDonation } from '../domain/donation'
import { loadDonation, saveDonation } from './storage'

/** Status ajakan donasi yang otomatis tersimpan di localStorage. */
export function useDonation() {
  const [state, setState] = useState(loadDonation)
  useEffect(() => saveDonation(state), [state])
  return {
    shouldAsk: () => shouldAskDonation(state, Date.now(), navigator.onLine),
    countBill: (billKey: string) => setState((s) => countBill(s, billKey)),
    dismiss: () => setState((s) => dismissDonation(s, Date.now())),
    donated: () => setState(markDonated),
  }
}
