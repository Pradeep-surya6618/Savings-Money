"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb/connect";
import { User } from "@/models/User";
import { Session } from "@/models/Session";
import { Settings } from "@/models/Settings";
import { Savings } from "@/models/Savings";
import { VerificationToken } from "@/models/VerificationToken";
import { createSession, destroySession } from "@/lib/auth/session";
import { generateOtp, generateToken, hashSecret, verifySecret, isExpired } from "@/lib/auth/tokens";
import { sendMail } from "@/lib/email/mailer";
import { otpEmail, resetEmail } from "@/lib/email/templates";
import {
  sendOtpSchema,
  verifyOtpSchema,
  completeSignupSchema,
  loginSchema,
  requestResetSchema,
  resetPasswordSchema,
  type SendOtpInput,
  type VerifyOtpInput,
  type CompleteSignupInput,
  type LoginInput,
  type RequestResetInput,
  type ResetPasswordInput,
} from "@/validations/auth";

type Result = { ok: true } | { ok: false; error: string };

const OTP_TTL = 10 * 60 * 1000;
const TICKET_TTL = 15 * 60 * 1000;
const RESET_TTL = 60 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const SIGNUP_COOKIE = "fufi_signup";
const isProd = process.env.NODE_ENV === "production";

async function originUrl(): Promise<string> {
  if (process.env.APP_URL) return process.env.APP_URL;
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export async function sendOtp(input: SendOtpInput): Promise<Result> {
  const parsed = sendOtpSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid email" };
  const { email } = parsed.data;
  try {
    await connectDB();
    if (await User.findOne({ email }).lean()) {
      return { ok: false, error: "This email is already registered. Log in instead." };
    }
    const code = generateOtp();
    await VerificationToken.findOneAndUpdate(
      { email, purpose: "signup" },
      { $set: { secretHash: hashSecret(code), verified: false, ticketHash: null, attempts: 0, expiresAt: new Date(Date.now() + OTP_TTL) } },
      { upsert: true },
    );
    const mail = otpEmail(code);
    await sendMail(email, mail.subject, mail.html, mail.text);
    return { ok: true };
  } catch {
    return { ok: false, error: "Couldn't send the code. Please try again." };
  }
}

export async function verifyOtp(input: VerifyOtpInput): Promise<Result> {
  const parsed = verifyOtpSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid code" };
  const { email, code } = parsed.data;
  try {
    await connectDB();
    const token = await VerificationToken.findOne({ email, purpose: "signup" });
    if (!token || isExpired(token.expiresAt, new Date())) return { ok: false, error: "Code expired. Request a new one." };
    if ((token.attempts ?? 0) >= MAX_OTP_ATTEMPTS) return { ok: false, error: "Too many attempts. Request a new code." };
    if (!verifySecret(code, token.secretHash)) {
      token.attempts = (token.attempts ?? 0) + 1;
      await token.save();
      return { ok: false, error: "Incorrect code. Try again." };
    }
    const ticket = generateToken();
    token.verified = true;
    token.ticketHash = hashSecret(ticket);
    token.expiresAt = new Date(Date.now() + TICKET_TTL);
    await token.save();
    const store = await cookies();
    store.set(SIGNUP_COOKIE, ticket, { httpOnly: true, secure: isProd, sameSite: "lax", path: "/", maxAge: TICKET_TTL / 1000 });
    return { ok: true };
  } catch {
    return { ok: false, error: "Couldn't verify the code. Please try again." };
  }
}

export async function completeSignup(input: CompleteSignupInput): Promise<Result> {
  const parsed = completeSignupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid password" };
  let newUserId: string | null = null;
  try {
    const store = await cookies();
    const ticket = store.get(SIGNUP_COOKIE)?.value;
    if (!ticket) return { ok: false, error: "Your signup session expired. Please start again." };
    await connectDB();
    const token = await VerificationToken.findOne({ purpose: "signup", verified: true, ticketHash: hashSecret(ticket) });
    if (!token || isExpired(token.expiresAt, new Date())) return { ok: false, error: "Your signup session expired. Please start again." };
    if (await User.findOne({ email: token.email }).lean()) return { ok: false, error: "This email is already registered. Log in instead." };

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const user = await User.create({ email: token.email, passwordHash, emailVerified: true, name: token.email.split("@")[0] });
    await Settings.create({ userId: user._id });
    await Savings.create({ userId: user._id });
    await VerificationToken.deleteOne({ _id: token._id });
    store.delete(SIGNUP_COOKIE);
    newUserId = String(user._id);
  } catch {
    return { ok: false, error: "Couldn't create your account. Please try again." };
  }
  await createSession(newUserId); // outside try/catch — redirect must not be swallowed
  redirect("/");
}

export async function login(input: LoginInput): Promise<Result> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid email or password" };
  let userId: string | null = null;
  try {
    await connectDB();
    const user = await User.findOne({ email: parsed.data.email });
    if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
      return { ok: false, error: "Invalid email or password" };
    }
    userId = String(user._id);
  } catch {
    return { ok: false, error: "Something went wrong. Please try again." };
  }
  await createSession(userId);
  redirect("/");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}

export async function requestReset(input: RequestResetInput): Promise<Result> {
  const parsed = requestResetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter a valid email" };
  const { email } = parsed.data;
  try {
    await connectDB();
    const user = await User.findOne({ email }).lean();
    if (user) {
      const token = generateToken();
      await VerificationToken.findOneAndUpdate(
        { email, purpose: "reset" },
        { $set: { secretHash: hashSecret(token), verified: false, ticketHash: null, attempts: 0, expiresAt: new Date(Date.now() + RESET_TTL) } },
        { upsert: true },
      );
      const link = `${await originUrl()}/reset-password?token=${token}`;
      const mail = resetEmail(link);
      await sendMail(email, mail.subject, mail.html, mail.text);
    }
  } catch {
    // swallow — never reveal whether the email exists
  }
  return { ok: true };
}

export async function resetPassword(input: ResetPasswordInput): Promise<Result> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { token, password } = parsed.data;
  try {
    await connectDB();
    const vt = await VerificationToken.findOne({ purpose: "reset", secretHash: hashSecret(token) });
    if (!vt || isExpired(vt.expiresAt, new Date())) return { ok: false, error: "This reset link is invalid or has expired." };
    const user = await User.findOne({ email: vt.email });
    if (!user) return { ok: false, error: "This reset link is invalid or has expired." };
    user.passwordHash = await bcrypt.hash(password, 12);
    await user.save();
    await VerificationToken.deleteOne({ _id: vt._id });
    await Session.deleteMany({ userId: user._id }); // force re-login everywhere
    return { ok: true };
  } catch {
    return { ok: false, error: "Couldn't reset your password. Please try again." };
  }
}
