/** OpenWeatherMap 帰属表示（ODbL ライセンス要件） */
export function WeatherAttribution({ className = '' }: { className?: string }) {
  return (
    <p className={`text-xs text-slate-400 ${className}`.trim()}>
      天気データ:{' '}
      <a
        href="https://openweathermap.org/"
        target="_blank"
        rel="noopener noreferrer"
        className="underline decoration-slate-300 underline-offset-2 hover:text-slate-600"
      >
        OpenWeather
      </a>
    </p>
  )
}
