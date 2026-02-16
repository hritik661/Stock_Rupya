import { NextResponse } from "next/server"

type ReqBody = {
  prompt?: string
}

export async function POST(req: Request) {
  try {
    const { prompt } = (await req.json()) as ReqBody
    if (!prompt) return NextResponse.json({ error: "No prompt provided" }, { status: 400 })

    const key = process.env.OPENAI_API_KEY
    if (!key) {
      return NextResponse.json({ error: "OPENAI_API_KEY not configured on the server" }, { status: 500 })
    }

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are Hrtik Stocks assistant. Provide concise, educational answers. Do not provide personalized financial advice; include a short disclaimer when relevant.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 800,
      }),
    })

    if (!res.ok) {
      const txt = await res.text()
      return NextResponse.json({ error: `OpenAI error: ${res.status} ${txt}` }, { status: 502 })
    }

    const data = await res.json()
    const reply = data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.text ?? ""

    return NextResponse.json({ reply })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 })
  }
}
