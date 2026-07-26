export const ACCOUNT = {
  name: 'Karan Gupta',
  accountNumber: '••••  ••••  4521',
  ifsc: 'CBIN0284521',
  branch: 'Allahabad Main Branch',
  balance: 245832,
  type: 'Savings Account',
  bank: 'Central Bank of India',
}

export const TRANSACTIONS = [
  { id: 't1', name: 'Priya Mehta', upi: 'priya@cbi', amount: -1200, type: 'UPI', time: '2:34 PM', date: 'Today', icon: '👩', category: 'transfer' },
  { id: 't2', name: 'BigBasket', upi: 'bigbasket@hdfcbank', amount: -3450, type: 'UPI', time: '10:12 AM', date: 'Today', icon: '🛒', category: 'shopping' },
  { id: 't3', name: 'SALARY CREDIT', upi: 'NEFT', amount: 78000, type: 'NEFT', time: '9:00 AM', date: 'Yesterday', icon: '💼', category: 'income' },
  { id: 't4', name: 'Rahul Sharma', upi: 'rahul@okaxis', amount: -500, type: 'UPI', time: '7:45 PM', date: 'Yesterday', icon: '👨', category: 'transfer' },
  { id: 't5', name: 'Netflix', upi: 'netflix@axisbank', amount: -649, type: 'UPI', time: '6:00 AM', date: 'Mon, 21 Jul', icon: '🎬', category: 'entertainment' },
  { id: 't6', name: 'BSNL Broadband', upi: 'bsnl@upi', amount: -999, type: 'Bill Pay', time: '11:30 AM', date: 'Mon, 21 Jul', icon: '📡', category: 'utilities' },
  { id: 't7', name: 'PhonePe Rewards', upi: 'System', amount: 50, type: 'Credit', time: '3:15 PM', date: 'Sun, 20 Jul', icon: '🎁', category: 'rewards' },
  { id: 't8', name: 'Swiggy', upi: 'swiggy@icici', amount: -380, type: 'UPI', time: '8:20 PM', date: 'Sun, 20 Jul', icon: '🍔', category: 'food' },
]

export const CONTACTS = [
  { id: 'c1', name: 'Priya Mehta', upi: 'priya@cbi', bank: 'CBI', initials: 'PM', color: '#8B5CF6', recent: true },
  { id: 'c2', name: 'Rahul Sharma', upi: 'rahul@okaxis', bank: 'Axis', initials: 'RS', color: '#3B82F6', recent: true },
  { id: 'c3', name: 'Ananya Singh', upi: 'ananya@ybl', bank: 'Yes Bank', initials: 'AS', color: '#10B981', recent: true },
  { id: 'c4', name: 'Vikram Nair', upi: 'vikram@oksbi', bank: 'SBI', initials: 'VN', color: '#F59E0B', recent: true },
  { id: 'c5', name: 'Unknown Vendor ⚠️', upi: 'vendor@paytm', bank: 'Paytm', initials: '?', color: '#EF4444', recent: false, isNew: true },
  { id: 'c6', name: 'Suspicious Entity ⚠️', upi: 'entity@ybl', bank: 'Unknown', initials: '!', color: '#EF4444', recent: false, isNew: true },
]

export const QUICK_ACTIONS = [
  { id: 'send',        label: 'Send Money',   icon: 'send',        color: '#3B82F6', action: 'send' },
  { id: 'qr',          label: 'Scan QR',      icon: 'qr',          color: '#10B981', action: 'qr' },
  { id: 'mobile',      label: 'Mobile',       icon: 'mobile',      color: '#8B5CF6', action: 'mobile' },
  { id: 'electricity', label: 'Electricity',  icon: 'electricity', color: '#F59E0B', action: 'electricity' },
  { id: 'fasttag',     label: 'FASTag',       icon: 'fasttag',     color: '#F97316', action: 'fasttag' },
  { id: 'insurance',   label: 'Insurance',    icon: 'insurance',   color: '#EC4899', action: 'insurance' },
  { id: 'credit',      label: 'Credit Card',  icon: 'credit',      color: '#6366F1', action: 'credit' },
  { id: 'more',        label: 'More',         icon: 'more',        color: '#6B7280', action: 'more' },
]
