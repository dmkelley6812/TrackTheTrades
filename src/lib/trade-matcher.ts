import { format } from 'date-fns'
import type { ParsedOrder, MatchedTrade } from '../types'
import { getContractSpec } from './contract-specs'

interface PositionEntry {
  price: number
  qty: number
  time: Date
  orderId: string
  commissionPerUnit: number
}

/**
 * Matches filled buy/sell orders into completed round-trip trades using FIFO.
 * Supports long and short positions, partial fills, and multi-leg exits.
 */
export function matchTrades(filledOrders: ParsedOrder[]): MatchedTrade[] {
  const trades: MatchedTrade[] = []

  // Group by symbol and process each independently
  const bySymbol = new Map<string, ParsedOrder[]>()
  for (const o of filledOrders) {
    if (!bySymbol.has(o.symbol)) bySymbol.set(o.symbol, [])
    bySymbol.get(o.symbol)!.push(o)
  }

  for (const [symbol, orders] of bySymbol) {
    const spec = getContractSpec(symbol)
    const sorted = [...orders].sort(
      (a, b) => a.closeTime.getTime() - b.closeTime.getTime()
    )

    const longQueue: PositionEntry[] = []  // open long entries (FIFO)
    const shortQueue: PositionEntry[] = [] // open short entries (FIFO)

    for (const order of sorted) {
      if (order.avgFillPrice === null) continue
      const price = order.avgFillPrice
      const qty = order.filledQty
      const commissionPerUnit = order.commissionFee / (qty || 1)

      if (order.side === 'Buy') {
        // Buying: close existing shorts first, then open longs
        let remaining = qty
        let remainingCommission = order.commissionFee

        while (remaining > 0 && shortQueue.length > 0) {
          const short = shortQueue[0]
          const matched = Math.min(remaining, short.qty)
          const exitCommission = (remainingCommission / remaining) * matched
          const entryCommission = short.commissionPerUnit * matched
          const totalCommission = exitCommission + entryCommission

          const grossPnl = (short.price - price) * matched * spec.pointValue
          const netPnl = grossPnl - totalCommission
          const durationSeconds = Math.round(
            (order.closeTime.getTime() - short.time.getTime()) / 1000
          )

          trades.push({
            symbol,
            direction: 'Short',
            entryTime: short.time,
            exitTime: order.closeTime,
            entryPrice: short.price,
            exitPrice: price,
            qty: matched,
            grossPnl,
            commission: totalCommission,
            netPnl,
            pointValue: spec.pointValue,
            entryOrderId: short.orderId,
            exitOrderId: order.orderId,
            tradeDate: format(order.closeTime, 'yyyy-MM-dd'),
            durationSeconds,
          })

          short.qty -= matched
          remaining -= matched
          remainingCommission -= exitCommission
          if (short.qty === 0) shortQueue.shift()
        }

        if (remaining > 0) {
          longQueue.push({
            price,
            qty: remaining,
            time: order.closeTime,
            orderId: order.orderId,
            commissionPerUnit: remainingCommission / remaining,
          })
        }
      } else {
        // Selling: close existing longs first, then open shorts
        let remaining = qty
        let remainingCommission = order.commissionFee

        while (remaining > 0 && longQueue.length > 0) {
          const long = longQueue[0]
          const matched = Math.min(remaining, long.qty)
          const exitCommission = (remainingCommission / remaining) * matched
          const entryCommission = long.commissionPerUnit * matched
          const totalCommission = exitCommission + entryCommission

          const grossPnl = (price - long.price) * matched * spec.pointValue
          const netPnl = grossPnl - totalCommission
          const durationSeconds = Math.round(
            (order.closeTime.getTime() - long.time.getTime()) / 1000
          )

          trades.push({
            symbol,
            direction: 'Long',
            entryTime: long.time,
            exitTime: order.closeTime,
            entryPrice: long.price,
            exitPrice: price,
            qty: matched,
            grossPnl,
            commission: totalCommission,
            netPnl,
            pointValue: spec.pointValue,
            entryOrderId: long.orderId,
            exitOrderId: order.orderId,
            tradeDate: format(order.closeTime, 'yyyy-MM-dd'),
            durationSeconds,
          })

          long.qty -= matched
          remaining -= matched
          remainingCommission -= exitCommission
          if (long.qty === 0) longQueue.shift()
        }

        if (remaining > 0) {
          shortQueue.push({
            price,
            qty: remaining,
            time: order.closeTime,
            orderId: order.orderId,
            commissionPerUnit: remainingCommission / remaining,
          })
        }
      }
    }
  }

  // Sort final trades by exit time
  return trades.sort((a, b) => a.exitTime.getTime() - b.exitTime.getTime())
}

export function tradeToDbInsert(
  trade: MatchedTrade,
  userId: string,
  importId: string
) {
  return {
    user_id: userId,
    import_id: importId,
    symbol: trade.symbol,
    direction: trade.direction,
    entry_time: trade.entryTime.toISOString(),
    exit_time: trade.exitTime.toISOString(),
    entry_price: trade.entryPrice,
    exit_price: trade.exitPrice,
    qty: trade.qty,
    gross_pnl: Math.round(trade.grossPnl * 100) / 100,
    commission: Math.round(trade.commission * 100) / 100,
    net_pnl: Math.round(trade.netPnl * 100) / 100,
    trade_date: trade.tradeDate,
    duration_seconds: trade.durationSeconds,
    point_value: trade.pointValue,
    entry_order_id: trade.entryOrderId,
    exit_order_id: trade.exitOrderId,
  }
}
