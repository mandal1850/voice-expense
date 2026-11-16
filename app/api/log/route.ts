import { userFromCode } from "@/lib/auth";
import { applyRecurring, logText, undoLast } from "@/lib/expenses";

// Called by the iOS shortcut. Body: { "code": "<personal code>", "text": "50rs for chai" }
// Always answers in plain text so the shortcut can show or speak the reply directly.
const text = (message: string, status = 200) =>
  new Response(message, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const user = await userFromCode(body.code);
  if (!user) return text("Your shortcut code is not valid. Open the app, copy your code from Settings and set up the shortcut again.", 401);

  const said = String(body.text || "").trim().slice(0, 2000);
  if (!said) return text("I didn't hear anything. Nothing was saved.");
  if (/^(undo|undo last|undo that|delete last|remove last|cancel last)( one| entry| expense)?[.!]?$/i.test(said)) {
    return text(await undoLast(user.id));
  }
  await applyRecurring(user.id);
  const result = await logText(user.id, said, "voice");
  return text(result.message);
}
