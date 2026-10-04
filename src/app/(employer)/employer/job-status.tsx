import { Badge } from "@/components/ui/badge";

export const JOB_STATUS = {
  DRAFT: { label: "下書き", variant: "secondary" },
  PUBLISHED: { label: "公開中", variant: "mint" },
  CLOSED: { label: "募集終了", variant: "outline" },
  EXPIRED: { label: "掲載期限切れ", variant: "outline" },
  HIDDEN: { label: "運営が掲載を停止中", variant: "destructive" },
} as const;

export function JobStatusBadge({ status }: { status: keyof typeof JOB_STATUS }) {
  const s = JOB_STATUS[status];
  return <Badge variant={s.variant}>{s.label}</Badge>;
}
