import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    const vaultPassword = process.env.VAULT_PASSWORD;

    if (!vaultPassword) {
      return NextResponse.json(
        { error: "Vault password not configured on server" },
        { status: 500 }
      );
    }

    if (password === vaultPassword) {
      const cookieStore = await cookies();
      cookieStore.set("vault_auth", "true", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: "/",
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
