import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createS3Client } from './awsClients.js'

const BUCKET = process.env.MEDIA_BUCKET_NAME ?? ''
const PRESIGN_EXPIRES = 900

const s3 = createS3Client()

/** LocalStack 用: コンテナ内ホスト名をブラウザから到達可能な URL に置換 */
function publicPresignUrl(url: string): string {
  const publicBase = process.env.AWS_ENDPOINT_URL_PUBLIC
  const internal = process.env.AWS_ENDPOINT_URL
  if (!publicBase || !internal || internal === publicBase) return url
  return url.replace(internal, publicBase)
}

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
  const uploadUrl = publicPresignUrl(await getSignedUrl(s3, command, { expiresIn: PRESIGN_EXPIRES }))
  return { uploadUrl, photoKey: key, expiresIn: PRESIGN_EXPIRES }
}

export async function presignPhotoView(
  userId: string,
  recordId: string,
): Promise<{ viewUrl: string; expiresIn: number }> {
  const key = photoKey(userId, recordId)
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key })
  const viewUrl = publicPresignUrl(await getSignedUrl(s3, command, { expiresIn: PRESIGN_EXPIRES }))
  return { viewUrl, expiresIn: PRESIGN_EXPIRES }
}

export async function deletePhoto(userId: string, recordId: string): Promise<void> {
  const key = photoKey(userId, recordId)
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
}

export async function deletePhotoByKey(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
}
