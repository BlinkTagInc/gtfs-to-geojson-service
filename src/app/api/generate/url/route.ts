import { randomUUID } from 'node:crypto';
import { createReadStream, statSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';

import { NextResponse } from 'next/server';
import { track } from '@vercel/analytics/server';
import gtfsToGeojson from 'gtfs-to-geojson';
import { temporaryDirectory } from 'tempy';

export const maxDuration = 300; // 5 minutes

// Size limits in bytes
const MAX_INPUT_SIZE = 100 * 1024 * 1024; // 100 MB input file
const MAX_OUTPUT_SIZE = 500 * 1024 * 1024; // 500 MB output file

// CORS headers configuration
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

/**
 * Timeout wrapper for promises to prevent hanging
 */
function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs),
    ),
  ]);
}

/**
 * Validate URL file size by checking Content-Length header
 */
async function validateUrlFileSize(url: string): Promise<void> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    const contentLength = response.headers.get('content-length');

    if (contentLength) {
      const fileSizeBytes = parseInt(contentLength, 10);

      if (fileSizeBytes > MAX_INPUT_SIZE) {
        throw new Error(
          `File at URL is too large (${(fileSizeBytes / (1024 * 1024)).toFixed(1)} MB). Maximum size is ${MAX_INPUT_SIZE / (1024 * 1024)} MB. Try the command line version of GTFS-to-GeoJSON instead.`,
        );
      }
    } else {
      console.warn(
        'Content-Length header not available, cannot pre-validate file size',
      );
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('too large')) {
      throw error;
    }
    console.warn('Could not validate URL file size:', error);
  }
}

// Handle preflight OPTIONS requests
export const OPTIONS = async () => {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
};

export const POST = async (request: Request) => {
  const body = await request.json();
  const gtfsUrl = body.url;
  const options = body.options;

  if (!gtfsUrl) {
    return NextResponse.json(
      {
        error: 'Missing URL',
        success: false,
      },
      {
        status: 400,
        headers: corsHeaders,
      },
    );
  }

  let tempDir: string | null = null;

  try {
    // Validate URL file size before processing
    await validateUrlFileSize(gtfsUrl);

    tempDir = temporaryDirectory();
    const buildId = randomUUID();

    // Capture errors from gtfs-to-geojson callbacks
    const processingErrors: string[] = [];
    const errorCapture = { lastError: null as string | null };

    const gtfsPromise = gtfsToGeojson({
      ...(options || {}),
      agencies: [
        {
          agencyKey: buildId,
          url: gtfsUrl,
        },
      ],
      outputPath: join(tempDir, buildId),
      sqlitePath: ':memory:',
      skipImport: false,
      verbose: false,
      zipOutput: true,
      log: (text: string) => {
        if (process.env.NODE_ENV === 'development') {
          console.log(text);
        }
      },
      logWarning: (text: string) => {
        console.warn('GTFS Warning:', text);
      },
      logError: (text: string) => {
        console.error('GTFS Error:', text);
        errorCapture.lastError = text;
        processingErrors.push(text);
      },
    }) as Promise<string>;

    // Wrap with timeout to prevent hanging (280 seconds, leaving 20s buffer)
    const zipFilePath = await withTimeout(
      gtfsPromise,
      280000,
      'GTFS processing timed out. Try the command line version of GTFS-to-GeoJSON instead.',
    );

    // Check if errors were captured during processing
    if (errorCapture.lastError?.includes('ENOSPC')) {
      throw new Error(
        'Insufficient disk space. File is too large to process. Try the command line version of GTFS-to-GeoJSON instead.',
      );
    }

    if (processingErrors.length > 0 && !zipFilePath) {
      throw new Error(
        `GTFS processing failed: ${errorCapture.lastError || processingErrors[0]}`,
      );
    }

    const fileStats = statSync(zipFilePath);

    // Validate output size
    if (fileStats.size > MAX_OUTPUT_SIZE) {
      throw new Error(
        `Unzipped GTFS file is too large (${(fileStats.size / (1024 * 1024)).toFixed(1)} MB). Maximum size is ${MAX_OUTPUT_SIZE / (1024 * 1024)} MB`,
      );
    }
    const fileStream = createReadStream(zipFilePath);

    return new NextResponse(
      new ReadableStream({
        async start(controller) {
          fileStream.on('data', (chunk) => {
            controller.enqueue(chunk); // Send chunks to the stream
          });

          fileStream.on('end', async () => {
            controller.close();
            try {
              await track('GTFS Uploaded', {
                url: gtfsUrl,
              });
              if (tempDir) {
                await rm(tempDir, { recursive: true, force: true });
              }
            } catch (error) {
              console.error('Error during cleanup:', error);
            }
          });

          fileStream.on('error', async (err) => {
            console.error('Error reading file:', err);
            controller.error(err);
            try {
              if (tempDir) {
                await rm(tempDir, { recursive: true, force: true });
              }
            } catch (error) {
              console.error('Error during cleanup:', error);
            }
          });
        },
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/zip',
          'Content-Disposition': 'attachment; filename="geojson.zip"',
          'Content-Length': fileStats.size.toString(), // Set the content length
        },
      },
    );
  } catch (error) {
    console.error('Error occurred:', error);

    // Cleanup temp directory on error
    try {
      if (tempDir) {
        await rm(tempDir, { recursive: true, force: true });
      }
    } catch (cleanupError) {
      console.error('Error during cleanup:', cleanupError);
    }

    const errorMessage =
      error instanceof Error ? error.message : 'Unable to process GTFS';

    return NextResponse.json(
      {
        error: errorMessage,
        success: false,
      },
      {
        status: 400,
        headers: corsHeaders,
      },
    );
  }
};
