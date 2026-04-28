import { getSession } from "@/lib/session";
export default async function Dashboard() {
  const s = (await getSession())!;
  return <h1 className="text-2xl font-semibold">Welcome, {s.role}</h1>;
}
