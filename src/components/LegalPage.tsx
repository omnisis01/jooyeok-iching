// 이용약관, 개인정보처리방침처럼 긴 글을 보여주는 공용 페이지 틀
import Taegeuk from "./Taegeuk";

export default function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="app-backdrop min-h-screen">
      <div className="mx-auto max-w-2xl px-5 py-8 sm:px-8">
        <a href="./" className="inline-flex items-center gap-2 text-lg font-bold">
          <Taegeuk size={26} />
          나만의 정통주역운세
        </a>
        <h1 className="mt-6 text-3xl font-extrabold">{title}</h1>
        <p className="mt-1 text-sm text-muted">최근 수정 {updated}</p>
        <div className="legal mt-6 rounded-3xl bg-card p-6 shadow-[0_6px_30px_rgba(31,29,26,0.06)] sm:p-8">{children}</div>
        <p className="mt-6 text-center text-xs text-muted">
          <a href="./" className="underline">앱으로 돌아가기</a>
        </p>
      </div>
    </div>
  );
}
