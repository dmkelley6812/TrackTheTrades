import Papa from 'papaparse'
import { format } from 'date-fns'
import type { CSVRow, ParsedOrder } from '../types'

export class CSVParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CSVParseError'
  }
}

const REQUIRED_COLUMNS = [
  'Symbol', 'Side', 'Type', 'Qty', 'Filled Qty',
  'Avg Fill Price', 'Status', 'Open Time', 'Close Time',
  'Commission Fee', 'Order ID',
]

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

  // Validate columns
  const headers = Object.keys(rows[0])
  for (const col of REQUIRED_COLUMNS) {
    if (!headers.includes(col)) {
      throw new CSVParseError(`Missing required column: "${col}". Make sure you're uploading a TradeStation Order History export.`)
    }
  }

  return rows.map((row, i): ParsedOrder => {
    try {
      return {
        orderId: row['Order ID'],
        symbol: row.Symbol,
        side: row.Side as 'Buy' | 'Sell',
        orderType: row.Type,
        qty: parseInt(row.Qty) || 0,
        filledQty: parseInt(row['Filled Qty']) || 0,
        limitPrice: parseNum(row['Limit Price']),
        stopPrice: parseNum(row['Stop Price']),
        avgFillPrice: parseNum(row['Avg Fill Price']),
        status: row.Status,
        openTime: parseDate(row['Open Time']),
        closeTime: parseDate(row['Close Time']),
        duration: row.Duration,
        commissionFee: parseNum(row['Commission Fee']) ?? 0,
        expirationDate: row['Expiration Date'] || '',
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

export function orderToDbInsert(order: ParsedOrder, userId: string, importId: string) {
  return {
    user_id: userId,
    import_id: importId,
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
