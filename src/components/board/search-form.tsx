import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EMPLOYMENT_TYPES, JOB_CATEGORIES, PREFECTURES, SALARY_TYPES } from "@/lib/master-data";
import type { SearchParams } from "@/server/domain/job-search";
import { SORTS } from "@/server/domain/job-search";
import { Select } from "./form-field";

/**
 * 求人の絞り込み（FR-018, FR-019）。JavaScript がなくても動く GET フォーム。
 * 並び順は「新着順」「給与の高い順」だけ（基準が名前で分かるもの）。
 */
export function SearchForm({
  params,
  compact = false,
}: {
  params: Partial<SearchParams>;
  compact?: boolean;
}) {
  const advanced = (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <label className="space-y-1 text-sm font-bold">
        職種
        <Select name="category" defaultValue={params.category ?? ""}>
          <option value="">すべて</option>
          {Object.entries(JOB_CATEGORIES).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </Select>
      </label>
      <label className="space-y-1 text-sm font-bold">
        勤務地
        <Select name="prefecture" defaultValue={params.prefecture ?? ""}>
          <option value="">すべて</option>
          {PREFECTURES.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </Select>
      </label>
      <label className="space-y-1 text-sm font-bold">
        雇用形態
        <Select name="type" defaultValue={params.type ?? ""}>
          <option value="">すべて</option>
          {Object.entries(EMPLOYMENT_TYPES).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1 text-sm font-bold">
          給与
          <Select name="salaryType" defaultValue={params.salaryType ?? ""}>
            <option value="">指定なし</option>
            {Object.entries(SALARY_TYPES).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </label>
        <label className="space-y-1 text-sm font-bold">
          いくら以上（円）
          <Input
            name="salaryMin"
            inputMode="numeric"
            defaultValue={params.salaryMin ?? ""}
            placeholder="例：1200"
          />
        </label>
      </div>
      <label className="space-y-1 text-sm font-bold">
        並び順
        <Select name="sort" defaultValue={params.sort ?? "NEWEST"}>
          {Object.entries(SORTS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
              {k === "SALARY_DESC" ? "（給与の種類を選ぶと使えます）" : ""}
            </option>
          ))}
        </Select>
      </label>
    </div>
  );

  return (
    <search>
      <form action="/jobs" method="get" className="pop-card space-y-4 p-4 sm:p-5">
        <div className="flex gap-2">
          <label className="sr-only" htmlFor="q">
            キーワード
          </label>
          <Input
            id="q"
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="キーワード（例：カフェ、エンジニア）"
          />
          <Button type="submit" className="shrink-0">
            <Search /> さがす
          </Button>
        </div>
        {compact ? (
          <details
            open={Boolean(
              params.category ||
                params.prefecture ||
                params.type ||
                params.salaryType ||
                params.sort === "SALARY_DESC",
            )}
          >
            <summary className="cursor-pointer text-sm font-bold">
              くわしい条件（職種・勤務地・雇用形態・給与・並び順）
            </summary>
            <div className="mt-3">{advanced}</div>
          </details>
        ) : (
          advanced
        )}
      </form>
    </search>
  );
}
