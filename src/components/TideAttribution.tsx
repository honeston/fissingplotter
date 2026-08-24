/** 海しる（海上保安庁）潮汐推算の帰属表示 */
export function TideAttribution({ className = '' }: { className?: string }) {
  return (
    <p className={`text-xs text-slate-400 ${className}`.trim()}>
      潮位データ:{' '}
      <a
        href="https://www.msil.go.jp/"
        target="_blank"
        rel="noopener noreferrer"
        className="underline decoration-slate-300 underline-offset-2 hover:text-slate-600"
      >
        海しる（海上保安庁）
      </a>
      の天文潮位（予測値）
    </p>
  )
}
