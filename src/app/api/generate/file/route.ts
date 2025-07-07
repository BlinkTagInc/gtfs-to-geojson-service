import { randomUUID } from 'node:crypto';
import { createReadStream, statSync } from 'node:fs';
import { rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { NextResponse } from 'next/server';
import { track } from '@vercel/analytics/server';
import gtfsToGeojson from 'gtfs-to-geojson';
import { temporaryDirectory } from 'tempy';

export const maxDuration = 300; // 5 minutes

// CORS headers configuration
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// Handle preflight OPTIONS requests
export const OPTIONS = async () => {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
};

export const POST = async (request: Request) => {
  const formData = await request.formData();
  const file = formData.get('file');

  if (!file) {
    return NextResponse.json(
      {
        error: 'No files received',
        success: false,
      },
      { 
        status: 400,
        headers: corsHeaders,
      },
    );
  }

  const buffer = Buffer.from(await (file as Blob).arrayBuffer());

  // Replace spaces in the file name with underscores
  const filename = (file as File).name.replaceAll(' ', '_');

  try {
    // Write file to temporary directory
    const tempDir = temporaryDirectory();
    const gtfsPath = join(tempDir, filename);

    await writeFile(gtfsPath, buffer);

    const options = formData.get('options');

    let parsedOptions;
    if (options) {
      try {
        parsedOptions = JSON.parse(options as string);
      } catch (error) {
        console.error(error);

        return NextResponse.json(
          {
            error: 'Invalid options JSON',
            success: false,
          },
          { 
            status: 400,
            headers: corsHeaders,
          },
        );
      }
    }

    const buildId = randomUUID();
    const zipFilePath = await gtfsToGeojson({
      ...parsedOptions,
      agencies: [
        {
          path: gtfsPath,
        },
      ],
      outputPath: join(tempDir, buildId),
      sqlitePath: ':memory:',
      skipImport: false,
      verbose: false,
      zipOutput: true,
      log: () => {},
      logWarning: () => {},
      logError: () => {},
    }) as string;

    const fileStats = statSync(zipFilePath);
    const fileStream = createReadStream(zipFilePath);

    return new NextResponse(
      new ReadableStream({
        async start(controller) {
          fileStream.on('data', (chunk) => {
            controller.enqueue(chunk); // Send chunks to the stream
          });

          fileStream.on('end', async () => {
            controller.close(); // Close the stream when done
            // Delete the file after streaming has finished
            try {
              await track('GTFS Uploaded');
              await rm(tempDir, { recursive: true });
            } catch (error) {
              console.error('Error deleting file:', error);
            }
          });

          fileStream.on('error', (err) => {
            console.error('Error reading file:', err);
            controller.error(err); // Handle any read errors
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
    console.error('Error occurred ', error);
    return NextResponse.json(
      {
        error: 'Unable to process GTFS',
        success: false,
      },
      { 
        status: 400,
        headers: corsHeaders,
      },
    );
  }
};
