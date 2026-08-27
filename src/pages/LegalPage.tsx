import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { LegalLinks } from '../components/LegalLinks'
import { useAuth } from '../contexts/AuthContext'
import { LEGAL_CONTACT_URL, LEGAL_UPDATED_AT, SERVICE_NAME } from '../legal/meta'

type LegalKind = 'privacy' | 'terms'

const TITLES: Record<LegalKind, string> = {
  privacy: 'プライバシーポリシー',
  terms: '利用規約',
}

function useLegalBackTo(): string {
  const { authenticated, cloudEnabled } = useAuth()
  if (!cloudEnabled || authenticated) return '/mypage'
  return '/'
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-base font-semibold text-sky-950">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-slate-700">{children}</div>
    </section>
  )
}

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="underline decoration-slate-300 underline-offset-2 hover:text-cyan-800"
    >
      {children}
    </a>
  )
}

function PrivacyPolicyBody() {
  return (
    <>
      <p>
        {SERVICE_NAME}
        （以下「本サービス」）は、お客様の個人情報を、個人情報の保護に関する法律（以下「個人情報保護法」）その他の関係法令に従い、以下のとおり取り扱います。釣り場の位置情報は個人の行動や場所を特定しうる情報であるため、取得目的・保存期間・削除方法を明示します。
      </p>

      <Section title="1. 事業者">
        <p>
          本サービスの運営者は個人です。氏名および住所は、ご本人からの開示請求があった場合に遅滞なく回答します。
        </p>
        <p>
          お問い合わせ先:{' '}
          <ExternalLink href={LEGAL_CONTACT_URL}>GitHub Issues</ExternalLink>
        </p>
      </Section>

      <Section title="2. 取得する情報">
        <p>本サービスは、提供にあたり次の情報を取得します。</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>アカウント情報: メールアドレス、パスワード（パスワードは運営者が平文で保管しません）</li>
          <li>位置情報: GPS 座標、場所名（逆ジオコーディング結果）</li>
          <li>釣行記録: 記録日時、魚種、体長、重さ、タックル、天気・潮位などの付随情報</li>
          <li>写真: 記録に添付した画像</li>
          <li>端末内の設定: 単位設定、入力下書き、最近使った魚種など</li>
        </ul>
        <p>保存先の目安は次のとおりです。</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>メールアドレス: Amazon Cognito</li>
          <li>GPS 座標・釣り場・記録・タックル: Amazon DynamoDB および端末の IndexedDB</li>
          <li>写真: Amazon S3 および端末の IndexedDB</li>
        </ul>
      </Section>

      <Section title="3. 利用目的">
        <p>取得した情報は、次の目的にのみ利用します。</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>釣行記録の作成、保存、表示、編集、削除、端末間同期</li>
          <li>天気・潮位・場所名など、記録に付随する参考情報の取得と表示</li>
          <li>地図上での記録の表示</li>
          <li>アカウントの登録、認証、変更、退会</li>
          <li>不正利用の防止、障害対応、サービスの維持・改善</li>
          <li>サービスの運営費用を賄うための広告配信</li>
        </ul>
        <p>運営者は、個人情報を販売しません。</p>
      </Section>

      <Section title="4. 位置情報">
        <p>
          記録機能では、釣行地点を残すため端末の位置情報を取得します。利用目的は、(1)
          記録への位置の付与、(2) 天気・潮位・場所名の取得、(3)
          地図表示です。OS の許可を拒否した場合、位置付きの記録は保存できません。
        </p>
      </Section>

      <Section title="5. 写真">
        <p>
          アップロードされた写真は、端末上で再エンコードし、撮影位置などの EXIF
          情報を除去したうえで保存します。
        </p>
      </Section>

      <Section title="6. 保存場所">
        <p>
          クラウド上のデータは、Amazon Web Services（AWS）のアジアパシフィック（東京）リージョン（ap-northeast-1）に保存します。端末内のデータは、ご利用のブラウザの
          IndexedDB および localStorage に保存します。配信には Amazon CloudFront を使用します。
        </p>
      </Section>

      <Section title="7. 保存期間">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            アカウントに紐づく記録・写真・タックル: ご利用中は保存します。退会後、クラウド上の釣り記録および写真は
            7 日以内に削除します。Cognito 上のアカウントは退会手続時に削除します。
          </li>
          <li>
            端末内データ: 退会が成功した端末では、IndexedDB
            および関連する localStorage を削除します。他の端末に残ったローカルデータは、当該端末側で削除する必要があります。
          </li>
          <li>
            天気・場所名・潮位のキャッシュ: 利用者を識別しない形で保存し、最短約 15
            分から最長約 30 日で自動的に失効します。
          </li>
          <li>
            退会処理のための記録: クラウドデータの物理削除が完了するまで（退会後約 7
            日）保存し、完了後に削除します。
          </li>
        </ul>
      </Section>

      <Section title="8. 第三者提供・委託">
        <p>
          運営者は、次の場合を除き、個人情報を第三者に提供しません。法令に基づく場合、人の生命・身体・財産の保護に必要な場合、および本人の同意がある場合。
        </p>
        <p>
          サービス提供のため、次の事業者に取扱いを委託し、または機能提供に必要な範囲で情報を送信します。メールアドレスなどのアカウント情報は、天気・地図系の外部サービスには送信しません。
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>AWS: 認証、データ保存、配信、ログなどインフラの運用（委託）</li>
          <li>
            OpenWeather: 天気取得のため、約 0.01 度に丸めた位置情報を送信します
          </li>
          <li>
            OpenStreetMap Nominatim: 場所名取得のため、位置情報を送信します
          </li>
          <li>
            海上保安庁「海しる」: 最寄りの潮汐推算点を特定するため、位置情報を利用します
          </li>
          <li>
            国土地理院: 地図表示のため、ブラウザが地図タイルを取得します
          </li>
          <li>
            Google（AdSense）: 広告配信のため、Cookie
            や広告識別子を利用します。詳細は{' '}
            <ExternalLink href="https://policies.google.com/technologies/ads">
              Google の広告に関するポリシー
            </ExternalLink>
            をご覧ください
          </li>
        </ul>
        <p>運営者は、個人情報を第三者に販売しません。</p>
      </Section>

      <Section title="9. 削除・退会">
        <p>
          個別の記録は履歴画面から削除できます。アカウント全体の削除は、マイページの退会から行えます。退会後のクラウドデータ削除時期は「7.
          保存期間」のとおりです。
        </p>
      </Section>

      <Section title="10. 安全管理">
        <p>
          通信は HTTPS で行います。認証には Amazon Cognito
          を用い、クラウド上の記録・写真へはログインした本人のアカウントからのみアクセスできます。
        </p>
      </Section>

      <Section title="11. 開示・訂正・利用停止">
        <p>
          ご自身の個人情報の開示、訂正、利用停止、削除を希望される場合は、アプリ内の変更・削除機能をご利用いただくか、「1.
          事業者」記載の窓口へご連絡ください。本人確認のうえ、法令に従い対応します。
        </p>
      </Section>

      <Section title="12. Cookie 等">
        <p>
          ログイン状態の維持、記録のオフライン保存、単位設定などの動作に必要な情報を、端末の
          IndexedDB および localStorage に保存します。
        </p>
        <p>
          本サービスは、Google AdSense
          による広告配信のため、Google およびそのパートナーが Cookie
          や広告識別子を使用することがあります。これにより、本サイトや他のサイトへの過去のアクセス情報に基づく広告が表示される場合があります。
        </p>
        <p>
          パーソナライズ広告を無効にする場合は、
          <ExternalLink href="https://www.google.com/settings/ads">
            Google の広告設定
          </ExternalLink>
          からオプトアウトできます。広告に関する Google の取扱いは{' '}
          <ExternalLink href="https://policies.google.com/technologies/ads">
            広告について
          </ExternalLink>
          も参照してください。
        </p>
      </Section>

      <Section title="13. 未成年の方">
        <p>未成年の方は、保護者の同意を得たうえで本サービスをご利用ください。</p>
      </Section>

      <Section title="14. 改定">
        <p>
          本ポリシーは、法令の改正やサービス内容の変更に応じて改定することがあります。改定後の内容は、本ページに掲載した時点から効力を生じます。
        </p>
      </Section>

      <Section title="15. お問い合わせ">
        <p>
          本ポリシーおよび個人情報の取扱いに関するお問い合わせは、
          <ExternalLink href={LEGAL_CONTACT_URL}>GitHub Issues</ExternalLink>
          までご連絡ください。公開での連絡が難しい場合は、その旨を記載いただければ、個別の連絡手段をご案内します。
        </p>
      </Section>
    </>
  )
}

function TermsOfServiceBody() {
  return (
    <>
      <p>
        この利用規約（以下「本規約」）は、{SERVICE_NAME}
        （以下「本サービス」）の利用条件を定めるものです。本サービスを利用する方（以下「利用者」）は、本規約に同意したものとみなします。
      </p>

      <Section title="1. 適用">
        <p>
          本規約は、本サービスの利用に関する運営者と利用者との間の一切の関係に適用されます。新規登録時には、本規約およびプライバシーポリシーへの同意が必要です。
        </p>
      </Section>

      <Section title="2. サービス内容">
        <p>
          本サービスは、釣行時の位置、天気、潮位、魚種、写真、タックルなどを記録し、端末およびクラウドで保存・閲覧するためのアプリです。
        </p>
        <p>
          現時点で本サービスは無償で提供しており、有料プランや定期購読はありません。将来有料化する場合は、本規約を改定し、適用前に周知します。
        </p>
      </Section>

      <Section title="3. アカウント">
        <p>
          クラウド同期を利用する場合、メールアドレスとパスワードによるアカウント登録が必要です。利用者は、正確な情報を登録し、認証情報を自己の責任で管理するものとします。アカウントの第三者利用、譲渡、貸与はできません。
        </p>
      </Section>

      <Section title="4. 位置情報">
        <p>
          記録機能は位置情報の取得を前提とします。位置情報の利用目的および取扱いは、プライバシーポリシーに従います。端末または OS
          の設定で許可されない場合、当該機能は利用できません。
        </p>
      </Section>

      <Section title="5. 禁止事項">
        <p>利用者は、次の行為をしてはなりません。</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>法令または公序良俗に反する行為</li>
          <li>他者の権利、プライバシー、名誉を侵害する行為</li>
          <li>不正アクセス、本サービスの妨害、過度な負荷をかける行為</li>
          <li>虚偽の情報による登録、なりすまし</li>
          <li>本サービスを釣行記録以外の監視・追跡目的で利用する行為</li>
          <li>運営者の事前の許諾なく、本サービスを複製、改変、再配布、営利目的で無断利用する行為</li>
        </ul>
      </Section>

      <Section title="6. 気象・潮汐その他の参考情報">
        <p>
          本サービスが表示する天気、風、潮位、月齢、場所名などは、外部サービスまたは推算に基づく参考情報です。潮位は海上保安庁「海しる」の天文潮位（予測値）であり、実測値や航海用の潮汐表ではありません。
        </p>
        <p>
          気象・海況・渡船・釣行の判断は、利用者ご自身の責任で行ってください。本サービスの情報を、安全確保や釣行判断の絶対的な根拠として用いないでください。当該情報の欠落、遅延、誤差について、運営者は責任を負いません。
        </p>
      </Section>

      <Section title="7. 知的財産">
        <p>
          本サービスに関する著作権その他の権利は、運営者または正当な権利者に帰属します。魚種名の一部は日本産魚類全種目録（JAF）に基づきます。地図タイルは国土地理院の提供によるものです。各権利者の利用条件を遵守してください。
        </p>
      </Section>

      <Section title="8. 免責">
        <p>
          本サービスは現状有姿で提供されます。運営者は、本サービスが中断なく、誤りなく、利用者の特定の目的に適合することを保証しません。記録の消失、端末間の同期遅延、外部 API
          の停止・仕様変更により生じた損害について、運営者は、運営者の故意または重過失による場合を除き、責任を負いません。
        </p>
        <p>
          本サービスは無償提供であるため、法令上免責が認められない場合を除き、運営者の損害賠償責任は生じないものとします。
        </p>
      </Section>

      <Section title="9. 変更・中断・終了">
        <p>
          運営者は、利用者への事前の通知なく、本サービスの内容を変更し、または一時的に中断することができます。本サービスを終了する場合は、可能な範囲で事前に周知します。
        </p>
      </Section>

      <Section title="10. 退会">
        <p>
          利用者は、マイページの退会手続によりいつでも利用を終了できます。退会後のデータの取扱いは、プライバシーポリシーに従います。
        </p>
      </Section>

      <Section title="11. 準拠法・管轄">
        <p>
          本規約は日本法に準拠します。本サービスに関する紛争については、東京地方裁判所を第一審の専属的合意管轄裁判所とします。
        </p>
      </Section>

      <Section title="12. 改定">
        <p>
          運営者は、必要に応じて本規約を改定できます。改定後の規約は、本ページに掲載した時点から効力を生じます。利用者が改定後も本サービスを利用した場合、改定後の規約に同意したものとみなします。
        </p>
      </Section>

      <Section title="13. お問い合わせ">
        <p>
          本規約に関するお問い合わせは、
          <ExternalLink href={LEGAL_CONTACT_URL}>GitHub Issues</ExternalLink>
          までご連絡ください。
        </p>
      </Section>
    </>
  )
}

export function LegalPage({ kind }: { kind: LegalKind }) {
  const title = TITLES[kind]
  const backTo = useLegalBackTo()

  useEffect(() => {
    const previous = document.title
    document.title = `${title} | ${SERVICE_NAME}`
    return () => {
      document.title = previous
    }
  }, [title])

  return (
    <main className="flex flex-1 flex-col px-4 pb-8 pt-6">
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium tracking-wide text-cyan-700">{SERVICE_NAME}</p>
          <h1 className="mt-1 text-2xl font-semibold text-sky-950">{title}</h1>
          <p className="mt-2 text-sm text-slate-500">施行日: {LEGAL_UPDATED_AT}</p>
        </div>
        <Link
          to={backTo}
          className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm font-medium text-cyan-800 shadow-sm"
        >
          戻る
        </Link>
      </header>

      <article className="space-y-6">
        {kind === 'privacy' ? <PrivacyPolicyBody /> : <TermsOfServiceBody />}
      </article>

      <div className="mt-8 border-t border-sky-100 pt-4">
        <LegalLinks />
      </div>
    </main>
  )
}
