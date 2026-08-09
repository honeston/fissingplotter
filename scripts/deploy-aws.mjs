#!/usr/bin/env node
/**
 * Build artifacts を S3 にアップロードし CloudFront キャッシュを無効化する。
 * 環境変数: AWS_STACK_NAME (default: fissingplotter)
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import {
  CloudFormationClient,
  DescribeStacksCommand,
} from '@aws-sdk/client-cloudformation'
import {
  CloudFrontClient,
  CreateInvalidationCommand,
} from '@aws-sdk/client-cloudfront'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

const stackName = process.env.AWS_STACK_NAME ?? 'fissingplotter'
const distDir = 'dist'
const region = process.env.AWS_REGION ?? 'ap-northeast-1'

const cf = new CloudFormationClient({ region })
const s3 = new S3Client({ region })
const cloudfront = new CloudFrontClient({ region })

function contentType(file) {
  if (file.endsWith('.html')) return 'text/html; charset=utf-8'
  if (file.endsWith('.js')) return 'application/javascript; charset=utf-8'
  if (file.endsWith('.css')) return 'text/css; charset=utf-8'
  if (file.endsWith('.json')) return 'application/json; charset=utf-8'
  if (file.endsWith('.svg')) return 'image/svg+xml'
  if (file.endsWith('.webmanifest')) return 'application/manifest+json'
  if (file.endsWith('.png')) return 'image/png'
  if (file.endsWith('.ico')) return 'image/x-icon'
  return 'application/octet-stream'
}

function walk(dir) {
  const files = []
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) files.push(...walk(path))
    else files.push(path)
  }
  return files
}

async function getOutputs() {
  const res = await cf.send(new DescribeStacksCommand({ StackName: stackName }))
  const stack = res.Stacks?.[0]
  if (!stack?.Outputs) throw new Error(`Stack not found: ${stackName}`)
  const map = Object.fromEntries(stack.Outputs.map((o) => [o.OutputKey, o.OutputValue]))
  return {
    bucket: map.StaticBucketName,
    distributionId: map.CloudFrontDistributionId,
  }
}

async function uploadDir(bucket) {
  const files = walk(distDir)
  for (const file of files) {
    const key = relative(distDir, file).replace(/\\/g, '/')
    const cacheControl =
      key === 'index.html' || key.endsWith('.html')
        ? 'no-cache'
        : 'public, max-age=31536000, immutable'
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: readFileSync(file),
        ContentType: contentType(key),
        CacheControl: cacheControl,
      }),
    )
    console.log(`uploaded s3://${bucket}/${key}`)
  }
}

async function invalidate(distributionId) {
  await cloudfront.send(
    new CreateInvalidationCommand({
      DistributionId: distributionId,
      InvalidationBatch: {
        CallerReference: String(Date.now()),
        Paths: { Quantity: 1, Items: ['/*'] },
      },
    }),
  )
  console.log(`invalidated CloudFront ${distributionId}`)
}

const { bucket, distributionId } = await getOutputs()
if (!bucket || !distributionId) throw new Error('Missing stack outputs')
await uploadDir(bucket)
await invalidate(distributionId)
