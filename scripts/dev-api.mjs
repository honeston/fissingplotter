#!/usr/bin/env node
/**
 * ローカル API: Docker Compose (LocalStack) + SAM local start-api (Lambda in Docker)
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const ROOT = resolve(import.meta.dirname, '..')
const INFRA = resolve(ROOT, 'infra')
const ENV_LOCAL = resolve(INFRA, 'env.local.json')
const ENV_LOCAL_EXAMPLE = resolve(INFRA, 'env.local.json.example')
const DEV_ENV = resolve(ROOT, '.env.development.local')

function loadDotenv(path) {
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = value
  }
}

function ensureEnvLocalJson() {
  if (existsSync(ENV_LOCAL)) return

  if (!existsSync(ENV_LOCAL_EXAMPLE)) {
    throw new Error(`Missing ${ENV_LOCAL_EXAMPLE}`)
  }

  let content = readFileSync(ENV_LOCAL_EXAMPLE, 'utf8')
  const key = process.env.OPENWEATHER_API_KEY ?? ''
  if (key) {
    content = content.replace('__OPENWEATHER_API_KEY__', key)
  }
  writeFileSync(ENV_LOCAL, content)
  console.log(`Created ${ENV_LOCAL} from example`)
}

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, { stdio: 'inherit', ...opts })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

loadDotenv(DEV_ENV)
loadDotenv(resolve(ROOT, '.env'))
ensureEnvLocalJson()

console.log('Starting LocalStack (docker compose)...')
run('docker', ['compose', 'up', '-d'], { cwd: ROOT })

console.log('Initializing LocalStack resources...')
run('node', ['scripts/local-init.mjs'], { cwd: ROOT })

console.log('Building local API (SAM)...')
run('sam', ['build', '-t', 'template.api.yaml'], { cwd: INFRA })

console.log('Starting local API at http://127.0.0.1:3000')
run(
  'sam',
  [
    'local',
    'start-api',
    '-t',
    '.aws-sam/build/template.yaml',
    '--env-vars',
    'env.local.json',
    '--docker-network',
    'fissingplotter-local',
    '--host',
    '127.0.0.1',
    '--port',
    '3000',
    '--warm-containers',
    'EAGER',
  ],
  { cwd: INFRA },
)
