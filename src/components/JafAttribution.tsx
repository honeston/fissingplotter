const JAF_LIST_URL = 'https://www.museum.kagoshima-u.ac.jp/staff/motomura/jaf.html'

/** 日本産魚類全種目録（JAF）の出典。利用明記が求められている */
export function JafAttribution({ className = '' }: { className?: string }) {
  return (
    <p className={`text-xs text-slate-400 ${className}`.trim()}>
      魚種名:{' '}
      <a
        href={JAF_LIST_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="underline decoration-slate-300 underline-offset-2 hover:text-slate-600"
      >
        本村浩之「日本産魚類全種目録」（JAF）
      </a>
    </p>
  )
}
