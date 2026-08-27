#!/usr/bin/env node
/**
 * インフラ資料・設定の不足を検知する。
 * Usage: node scripts/check-infra.mjs [--json]
 */
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const jsonOut = process.argv.includes('--json')

const PLACEHOLDER = /xxxx|xxxxxxxx|example\.com|YOUR_/i

/** @type {{ ok: boolean, category: string, item: string, detail?: string }[]} */
const results = []

function pass(category, item, detail) {
  results.push({ ok: true, category, item, detail })
}

function fail(category, item, detail) {
  results.push({ ok: false, category, item, detail })
}

function warn(category, item, detail) {
  results.push({ ok: null, category, item, detail })
}

function read(path) {
  return readFileSync(join(root, path), 'utf8')
}

function fileExists(path) {
  return existsSync(join(root, path))
}

// --- ドキュメント ---
const archiveDocs = 'docs/_archive/2026-08-28'
const requiredDocs = [
  `${archiveDocs}/infra.md`,
  `${archiveDocs}/deploy-aws.md`,
  `${archiveDocs}/design.md`,
  'docs/screens/design/README.md',
  'docs/api/design/README.md',
  'infra/README.md',
  'infra/template.yaml',
  '.env.example',
  '.github/workflows/deploy-aws.yml',
  'scripts/deploy-aws.mjs',
]

for (const doc of requiredDocs) {
  if (fileExists(doc)) pass('ドキュメント', doc, '存在')
  else fail('ドキュメント', doc, '見つかりません')
}

// README → 現行 docs / 旧 infra
const readme = fileExists('README.md') ? read('README.md') : ''
const docsIndex = fileExists('docs/README.md') ? read('docs/README.md') : ''
if (docsIndex.includes('screens/design')) pass('ドキュメント', 'docs/README → 画面設計', 'リンクあり')
else fail('ドキュメント', 'docs/README → 画面設計', 'リンクを追加してください')
if (docsIndex.includes('api/design')) pass('ドキュメント', 'docs/README → API 設計', 'リンクあり')
else fail('ドキュメント', 'docs/README → API 設計', 'リンクを追加してください')
if (readme.includes(`${archiveDocs}/infra.md`) || readme.includes(`${archiveDocs}/`)) {
  pass('ドキュメント', 'README → 旧 infra 資料', 'アーカイブへのリンクあり')
} else {
  fail('ドキュメント', 'README → 旧 infra 資料', 'アーカイブへのリンクを追加してください')
}

// deploy-aws.md 参照の解決
for (const ref of ['README.md', `${archiveDocs}/design.md`, `${archiveDocs}/phases.md`, 'infra/README.md']) {
  if (!fileExists(ref)) continue
  const content = read(ref)
  if (content.includes('deploy-aws.md') && !fileExists(`${archiveDocs}/deploy-aws.md`)) {
    fail('ドキュメント', `${ref} → deploy-aws.md`, '参照先が未作成')
  }
}

// --- SAM Outputs ↔ .env.example ---
const template = fileExists('infra/template.yaml') ? read('infra/template.yaml') : ''
const outputKeys = [...template.matchAll(/^\s+(\w+):\s*$/gm)]
  .map((m) => m[1])
  .filter((k) => template.includes(`Outputs:`) && read('infra/template.yaml').split('Outputs:')[1]?.includes(`${k}:`))

const expectedEnvMap = {
  ApiUrl: 'VITE_API_URL',
  UserPoolId: 'VITE_COGNITO_USER_POOL_ID',
  UserPoolClientId: 'VITE_COGNITO_CLIENT_ID',
}

for (const [outputKey, envVar] of Object.entries(expectedEnvMap)) {
  if (template.includes(`${outputKey}:`)) {
    const envExample = fileExists('.env.example') ? read('.env.example') : ''
    if (envExample.includes(envVar)) {
      pass('設定対応', `${outputKey} → ${envVar}`, '.env.example に定義あり')
    } else {
      fail('設定対応', `${outputKey} → ${envVar}`, '.env.example に未定義')
    }
  } else {
    fail('設定対応', outputKey, 'template.yaml Outputs に未定義')
  }
}

if (read('.env.example').includes('VITE_AWS_REGION')) {
  pass('設定対応', 'VITE_AWS_REGION', '.env.example に定義あり')
} else {
  fail('設定対応', 'VITE_AWS_REGION', '.env.example に未定義')
}

// --- ローカル設定 ---
if (fileExists('.env')) {
  pass('ローカル', '.env', '存在')
  const env = read('.env')
  for (const envVar of ['VITE_API_URL', 'VITE_COGNITO_USER_POOL_ID', 'VITE_COGNITO_CLIENT_ID']) {
    const match = env.match(new RegExp(`^${envVar}=(.+)$`, 'm'))
    if (!match || !match[1].trim()) {
      fail('ローカル', envVar, '未設定')
    } else if (PLACEHOLDER.test(match[1])) {
      warn('ローカル', envVar, 'プレースホルダーのまま')
    } else {
      pass('ローカル', envVar, '設定済み')
    }
  }
} else {
  warn('ローカル', '.env', '未作成（ローカル専用モードでは可）')
}

if (fileExists('infra/samconfig.toml')) {
  pass('ローカル', 'infra/samconfig.toml', '存在')
} else {
  warn('ローカル', 'infra/samconfig.toml', 'samconfig.toml.example からコピーが必要')
}

// --- GitHub Actions ---
const workflow = fileExists('.github/workflows/deploy-aws.yml')
  ? read('.github/workflows/deploy-aws.yml')
  : ''
if (workflow.includes('workflow_dispatch')) {
  pass('CI/CD', 'workflow_dispatch', '手動デプロイ有効')
}
if (workflow.includes('#push:') || workflow.includes('#  push:')) {
  warn('CI/CD', 'main push 自動デプロイ', 'コメントアウト中')
} else if (workflow.includes('push:') && workflow.includes('branches: [main]')) {
  pass('CI/CD', 'main push 自動デプロイ', '有効')
}

// --- AWS スタック（任意） ---
const stackName = process.env.AWS_STACK_NAME ?? 'fissingplotter'
const region = process.env.AWS_REGION ?? 'ap-northeast-1'

async function checkAws() {
  let CloudFormationClient, DescribeStacksCommand
  try {
    ;({ CloudFormationClient, DescribeStacksCommand } = await import(
      '@aws-sdk/client-cloudformation'
    ))
  } catch {
    warn('AWS', 'スタック確認', '@aws-sdk/client-cloudformation 未インストール — npm install を実行')
    return
  }

  try {
    const cf = new CloudFormationClient({ region })
    const res = await cf.send(new DescribeStacksCommand({ StackName: stackName }))
    const stack = res.Stacks?.[0]
    if (!stack) {
      warn('AWS', `スタック ${stackName}`, '見つかりません')
      return
    }
    pass('AWS', `スタック ${stackName}`, stack.StackStatus ?? '存在')

    const outputs = Object.fromEntries(
      (stack.Outputs ?? []).map((o) => [o.OutputKey, o.OutputValue]),
    )

    for (const [outputKey, envVar] of Object.entries(expectedEnvMap)) {
      const value = outputs[outputKey]
      if (!value) {
        fail('AWS', `Output ${outputKey}`, 'スタックに未定義')
        continue
      }
      pass('AWS', `Output ${outputKey}`, value)

      if (fileExists('.env')) {
        const env = read('.env')
        const match = env.match(new RegExp(`^${envVar}=(.+)$`, 'm'))
        if (match && match[1].trim() === value) {
          pass('AWS', `${envVar} 一致`, 'スタック Output と .env が一致')
        } else if (match && !PLACEHOLDER.test(match[1])) {
          fail('AWS', `${envVar} 一致`, `.env とスタック Output が不一致`)
        }
      }
    }

    const apiUrl = outputs.ApiUrl
    if (apiUrl) {
      try {
        const res = await fetch(`${apiUrl}/health`)
        if (res.ok) pass('AWS', '/health', `${res.status}`)
        else fail('AWS', '/health', `HTTP ${res.status}`)
      } catch (e) {
        fail('AWS', '/health', e instanceof Error ? e.message : String(e))
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('credentials') || msg.includes('Credentials') || msg.includes('Unable to locate')) {
      warn('AWS', 'スタック確認', 'AWS 認証なし — スキップ')
    } else if (msg.includes('does not exist')) {
      warn('AWS', `スタック ${stackName}`, '未デプロイ')
    } else {
      warn('AWS', 'スタック確認', msg)
    }
  }
}

await checkAws()

// --- 未実装の検出（template 内） ---
if (!template.includes('PointInTimeRecoverySpecification')) {
  warn('未実装', 'DynamoDB PITR', 'template.yaml に未設定')
}
if (template.includes("AllowOrigins:\n          - '*'")) {
  warn('未実装', 'API CORS', "AllowOrigins が '*' — 本番ドメインへの制限を検討")
}

// --- 出力 ---
const failed = results.filter((r) => r.ok === false)
const warnings = results.filter((r) => r.ok === null)
const passed = results.filter((r) => r.ok === true)

if (jsonOut) {
  console.log(JSON.stringify({ passed: passed.length, warnings: warnings.length, failed: failed.length, results }, null, 2))
} else {
  console.log('\n=== インフラ不足チェック ===\n')

  if (failed.length) {
    console.log('❌ 要対応:')
    for (const r of failed) console.log(`   [${r.category}] ${r.item}: ${r.detail}`)
    console.log()
  }

  if (warnings.length) {
    console.log('⚠️  警告 / 未設定:')
    for (const r of warnings) console.log(`   [${r.category}] ${r.item}: ${r.detail}`)
    console.log()
  }

  console.log(`✅ OK: ${passed.length} 件`)
  if (failed.length) console.log(`\n要対応 ${failed.length} 件 — 詳細は ${archiveDocs}/infra.md のチェックリストを更新してください`)
  else if (warnings.length) console.log(`\n警告 ${warnings.length} 件 — 必要に応じて ${archiveDocs}/infra.md を更新してください`)
  else console.log('\n自動チェック項目はすべて OK です')
}

process.exit(failed.length > 0 ? 1 : 0)
