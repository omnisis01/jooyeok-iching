// 산통 새 디자인 시안. 앱에 넣기 전에 휴대폰에서 직접 흔들어 보는 시험용 페이지(검색에 노출하지 않는다)
import type { Metadata } from "next";
import SantongLab from "./SantongLab";

export const metadata: Metadata = { title: "산통 시안", robots: { index: false } };

export default function SantongLabPage() {
  return <SantongLab />;
}
