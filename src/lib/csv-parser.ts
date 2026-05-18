import Papa from 'papaparse'
import { format } from 'date-fns'
import type { CSVRow, ParsedOrder } from '../types'

export class CSVParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CSVParseError'
  }
}

// Canonical lowercase keys we look up after normalizing headers
const REQUIRED_COLUMNS_LOWER = [
  'symbol', 'side', 'type', 'avg fill price', 'status',
  'open time', 'close time', 'commission fee', 'order id',
]
// qty/quantity handled separately since the header name changed between formats
const QTY_COLUMNS_LOWER = [['qty', 'quantity'], ['filled qty', 'filled quantity']]

function normalizeHeaders(row: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(row)) out[k.toLowerCase()] = v
  return out
}

function parseDate(str: string): Date {
  // Normalize MM/DD/YYYY HH:mm:ss → YYYY-MM-DD HH:mm:ss
  const mdyMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4}) (.+)$/)
  const normalized = mdyMatch
    ? `${mdyMatch[3]}-${mdyMatch[1]}-${mdyMatch[2]} ${mdyMatch[4]}`
    : str
  const d = new Date(normalized.replace(' ', 'T') + 'Z')
  if (isNaN(d.getTime())) throw new CSVParseError(`Invalid date: ${str}`)
  return d
}

function parseNum(str: string): number | null {
  if (!str || str.trim() === '') return null
  const n = parseFloat(str)
  return isNaN(n) ? null : n
}

export function parseTradeStationCSV(fileContent: string): ParsedOrder[] {
  const result = Papa.parse<CSVRow>(fileContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
    transform: (v) => v.trim(),
  })

  if (result.errors.length > 0) {
    const msg = result.errors.map(e => e.message).join('; ')
    throw new CSVParseError(`CSV parse error: ${msg}`)
  }

  const rows = result.data
  if (rows.length === 0) throw new CSVParseError('CSV file is empty')

  // Validate columns against lowercase-normalized headers (handles both old Title Case and new Sentence case)
  const headersLower = Object.keys(rows[0]).map(h => h.toLowerCase())
  for (const col of REQUIRED_COLUMNS_LOWER) {
    if (!headersLower.includes(col)) {
      throw new CSVParseError(`Missing required column: "${col}". Make sure you're uploading a TradeStation Order History export.`)
    }
  }
  for (const [a, b] of QTY_COLUMNS_LOWER) {
    if (!headersLower.includes(a) && !headersLower.includes(b)) {
      throw new CSVParseError(`Missing required column: "${a}" or "${b}". Make sure you're uploading a TradeStation Order History export.`)
    }
  }

  return rows.map((row, i): ParsedOrder => {
    try {
      const r = normalizeHeaders(row)
      return {
        orderId: r['order id'],
        symbol: r['symbol'],
        side: r['side'] as 'Buy' | 'Sell',
        orderType: r['type'],
        qty: parseInt(r['quantity'] ?? r['qty']) || 0,
        filledQty: parseInt(r['filled quantity'] ?? r['filled qty']) || 0,
        limitPrice: parseNum(r['limit price']),
        stopPrice: parseNum(r['stop price']),
        avgFillPrice: parseNum(r['avg fill price']),
        status: r['status'],
        openTime: parseDate(r['open time']),
        closeTime: parseDate(r['close time']),
        duration: r['duration'],
        commissionFee: parseNum(r['commission fee']) ?? 0,
        expirationDate: r['expiration date'] || '',
      }
    } catch (e) {
      throw new CSVParseError(`Row ${i + 2}: ${(e as Error).message}`)
    }
  })
}

export function getFilledOrders(orders: ParsedOrder[]) {
  return orders.filter(
    o => o.status === 'Filled' && o.filledQty > 0 && o.avgFillPrice !== null
  )
}

export function orderToDbInsert(order: ParsedOrder, userId: string, importId: string, accountId: string) {
  return {
    user_id: userId,
    import_id: importId,
    account_id: accountId,
    order_id: order.orderId,
    symbol: order.symbol,
    side: order.side,
    order_type: order.orderType,
    qty: order.qty,
    filled_qty: order.filledQty,
    limit_price: order.limitPrice,
    stop_price: order.stopPrice,
    avg_fill_price: order.avgFillPrice,
    status: order.status,
    open_time: order.openTime.toISOString(),
    close_time: order.closeTime.toISOString(),
    duration: order.duration,
    commission_fee: order.commissionFee,
    expiration_date: order.expirationDate || null,
  }
}

export function formatTradeStationDate(d: Date): string {
  return format(d, 'yyyy-MM-dd HH:mm:ss')
}
