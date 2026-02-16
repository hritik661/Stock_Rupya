import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ error: 'Payment module disabled. Predictions are now free.' }, { status: 410 });
}
