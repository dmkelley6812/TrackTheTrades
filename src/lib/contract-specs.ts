interface ContractSpec {
  pointValue: number  // dollars per full point
  tickSize: number    // minimum price movement in points
  name: string
}

const SPECS: Record<string, ContractSpec> = {
  // Equity index futures
  NQ:  { pointValue: 20,     tickSize: 0.25,    name: 'E-mini NASDAQ-100' },
  MNQ: { pointValue: 2,      tickSize: 0.25,    name: 'Micro E-mini NASDAQ-100' },
  ES:  { pointValue: 50,     tickSize: 0.25,    name: 'E-mini S&P 500' },
  MES: { pointValue: 5,      tickSize: 0.25,    name: 'Micro E-mini S&P 500' },
  YM:  { pointValue: 5,      tickSize: 1,       name: 'E-mini Dow Jones' },
  MYM: { pointValue: 0.5,    tickSize: 1,       name: 'Micro E-mini Dow Jones' },
  RTY: { pointValue: 50,     tickSize: 0.1,     name: 'E-mini Russell 2000' },
  M2K: { pointValue: 5,      tickSize: 0.1,     name: 'Micro E-mini Russell 2000' },

  // Energy futures
  CL:  { pointValue: 1000,   tickSize: 0.01,    name: 'Crude Oil' },
  NG:  { pointValue: 10000,  tickSize: 0.001,   name: 'Natural Gas' },
  RB:  { pointValue: 42000,  tickSize: 0.0001,  name: 'RBOB Gasoline' },
  HO:  { pointValue: 42000,  tickSize: 0.0001,  name: 'Heating Oil' },

  // Metal futures
  GC:  { pointValue: 100,    tickSize: 0.1,     name: 'Gold' },
  MGC: { pointValue: 10,     tickSize: 0.1,     name: 'Micro Gold' },
  SI:  { pointValue: 5000,   tickSize: 0.005,   name: 'Silver' },
  HG:  { pointValue: 25000,  tickSize: 0.0005,  name: 'Copper' },
  PL:  { pointValue: 50,     tickSize: 0.1,     name: 'Platinum' },

  // Treasury futures
  ZB:  { pointValue: 1000,   tickSize: 0.03125, name: '30-Year T-Bond' },
  ZN:  { pointValue: 1000,   tickSize: 0.015625,name: '10-Year T-Note' },
  ZF:  { pointValue: 1000,   tickSize: 0.0078125,name: '5-Year T-Note' },
  ZT:  { pointValue: 2000,   tickSize: 0.0078125,name: '2-Year T-Note' },

  // Forex futures
  '6E': { pointValue: 125000, tickSize: 0.00005, name: 'Euro FX' },
  '6B': { pointValue: 62500,  tickSize: 0.0001,  name: 'British Pound' },
  '6J': { pointValue: 12500000, tickSize: 0.000001, name: 'Japanese Yen' },
  '6A': { pointValue: 100000, tickSize: 0.0001,  name: 'Australian Dollar' },
  '6C': { pointValue: 100000, tickSize: 0.0001,  name: 'Canadian Dollar' },
  '6S': { pointValue: 125000, tickSize: 0.0001,  name: 'Swiss Franc' },

  // Ag futures
  ZC:  { pointValue: 50,     tickSize: 0.25,    name: 'Corn' },
  ZS:  { pointValue: 50,     tickSize: 0.25,    name: 'Soybeans' },
  ZW:  { pointValue: 50,     tickSize: 0.25,    name: 'Wheat' },
}

// Month codes used in futures symbols: F G H J K M N Q U V X Z
const MONTH_CODE_REGEX = /[FGHJKMNQUVXZ]\d{2}$/

export function getSymbolRoot(symbol: string): string {
  // Handle TradingView continuous contract format: "CME_MINI:NQ1!" → "NQ"
  const tvMatch = symbol.match(/^[A-Z_]+:([A-Z]+)\d+!?$/)
  if (tvMatch) return tvMatch[1]
  // Handle standard futures format: "NQH26" → "NQ"
  return symbol.replace(MONTH_CODE_REGEX, '')
}

export function getContractSpec(symbol: string): ContractSpec {
  const root = getSymbolRoot(symbol)

  // Try longest match first (e.g., MNQ before NQ)
  const sortedKeys = Object.keys(SPECS).sort((a, b) => b.length - a.length)
  for (const key of sortedKeys) {
    if (root === key || root.startsWith(key)) {
      return SPECS[key]
    }
  }

  // Unknown contract – use 1 as point value so math still works
  return { pointValue: 1, tickSize: 0.01, name: symbol }
}
