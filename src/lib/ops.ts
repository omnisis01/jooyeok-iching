// 문의, 후기, 관리자 결제 관리. 쓰기와 관리자 기능은 모두 서버 함수(0010_ops.sql)가 길이, 횟수, 권한을 확인한다
import { cloudEnabled, supabase } from "./supabase";
import { anonId } from "./track";

export type InquiryCategory = "payment" | "bug" | "idea" | "other";
export const INQUIRY_LABEL: Record<InquiryCategory, string> = { payment: "결제", bug: "오류", idea: "제안", other: "기타" };

export type Inquiry = { id: number; email: string | null; category: InquiryCategory; message: string; status: "new" | "answered" | "closed"; reply: string | null; replied_at: string | null; created_at: string; member?: boolean };
export type Review = { id: number; rating: number; comment: string | null; hexagram: number | null; category: string | null; public_ok: boolean; featured: boolean; created_at: string };
export type FeaturedReview = { rating: number; comment: string; hexagram: number | null; category: string | null; day: string };

function message(e: { message?: string } | null, fallback: string): string {
  const m = e?.message ?? "";
  if (m.includes("too many")) return "잠시 후 다시 보내 주세요";
  if (m.includes("email required")) return "답장 받을 이메일을 적어 주세요";
  if (m.includes("admin only")) return "관리자만 할 수 있어요";
  if (m.includes("no such user")) return "그 이메일로 가입한 사람이 없어요";
  return fallback;
}

async function rpc<T>(fn: string, args: Record<string, unknown> = {}, fail = "요청을 처리하지 못했어요"): Promise<T> {
  if (!cloudEnabled) throw new Error("지금은 서버에 연결할 수 없어요");
  const { data, error } = await supabase().rpc(fn, args);
  if (error) throw new Error(message(error, fail));
  return data as T;
}

export const submitInquiry = (category: InquiryCategory, text: string, email: string) =>
  rpc("submit_inquiry", { p_category: category, p_message: text, p_email: email, p_anon: anonId() ?? "" }, "문의를 보내지 못했어요");

/** 로그인한 사람의 문의와 답변 */
export async function myInquiries(): Promise<Inquiry[]> {
  if (!cloudEnabled) return [];
  const { data: s } = await supabase().auth.getSession();
  if (!s.session) return [];
  const { data } = await supabase().from("inquiries").select("id, email, category, message, status, reply, replied_at, created_at").eq("user_id", s.session.user.id).order("created_at", { ascending: false }).limit(20);
  return (data as Inquiry[] | null) ?? [];
}

export const submitReview = (key: string, hexagram: number, category: string, rating: number, comment: string, publicOk: boolean) =>
  rpc("submit_review", { p_key: key, p_hexagram: hexagram, p_category: category, p_rating: rating, p_comment: comment, p_public: publicOk, p_anon: anonId() ?? "" }, "후기를 보내지 못했어요");

export async function featuredReviews(): Promise<FeaturedReview[]> {
  if (!cloudEnabled) return [];
  const { data } = await supabase().rpc("featured_reviews");
  return (data as FeaturedReview[] | null) ?? [];
}

export const adminInquiries = (status: string | null) => rpc<Inquiry[]>("admin_inquiries", { p_status: status });
export const adminReplyInquiry = (id: number, reply: string, status: Inquiry["status"]) => rpc("admin_reply_inquiry", { p_id: id, p_reply: reply, p_status: status });
export const adminReviews = () => rpc<Review[]>("admin_reviews");
export const adminFeatureReview = (id: number, featured: boolean) => rpc("admin_feature_review", { p_id: id, p_featured: featured });
export type AdminPayments = {
  payments: { order_id: string; amount: number; status: string; approved_at: string | null; created_at: string; email: string | null }[];
  pro: { email: string; premium_until: string; billing_status: string | null }[];
};
export const adminPayments = () => rpc<AdminPayments>("admin_payments");
export const adminGrantPro = (email: string, days: number) => rpc<{ premium_until: string | null }>("admin_grant_pro", { p_email: email, p_days: days });
