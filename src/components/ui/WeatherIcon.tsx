import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Sun,
  type LucideIcon,
} from 'lucide-react'
import { weatherCodeLabel } from '../../lib/weatherCode'
import { Icon, type IconSize } from './Icon'

export function weatherIconForCode(code: number | null): LucideIcon {
  if (code == null) return Cloud
  if (code === 0) return Sun
  if (code <= 2) return CloudSun
  if (code === 3) return Cloud
  if (code === 45 || code === 48) return CloudFog
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return CloudRain
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return CloudSnow
  if (code >= 95) return CloudLightning
  return Cloud
}

interface WeatherIconProps {
  code: number | null
  size?: IconSize
  className?: string
}

export function WeatherIcon({ code, size = 'sm', className = '' }: WeatherIconProps) {
  const LucideIcon = weatherIconForCode(code)
  const label = code != null ? weatherCodeLabel(code) : '天気不明'
  return <Icon icon={LucideIcon} size={size} className={className} label={label} />
}
