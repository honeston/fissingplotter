#!/usr/bin/env node
/**
 * LocalStack に DynamoDB テーブルと S3 バケットを作成する。
 */
import {
  CreateTableCommand,
  DynamoDBClient,
  ResourceInUseException,
} from '@aws-sdk/client-dynamodb'
import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketCorsCommand,
  S3Client,
} from '@aws-sdk/client-s3'

const ENDPOINT = process.env.AWS_ENDPOINT_URL ?? 'http://127.0.0.1:4566'
const REGION = process.env.AWS_REGION ?? 'ap-northeast-1'
const RECORDS_TABLE = process.env.LOCAL_RECORDS_TABLE ?? 'fissingplotter-records'
const WEATHER_TABLE = process.env.LOCAL_WEATHER_TABLE ?? 'fissingplotter-weather-cache'
const MEDIA_BUCKET = process.env.LOCAL_MEDIA_BUCKET ?? 'fissingplotter-media-local'

const clientConfig = {
  endpoint: ENDPOINT,
  region: REGION,
  credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
}

const ddb = new DynamoDBClient(clientConfig)
const s3 = new S3Client({ ...clientConfig, forcePathStyle: true })

async function ensureRecordsTable() {
  try {
    await ddb.send(
      new CreateTableCommand({
        TableName: RECORDS_TABLE,
        BillingMode: 'PAY_PER_REQUEST',
        AttributeDefinitions: [
          { AttributeName: 'userId', AttributeType: 'S' },
          { AttributeName: 'sortKey', AttributeType: 'S' },
          { AttributeName: 'id', AttributeType: 'S' },
        ],
        KeySchema: [
          { AttributeName: 'userId', KeyType: 'HASH' },
          { AttributeName: 'sortKey', KeyType: 'RANGE' },
        ],
        GlobalSecondaryIndexes: [
          {
            IndexName: 'by-id',
            KeySchema: [
              { AttributeName: 'userId', KeyType: 'HASH' },
              { AttributeName: 'id', KeyType: 'RANGE' },
            ],
            Projection: { ProjectionType: 'ALL' },
          },
        ],
      }),
    )
    console.log(`Created DynamoDB table: ${RECORDS_TABLE}`)
  } catch (err) {
    if (err instanceof ResourceInUseException) {
      console.log(`DynamoDB table exists: ${RECORDS_TABLE}`)
      return
    }
    throw err
  }
}

async function ensureWeatherTable() {
  try {
    await ddb.send(
      new CreateTableCommand({
        TableName: WEATHER_TABLE,
        BillingMode: 'PAY_PER_REQUEST',
        AttributeDefinitions: [{ AttributeName: 'cacheKey', AttributeType: 'S' }],
        KeySchema: [{ AttributeName: 'cacheKey', KeyType: 'HASH' }],
      }),
    )
    console.log(`Created DynamoDB table: ${WEATHER_TABLE}`)
  } catch (err) {
    if (err instanceof ResourceInUseException) {
      console.log(`DynamoDB table exists: ${WEATHER_TABLE}`)
      return
    }
    throw err
  }
}

async function ensureMediaBucket() {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: MEDIA_BUCKET }))
    console.log(`S3 bucket exists: ${MEDIA_BUCKET}`)
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: MEDIA_BUCKET }))
    console.log(`Created S3 bucket: ${MEDIA_BUCKET}`)
  }

  await s3.send(
    new PutBucketCorsCommand({
      Bucket: MEDIA_BUCKET,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ['*'],
            AllowedMethods: ['GET', 'PUT', 'HEAD'],
            AllowedOrigins: ['*'],
            ExposeHeaders: ['ETag', 'x-amz-request-id'],
            MaxAgeSeconds: 3000,
          },
        ],
      },
    }),
  )
  console.log(`S3 CORS configured: ${MEDIA_BUCKET}`)
}

async function waitForLocalStack() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`${ENDPOINT}/_localstack/health`)
      if (res.ok) return
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 1000))
  }
  throw new Error(`LocalStack not ready at ${ENDPOINT}`)
}

await waitForLocalStack()
await ensureRecordsTable()
await ensureWeatherTable()
await ensureMediaBucket()
console.log('LocalStack init complete')
