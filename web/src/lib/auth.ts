import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

export async function requireAuth() {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join('; ');
  
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";
    const res = await fetch(`${apiUrl}/auth/get-session`, {
      headers: {
        cookie: allCookies,
      },
    });

    if (!res.ok) {
      redirect("/login");
    }

    const data = await res.json();
    if (!data || !data.session) {
      redirect("/login");
    }

    return data.user;
  } catch (error) {
    console.error("Auth check failed", error);
    redirect("/login");
  }
}
