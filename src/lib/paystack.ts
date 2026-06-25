export interface PaystackInitParams {
  email: string
  amount: number
  reference: string
  metadata?: Record<string, unknown>
}

export async function initializePaystackPayment(
  params: PaystackInitParams
): Promise<{ authorization_url?: string; reference?: string; error?: string }> {
  const secretKey = import.meta.env.VITE_PAYSTACK_SECRET_KEY
  if (!secretKey) {
    return { error: 'Paystack not configured' }
  }

  try {
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: params.email,
        amount: Math.round(params.amount * 100),
        reference: params.reference,
        currency: 'NGN',
        metadata: params.metadata,
      }),
    })

    const data = await response.json()
    if (!data.status) {
      return { error: data.message || 'Payment initialization failed' }
    }
    return {
      authorization_url: data.data.authorization_url,
      reference: data.data.reference,
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Network error' }
  }
}

export async function verifyPaystackPayment(
  reference: string
): Promise<{ success: boolean; amount?: number; error?: string }> {
  const secretKey = import.meta.env.VITE_PAYSTACK_SECRET_KEY
  if (!secretKey) return { success: false, error: 'Paystack not configured' }

  try {
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      { headers: { Authorization: `Bearer ${secretKey}` } }
    )
    const data = await response.json()
    if (data.data?.status === 'success') {
      return { success: true, amount: data.data.amount / 100 }
    }
    return { success: false, error: data.message }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Network error' }
  }
}

export function generatePaymentReference(orderNumber: string): string {
  return `FD-${orderNumber}-${Date.now()}`
}