'use client'

import { useState } from 'react'

export type ToastVariant = 'default' | 'destructive' | 'success'

export interface ToastProps {
  title: string
  description?: string
  variant?: ToastVariant
}

export function useToast() {
  const [toast, setToast] = useState<ToastProps | null>(null)

  const showToast = (props: ToastProps) => {
    setToast(props)
    setTimeout(() => setToast(null), 5000)
  }

  return {
    toast: showToast,
    showToast
  }
}
