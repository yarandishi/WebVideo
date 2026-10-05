import { NextResponse } from "next/server";
import {
  checkPassword,
  createSessionCookie,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { password?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "درخواست نامعتبر است" },
      { status: 400 },
    );
  }
  const password = String(body?.password ?? "");
  if (!password) {
    return NextResponse.json(
      { error: "رمز را وارد کنید" },
      { status: 400 },
    );
  }
  if (!checkPassword(password)) {
    return NextResponse.json(
      { error: "رمز اشتباه است" },
      { status: 401 },
    );
  }
  const headers = new Headers();
  headers.append("Set-Cookie", createSessionCookie());
  return NextResponse.json(
    { ok: true },
    {
      status: 200,
      headers,
    },
  );
}
