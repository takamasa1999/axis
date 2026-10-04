import { formatDate } from "@/lib/format";
import { requireOperator } from "@/server/auth/guards";
import { listInquiries } from "@/server/domain/inquiry";
import { InquiryUpdate } from "./inquiry-update";

export const metadata = { title: "お問い合わせ | Axis 運営" };

const CATEGORY = { COMPLAINT: "苦情・困りごと", QUESTION: "質問", OTHER: "その他" } as const;

export default async function InquiriesPage() {
  const op = await requireOperator();
  const inquiries = await listInquiries(op);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">お問い合わせ（受付の古い順）</h1>
      {inquiries.length === 0 ? (
        <p className="text-sm text-muted-foreground">対応待ちのお問い合わせはありません。</p>
      ) : (
        <ul className="space-y-3">
          {inquiries.map((q) => {
            const notes = (q.notes as { at: string; note: string; status: string }[]) ?? [];
            return (
              <li key={q.id} className="pop-card space-y-2 p-5 text-sm">
                <p className="font-bold">
                  {CATEGORY[q.category]}・{q.status}・受付 {formatDate(q.receivedAt)}・{q.email}
                </p>
                <p className="whitespace-pre-wrap">{q.body}</p>
                {notes.length > 0 && (
                  <ul className="space-y-1 border-t-2 border-dashed border-ink/20 pt-2 text-xs">
                    {notes.map((n) => (
                      <li key={n.at}>
                        {new Date(n.at).toLocaleString("ja-JP")}［{n.status}］{n.note}
                      </li>
                    ))}
                  </ul>
                )}
                <InquiryUpdate inquiryId={q.id} status={q.status} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
