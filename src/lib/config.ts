/** AWS / Cognito / API 設定（ビルド時に Vite が注入） */
export const awsConfig = {
  region: import.meta.env.VITE_AWS_REGION ?? 'ap-northeast-1',
  apiUrl: import.meta.env.VITE_API_URL ?? '',
  userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID ?? '',
  clientId: import.meta.env.VITE_COGNITO_CLIENT_ID ?? '',
}

/** クラウド同期が有効か（本番 AWS デプロイ時は true） */
export function isCloudSyncEnabled(): boolean {
  return Boolean(awsConfig.apiUrl && awsConfig.userPoolId && awsConfig.clientId)
}
