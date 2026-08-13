import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const BUCKET = process.env.MEDIA_BUCKET_NAME ?? ''
const PRESIGN_EXPIRES = 900

const s3 = new S3Client({})

export function photoKey(userId: string, recordId: string): string {
  return `${userId}/${recordId}.jpg`
}

export async function presignPhotoUpload(
  userId: string,
  recordId: string,
): Promise<{ uploadUrl: string; photoKey: string; expiresIn: number }> {
  const key = photoKey(userId, recordId)
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: 'image/jpeg',
  })
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: PRESIGN_EXPIRES })
  return { uploadUrl, photoKey: key, expiresIn: PRESIGN_EXPIRES }
}

export async function presignPhotoView(
  userId: string,
  recordId: string,
): Promise<{ viewUrl: string; expiresIn: number }> {
  const key = photoKey(userId, recordId)
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key })
  const viewUrl = await getSignedUrl(s3, command, { expiresIn: PRESIGN_EXPIRES })
  return { viewUrl, expiresIn: PRESIGN_EXPIRES }
}

export async function deletePhoto(userId: string, recordId: string): Promise<void> {
  const key = photoKey(userId, recordId)
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
}

export async function deletePhotoByKey(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
}
