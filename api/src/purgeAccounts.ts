import { purgeExpiredAccounts } from './account.js'

export async function handler(): Promise<{ purged: number }> {
  const result = await purgeExpiredAccounts()
  console.log('account purge completed', result)
  return result
}
