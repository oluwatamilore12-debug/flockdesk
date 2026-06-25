export interface WhatsAppConfig {
  apiToken: string
  phoneNumberId: string
  templates: Record<string, string>
}

export interface WhatsAppMessage {
  to: string
  templateName: string
  templateId: string
  parameters: string[]
}

export async function sendWhatsAppMessage(
  config: WhatsAppConfig,
  message: WhatsAppMessage
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const token = config.apiToken || import.meta.env.VITE_WHATSAPP_API_TOKEN
  const phoneId = config.phoneNumberId || import.meta.env.VITE_WHATSAPP_PHONE_NUMBER_ID

  if (!token || !phoneId) {
    return { success: false, error: 'WhatsApp API not configured' }
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: message.to.replace(/\D/g, ''),
          type: 'template',
          template: {
            name: message.templateName,
            language: { code: 'en' },
            components: message.parameters.length
              ? [{
                  type: 'body',
                  parameters: message.parameters.map((text) => ({ type: 'text', text })),
                }]
              : undefined,
          },
        }),
      }
    )

    const data = await response.json()
    if (!response.ok) {
      return { success: false, error: data.error?.message || 'Failed to send message' }
    }
    return { success: true, messageId: data.messages?.[0]?.id }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Network error' }
  }
}

export function buildSalesDayClosedMessage(summary: {
  date: string
  birdsSold: number
  revenue: number
  rejects: number
  mortality: number
  farmTransfer: number
  pendingPayments: number
}): WhatsAppMessage {
  return {
    to: '',
    templateName: 'sales_day_closed',
    templateId: 'sales_day_closed_template',
    parameters: [
      summary.date,
      String(summary.birdsSold),
      `₦${summary.revenue.toLocaleString()}`,
      String(summary.rejects),
      String(summary.mortality),
      String(summary.farmTransfer),
      `₦${summary.pendingPayments.toLocaleString()}`,
    ],
  }
}

export function buildPaymentConfirmedMessage(summary: {
  customerPhone: string
  amount: number
  balance: number
  orderNumber: string
}): WhatsAppMessage {
  return {
    to: summary.customerPhone,
    templateName: 'payment_confirmed',
    templateId: 'payment_confirmed_template',
    parameters: [
      summary.orderNumber,
      `₦${summary.amount.toLocaleString()}`,
      `₦${summary.balance.toLocaleString()}`,
    ],
  }
}