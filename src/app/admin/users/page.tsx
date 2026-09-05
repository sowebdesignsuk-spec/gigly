import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { eraseUser, setUserStatus } from "../actions";

export const metadata: Metadata = { title: "Users · Admin" };

type Search = Promise<{ q?: string }>;

const STATUS_STYLE: Record<string, string> = {
  active: "bg-go/15 text-go",
  suspended: "bg-hold/15 text-hold",
  deleted: "bg-ink-700 text-chalk-faint",
};

/**
 * User management — Section 5, Week 9.1 and 9.2.
 *
 * Email and role live in profile_private, which admins can read in full. The
 * join is an embed on the primary-key relationship, so it is one query.
 */
export default async function AdminUsersPage({ searchParams }: { searchParams: Search }) {
  const { q } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user: me },
  } = await supabase.auth.getUser();

  const term = q?.trim();

  // Search spans two tables. Matching emails are resolved to ids first, then
  // combined with the name match — PostgREST cannot OR across an embed.
  let idsByEmail: string[] = [];
  if (term) {
    const { data } = await supabase
      .from("profile_private")
      .select("user_id")
      .ilike("email", `%${term}%`)
      .limit(100);
    idsByEmail = (data ?? []).map((r) => r.user_id);
  }

  let query = supabase
    .from("profiles")
    .select(
      "id, full_name, account_type, status, onboarding_complete, created_at, profile_private(email, role)",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (term) {
    const clauses = [`full_name.ilike.%${term}%`];
    if (idsByEmail.length) clauses.push(`id.in.(${idsByEmail.join(",")})`);
    query = query.or(clauses.join(","));
  }

  const { data: users } = await query;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-sm text-chalk-dim">Newest first. Showing up to 100.</p>
        </div>

        <form method="get" role="search" className="flex gap-2">
          <input
            name="q"
            type="search"
            defaultValue={q ?? ""}
            placeholder="Email or name"
            className="rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-chalk placeholder:text-chalk-faint focus:border-hot-500 focus:outline-none"
          />
          <Button type="submit" variant="secondary" className="px-4 py-2 text-xs">
            Search
          </Button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-xl border border-ink-700">
        <table className="w-full min-w-[56rem] text-sm">
          <thead className="bg-ink-800 text-left text-xs tracking-wide text-chalk-faint uppercase">
            <tr>
              <th className="px-4 py-3 font-semibold">User</th>
              <th className="px-4 py-3 font-semibold">Type</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Joined</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-700">
            {(users ?? []).map((u) => {
              const isMe = u.id === me?.id;
              const gone = u.status === "deleted";
              const priv = u.profile_private;

              return (
                <tr key={u.id} className="align-top">
                  <td className="px-4 py-3">
                    <p className="font-medium text-chalk">
                      {u.full_name || <span className="text-chalk-faint">(no name)</span>}
                      {priv?.role === "admin" ? (
                        <span className="ml-2 rounded-full bg-hold/15 px-2 py-0.5 text-xs text-hold">
                          admin
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-chalk-dim">{priv?.email ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-chalk-dim capitalize">
                    {u.account_type}
                    {!u.onboarding_complete && !gone ? (
                      <span className="block text-xs text-chalk-faint">profile incomplete</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLE[u.status] ?? ""}`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-chalk-dim tabular-nums">
                    {new Date(u.created_at).toLocaleDateString("en-GB")}
                  </td>
                  <td className="px-4 py-3">
                    {isMe || gone ? (
                      <span className="text-xs text-chalk-faint">{isMe ? "you" : "—"}</span>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <form action={setUserStatus}>
                          <input type="hidden" name="user_id" value={u.id} />
                          <input
                            type="hidden"
                            name="status"
                            value={u.status === "suspended" ? "active" : "suspended"}
                          />
                          <Button type="submit" variant="secondary" className="px-3 py-1.5 text-xs">
                            {u.status === "suspended" ? "Reinstate" : "Suspend"}
                          </Button>
                        </form>

                        <details className="group">
                          <summary className="cursor-pointer list-none rounded-lg px-3 py-1.5 text-xs text-stop hover:bg-stop/10">
                            Erase…
                          </summary>
                          <form
                            action={eraseUser}
                            className="mt-2 w-64 space-y-2 rounded-lg border border-stop/40 bg-ink-900 p-3"
                          >
                            <input type="hidden" name="user_id" value={u.id} />
                            <p className="text-xs text-chalk-dim">
                              Removes all personal data. If they have bookings, the account is
                              anonymised and the booking records kept; otherwise it&apos;s deleted
                              outright. No undo.
                            </p>
                            <input
                              name="confirm"
                              placeholder="Type ERASE"
                              autoComplete="off"
                              className="w-full rounded-md border border-ink-600 bg-ink-800 px-2 py-1.5 text-xs text-chalk"
                            />
                            <Button
                              type="submit"
                              variant="secondary"
                              className="w-full px-3 py-1.5 text-xs text-stop"
                            >
                              Erase this user
                            </Button>
                          </form>
                        </details>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
