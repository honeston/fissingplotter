import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { S3Client, type S3ClientConfig } from '@aws-sdk/client-s3'

function localEndpointConfig() {
  const endpoint = process.env.AWS_ENDPOINT_URL
  if (!endpoint) return null

  return {
    endpoint,
    region: process.env.AWS_REGION ?? 'ap-northeast-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? 'test',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? 'test',
    },
  }
}

export function createDynamoClient(): DynamoDBDocumentClient {
  const local = localEndpointConfig()
  const client = new DynamoDBClient(local ?? {})
  return DynamoDBDocumentClient.from(client)
}

export function createS3Client(): S3Client {
  const local = localEndpointConfig()
  const config: S3ClientConfig = local ? { ...local, forcePathStyle: true } : {}
  return new S3Client(config)
}

export function isLocalDev(): boolean {
  return process.env.LOCAL_DEV === 'true' || Boolean(process.env.AWS_ENDPOINT_URL)
}
