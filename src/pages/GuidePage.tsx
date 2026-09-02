import { BookOpen } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  EncyclopediaScreenMock,
  HistoryScreenMock,
  RecordScreenMock,
} from '../components/AppScreenMocks'
import { LegalLinks } from '../components/LegalLinks'
import { PageHeader } from '../components/ui/PageHeader'
import { useAuth } from '../contexts/AuthContext'
import { SERVICE_NAME } from '../legal/meta'

function useGuideBackTo(): string {
  const { authenticated, cloudEnabled } = useAuth()
  if (!cloudEnabled || authenticated) return '/mypage'
  return '/'
}

function Section({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-4">
      <h2 className="mb-2 text-base font-semibold text-sky-950">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-slate-700">{children}</div>
    </section>
  )
}

const TOC = [
  { href: '#about', label: 'cast mark とは' },
  { href: '#features', label: 'できること' },
  { href: '#start', label: 'はじめ方' },
  { href: '#record', label: '記録のしかた' },
  { href: '#history', label: '履歴と地図' },
  { href: '#mypage', label: 'マイページ' },
  { href: '#notes', label: '天気・潮位について' },
  { href: '#faq', label: 'よくある質問' },
] as const

export function GuidePage() {
  const backTo = useGuideBackTo()
  const { authenticated, cloudEnabled } = useAuth()
  const startHref = !cloudEnabled || authenticated ? '/' : '/login?mode=signup'

  useEffect(() => {
    const previous = document.title
    document.title = `使い方 | ${SERVICE_NAME}`
    return () => {
      document.title = previous
    }
  }, [])

  return (
    <main className="flex flex-1 flex-col px-4 pb-8 pt-6">
      <PageHeader title="使い方" icon={BookOpen} backTo={backTo} backLabel="戻る" />

      <nav aria-label="目次" className="mb-8 rounded-xl border border-sky-200 bg-white px-4 py-3 shadow-sm">
        <p className="mb-2 text-sm font-medium text-sky-900">目次</p>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-cyan-800">
          {TOC.map((item) => (
            <li key={item.href}>
              <a href={item.href} className="underline decoration-slate-300 underline-offset-2">
                {item.label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <article className="space-y-8">
        <Section id="about" title="cast mark とは">
          <p>
            {SERVICE_NAME}
            は、釣り場で「いま」の条件と釣果をワンタップで残す記録アプリです。スマホのブラウザで開き、ホーム画面に追加して使えます。ノートや地図アプリを行き来せず、釣れた瞬間の位置・天気・潮位を同じ記録にまとめることを目的にしています。
          </p>
          <p>
            記録の本体はご自身の釣行ログです。公開の釣り場データベースや、他の利用者のポイントを共有するサービスではありません。残した座標や写真は、アカウントに紐づいて保存され、本人以外は見られません。
          </p>
        </Section>

        <Section id="features" title="できること">
          <p>主な機能は次のとおりです。</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="font-medium text-sky-950">ワンタップ記録:</strong>{' '}
              「記録する」を押すと、現在地、気温・天気、潮位を取得して保存します。魚種、体長、重さ、写真、タックルは任意です。
            </li>
            <li>
              <strong className="font-medium text-sky-950">履歴:</strong>{' '}
              日付カレンダー、地図、一覧で過去の釣果を振り返れます。記録を開いて編集・削除できます。
            </li>
            <li>
              <strong className="font-medium text-sky-950">マイ魚種図鑑:</strong>{' '}
              釣った魚種数と釣果数の合計、魚種ごとの尾数や最大サイズを、記録から自動で集計します。
            </li>
            <li>
              <strong className="font-medium text-sky-950">マイタックル:</strong>{' '}
              ロッド、リール、ライン、ルアー／エサ、仕掛けをセットとして保存し、記録時に呼び出せます。
            </li>
            <li>
              <strong className="font-medium text-sky-950">端末とクラウド:</strong>{' '}
              記録は端末内にも保存されます。通信できないときも端末へ残り、復帰後に同期します。
            </li>
          </ul>
        </Section>

        <Section id="start" title="はじめ方">
          <p>
            クラウド同期を使う場合は、メールアドレスとパスワードでアカウントを作成します。新規登録時には利用規約とプライバシーポリシーへの同意が必要です。確認コードがメールに届いたら入力して、ログインしてください。パスワードを忘れた場合は、ログイン画面から再設定できます。
          </p>
          <p>
            記録では位置情報を使います。ブラウザまたは OS から位置情報の許可を求められるので、許可すると現在地・天気・潮位が記録に付きます。拒否した場合でも、座標なしの記録として保存できます。
          </p>
          <p>
            スマートフォンのブラウザで「ホーム画面に追加」すると、アプリのように全画面で開けます。通信は HTTPS です。
          </p>
          <p>
            <Link to={startHref} className="font-medium text-cyan-800 underline underline-offset-2">
              {authenticated || !cloudEnabled ? '記録画面を開く' : '無料ではじめる'}
            </Link>
          </p>
        </Section>

        <Section id="record" title="記録のしかた">
          <p>
            画面下の「記録」タブが、釣行中のメイン画面です。入力はすべて任意なので、何も書かずにボタンだけ押しても残せます。釣れた直後に押して、魚種やサイズはあとから履歴で足す使い方もできます。
          </p>
          <RecordScreenMock />
          <ol className="list-decimal space-y-2 pl-5">
            <li>写真を撮るか、端末のアルバムから選びます。保存時に再エンコードし、撮影位置などの EXIF は取り除きます。</li>
            <li>魚種を入力します。日本語の標準和名を候補から選べます。別名で入れても、できる範囲で標準和名に揃えます。</li>
            <li>体長と重さを入れます。単位はマイページで cm / inch、g / kg / oz を切り替えられます。保存値は変わりません。</li>
            <li>
              必要なら「タックル入力を開く」から、セット名、ロッド、リール、ライン、ルアー／エサ、仕掛けを記入します。よく使う組み合わせはマイタックルに保存し、次回呼び出してください。「次回もこのタックルを使う」をオンにすると、記録後も入力が残ります。
            </li>
            <li>
              「記録する」を押します。現在地の取得、天気・気温、潮位の取得、保存、写真のアップロードが順に進みます。位置が取れないときや、天気・潮位が失敗したときも、取れた項目だけで保存します。オフラインのときは端末のみに残り、通信復帰後にクラウドへ同期します。
            </li>
          </ol>
          <p>
            保存が終わると、その場のサマリーが表示されます。「続けて記録」で同じ場所の次の一尾へ進めます。
          </p>
        </Section>

        <Section id="history" title="履歴と地図">
          <p>
            「履歴」タブでは、保存した記録を日付と場所で振り返ります。カレンダーで開始日と終了日をタップすると期間を絞り込めます。期間の下には地図があり、記録した地点が並びます。地図のピンをタップすると、その場所の記録が開きます。
          </p>
          <HistoryScreenMock />
          <p>
            一覧のカードを開くと、写真、魚種、サイズ、天気、潮位、タックル、座標を確認できます。クラウドに繋がっていて位置がある記録では、その日の潮位グラフ（記録時刻の印と満潮・干潮）も出ます。位置や魚種の打ち間違いがあればここで直し、不要な記録は削除できます。地図タイルは国土地理院の標準地図です。日本国内の記録を想定しています。
          </p>
        </Section>

        <Section id="mypage" title="マイページ">
          <p>
            画面下の「図鑑」タブがマイ魚種図鑑です。これまでに残した記録を魚種ごとに集計します。先頭に魚種数と釣果数の合計が出ます。尾数や最大サイズで並べ替えられます。魚種を選ぶと、その魚の記録だけを時系列で見られます。タックル帳、単位、アカウント設定は、その右の「マイ」タブから開きます。
          </p>
          <EncyclopediaScreenMock />
          <p>
            アカウントではメールアドレスの変更、パスワードの変更、退会ができます。退会するとクラウド上の釣り記録と写真は所定の期間内に削除されます。くわしくはプライバシーポリシーを確認してください。
          </p>
        </Section>

        <Section id="notes" title="天気・潮位について">
          <p>
            気温と天気は OpenWeatherMap の現在値です。潮位は海上保安庁「海しる」の天文潮位（予測値）で、最寄りの推算点を使います。実測の潮位表や、航海用の資料ではありません。月齢や潮種はアプリ側で算出しています。
          </p>
          <p>
            場所名は、座標から逆ジオコーディングした結果です。取れないときは座標だけが残ります。これらの情報は釣行判断の参考であり、安全確認の根拠にはしないでください。
          </p>
        </Section>

        <Section id="faq" title="よくある質問">
          <p>
            <strong className="font-medium text-sky-950">無料で使えますか。</strong>
            現時点では無償で提供しています。有料プランはありません。
          </p>
          <p>
            <strong className="font-medium text-sky-950">アカウントは必要ですか。</strong>
            クラウドへ同期して複数の端末で見る場合は必要です。記録そのものは端末内にも保存されます。
          </p>
          <p>
            <strong className="font-medium text-sky-950">位置情報をオフにしても使えますか。</strong>
            使えます。座標・天気・潮位は付きませんが、魚種や写真などの入力は保存できます。
          </p>
          <p>
            <strong className="font-medium text-sky-950">他の人に釣り場は見えますか。</strong>
            見えません。記録はログインした本人のアカウントにだけ紐づきます。
          </p>
          <p>
            <strong className="font-medium text-sky-950">問い合わせ先は。</strong>
            GitHub Issues から連絡できます。公開での連絡が難しい場合は、その旨を書いてください。
          </p>
        </Section>
      </article>

      <div className="mt-8 rounded-xl border border-sky-200 bg-white px-4 py-4 shadow-sm">
        <p className="text-sm font-medium text-sky-950">使ってみる</p>
        <p className="mt-1 text-sm text-slate-500">
          アカウントを作ると、記録の同期と履歴の振り返りが使えます。
        </p>
        <Link
          to={startHref}
          className="mt-3 flex min-h-11 items-center justify-center rounded-xl bg-cyan-700 px-4 py-2 text-sm font-semibold text-white shadow-sm"
        >
          {authenticated || !cloudEnabled ? '記録をはじめる' : '無料ではじめる'}
        </Link>
      </div>

      <div className="mt-8 border-t border-sky-100 pt-4">
        <LegalLinks />
      </div>
    </main>
  )
}
