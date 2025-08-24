'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateKitchenOrderStatus } from '@/lib/actions/kitchen'

type KitchenOrder = {
  id: string
  status: 'PAID' | 'PREPARING' | 'READY'
  customerEmail: string | null
  createdAt: string
  subtotal: number
  total: number
  items: { id: string; itemTitle: string; variantName: string | null; quantity: number }[]
}

const lanes = [
  { key: 'PAID', title: 'Incoming', hint: 'Tap Start → PREPARING', color: 'border-blue-200 bg-blue-50' },
  { key: 'PREPARING', title: 'Preparing', hint: 'Drag to READY when done', color: 'border-yellow-200 bg-yellow-50' },
  { key: 'READY', title: 'Ready', hint: 'Complete at pickup', color: 'border-green-200 bg-green-50' },
] as const

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.max(0, Math.round(diff / 60000))
  return m < 1 ? 'now' : `${m}m`
}

function ding() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.connect(g); g.connect(ctx.destination)
    o.type = 'square'; o.frequency.value = 880
    g.gain.setValueAtTime(0.001, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)
    o.start(); o.stop(ctx.currentTime + 0.2)
  } catch {}
}

export default function KitchenBoard({ initialOrders }: { initialOrders: KitchenOrder[] }) {
  const router = useRouter()
  const [orders, setOrders] = useState<KitchenOrder[]>(initialOrders)
  const prevIds = useRef<Set<string>>(new Set(initialOrders.map(o => o.id)))
  const [showPaid, setShowPaid] = useState(true)
  const [isPending, startTransition] = useTransition()

  // Accept refreshed data from the server page
  useEffect(() => {
    setOrders(initialOrders)
    const newPaid = initialOrders.filter(o => o.status === 'PAID' && !prevIds.current.has(o.id))
    if (newPaid.length) ding()
    prevIds.current = new Set(initialOrders.map(o => o.id))
  }, [initialOrders])

  // Auto-refresh the whole route (server re-fetches and passes new props)
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 4000)
    return () => clearInterval(t)
  }, [router])

  const grouped = useMemo(() => {
    const by: Record<'PAID' | 'PREPARING' | 'READY', KitchenOrder[]> = { PAID: [], PREPARING: [], READY: [] }
    for (const o of orders) by[o.status].push(o)
    return by
  }, [orders])

  // Hidden server-action form (used for DnD submissions)
  const formRef = useRef<HTMLFormElement>(null)

  function submitStatus(orderId: string, status: 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELED') {
    const f = formRef.current
    if (!f) return
    ;(f.elements.namedItem('orderId') as HTMLInputElement).value = orderId
    ;(f.elements.namedItem('status') as HTMLInputElement).value = status
    startTransition(() => {
      f.requestSubmit()
      // Also force a refresh soon after
      setTimeout(() => router.refresh(), 300)
    })
  }

  // DnD
  const dragId = useRef<string | null>(null)
  function onDragStart(e: React.DragEvent, id: string) {
    dragId.current = id
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
  }
  function onDrop(e: React.DragEvent, laneKey: (typeof lanes)[number]['key']) {
    e.preventDefault()
    const id = dragId.current || e.dataTransfer.getData('text/plain')
    const order = orders.find(o => o.id === id)
    if (!order) return
    if (order.status === 'PAID' && laneKey === 'PREPARING') submitStatus(id, 'PREPARING')
    if (order.status === 'PREPARING' && laneKey === 'READY') submitStatus(id, 'READY')
    dragId.current = null
  }

  return (
    <div className="space-y-3">
      {/* Hidden form bound to server action */}
      <form ref={formRef} action={updateKitchenOrderStatus} className="hidden">
        <input name="orderId" type="hidden" />
        <input name="status" type="hidden" />
      </form>

      <div className="flex items-center gap-4">
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={showPaid} onChange={e => setShowPaid(e.target.checked)} />
          Show Incoming (PAID)
        </label>
        <div className="text-xs text-neutral-500">
          Auto-refreshing every ~4s {isPending ? '• updating…' : ''}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {lanes.map(lane => {
          if (lane.key === 'PAID' && !showPaid) return null
          return (
            <div key={lane.key}
              className={`rounded-2xl border p-3 min-h-[300px] ${lane.color}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => onDrop(e, lane.key)}
            >
              <div className="flex items-baseline justify-between mb-2">
                <div className="font-semibold">{lane.title}</div>
                <div className="text-xs text-neutral-600">{lane.hint}</div>
              </div>

              <div className="space-y-2">
                {grouped[lane.key].length === 0 && (
                  <div className="text-sm text-neutral-500">No tickets</div>
                )}
                {grouped[lane.key].map(o => {
                  const itemsSummary = o.items
                    .map(i => `${i.quantity}× ${i.itemTitle}${i.variantName ? ` — ${i.variantName}` : ''}`)
                    .join(', ')
                  return (
                    <div
                      key={o.id}
                      draggable
                      onDragStart={(e) => onDragStart(e, o.id)}
                      className="rounded-xl border bg-white p-3 shadow-sm animate-[fadeIn_.2s_ease-out]"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-mono text-xs">{o.id.slice(-6)}</div>
                        <div className="text-xs text-neutral-500">{timeAgo(o.createdAt)}</div>
                      </div>
                      <div className="mt-1 text-sm">{itemsSummary || '—'}</div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="text-xs text-neutral-500">
                          {o.customerEmail ?? 'Guest'} • ${o.total.toFixed(2)}
                        </div>
                        <div className="flex gap-2">
                          {o.status === 'PAID' && (
                            <button
                              type="button"
                              className="rounded border px-2 py-0.5 text-xs bg-blue-600 text-white"
                              onClick={() => submitStatus(o.id, 'PREPARING')}
                            >
                              Start
                            </button>
                          )}
                          {o.status === 'PREPARING' && (
                            <button
                              type="button"
                              className="rounded border px-2 py-0.5 text-xs bg-yellow-600 text-white"
                              onClick={() => submitStatus(o.id, 'READY')}
                            >
                              Ready
                            </button>
                          )}
                          {o.status === 'READY' && (
                            <>
                              {/* These use inline tiny forms to post the server action too */}
                              <form action={updateKitchenOrderStatus}>
                                <input type="hidden" name="orderId" value={o.id} />
                                <input type="hidden" name="status" value="COMPLETED" />
                                <button className="rounded border px-2 py-0.5 text-xs bg-green-600 text-white">Complete</button>
                              </form>
                              <form action={updateKitchenOrderStatus}>
                                <input type="hidden" name="orderId" value={o.id} />
                                <input type="hidden" name="status" value="CANCELED" />
                                <button className="rounded border px-2 py-0.5 text-xs">Cancel</button>
                              </form>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
