import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt, titolo, autore } = body;

    const payload = { prompt, titolo, autore };

    const response = await fetch('http://localhost:8000/api/generate_image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: err }, { status: response.status });
    }

    const data = await response.json();
    // data.images[0] contiene la stringa base64
    return NextResponse.json({ imageBase64: data.images[0] });
  } catch (error) {
    console.error('Errore nella route /api/generate-image:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
} 