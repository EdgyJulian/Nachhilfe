import accounts from '../users.local.json' with { type: 'json' }

export function isValidLogin(username: string, password: string): boolean {
  return accounts.some(
    (account) => account.username === username && account.password === password,
  )
}
