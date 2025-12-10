import { NextResponse } from 'next/server';
import crypto from 'crypto';

interface CloudinaryParams {
  timestamp: number;
  upload_preset: string;
  api_key: string;
  source: string;
  file: string;
}

export async function POST(request: Request) {
  try {
    const { filename } = await request.json();
    const timestamp = Math.round(new Date().getTime() / 1000);
    
    const params: CloudinaryParams = {
      timestamp: timestamp,
      upload_preset: 'Update-wecare',
      api_key: '879911337583222',
      source: 'uw',
      file: filename
    };

    // Sort parameters alphabetically
    const sortedKeys = Object.keys(params).sort();
    const stringToSign = sortedKeys
      .map(key => `${key}=${params[key as keyof CloudinaryParams]}`)
      .join('&') + '03X9yK24cTaunOjsX5m6Y1Z0LjY';

    // Generate SHA-1 hash
    const signature = crypto
      .createHash('sha1')
      .update(stringToSign)
      .digest('hex');

    return NextResponse.json({ 
      signature,
      timestamp,
      api_key: '879911337583222',
      cloud_name: 'dqdh3jgwm'
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate signature' }, { status: 500 });
  }
} 