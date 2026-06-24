import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const FORWARD_TO_EMAIL = "baijinhong2@gmail.com";

function getResend() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  return new Resend(process.env.RESEND_API_KEY);
}

export async function POST(request: NextRequest) {
  try {
    // Verify the request body exists
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // Handle Resend webhook events
    const event = body;

    if (event.type === "email.received") {
      const { email_id, from, subject, html, text } = event.data;

      // Forward the email
      await getResend().emails.send({
        from: "support@drawspark.art",
        to: [FORWARD_TO_EMAIL],
        subject: `[Forward] ${subject || "No Subject"}`,
        replyTo: from,
        html: `
          <p><strong>From:</strong> ${from}</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <hr />
          ${html || text || "(No content)"}
        `,
      });

      console.log(`✅ Forwarded email from ${from} to inbox`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
