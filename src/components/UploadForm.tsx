'use client';

import { useState, useCallback } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import { useDropzone, FileRejection, FileWithPath } from 'react-dropzone';

import { Loading } from './Loading';
import SuccessMessage from './SuccessMessage';
import { OptionsEditor } from './OptionsEditor';

const defaultOptions = {
  bufferSizeMeters: 400,
  outputType: 'agency',
  outputFormat: 'lines-and-stops',
};

const UploadForm = () => {
  const [url, setUrl] = useState('');
  const [options, setOptions] = useState(
    JSON.stringify(defaultOptions, null, 2),
  );
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: FileWithPath[], rejectedFiles: FileRejection[]) => {
      if (rejectedFiles.length > 0) {
        toast(
          rejectedFiles
            .flatMap((file) => {
              if (
                file.errors.some((error) => error.code === 'file-too-large')
              ) {
                return [
                  'File is too large. (Maximum file size is 4MB). Try loading via URL instead of file upload, or use GTFS-to-geojson library from the command line.',
                ];
              }

              return file.errors.map((fileError) => fileError.message);
            })
            .join(', '),
          { type: 'error', autoClose: 5000 },
        );
        return;
      }

      const file = acceptedFiles[0];
      const formData = new FormData();
      formData.append('file', file);

      let parsedOptions;
      if (options) {
        try {
          parsedOptions = JSON.parse(options);
        } catch (error) {
          console.error(error);

          toast('Invalid options JSON. Check the syntax and try again', {
            type: 'error',
          });
          return;
        }
      }

      formData.append('options', JSON.stringify(parsedOptions));

      setLoading(true);

      try {
        const response = await fetch('/api/generate/file', {
          method: 'POST',
          body: formData,
        });

        if (response.ok === false) {
          const data = await response.json();
          toast(
            data.error ??
              'Error processing GTFS. For help, email gtfs@blinktag.com with the GTFS you are trying to use.',
            {
              type: 'error',
            },
          );
        } else {
          await downloadResponse(response);
          geojsonGenerationSuccess();
        }

        setLoading(false);
      } catch (error) {
        console.error('Error:', error);
        toast(
          'Error processing GTFS  For help, email gtfs@blinktag.com with the GTFS you are trying to use.',
          { type: 'error' },
        );
        setLoading(false);
      }
    },
    [options],
  );
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/x-zip': ['.zip'],
    },
    maxSize: 4 * 1024 * 1024,
    maxFiles: 1,
  });

  const downloadResponse = async (response: Response) => {
    // Convert response to a Blob
    const blob = await response.blob();

    // Create a temporary URL for the blob
    const url = window.URL.createObjectURL(blob);

    // Create a link element and trigger a download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'geojson.zip');
    document.body.appendChild(link);
    link.click(); // Trigger the download
    document.body.removeChild(link); // Clean up

    // Revoke the object URL to free up memory
    window.URL.revokeObjectURL(url);
  };

  const geojsonGenerationSuccess = () => {
    setSuccess(true);
    setUrl('');
  };

  return (
    <>
      <h2 className="text-center">Generate geojson from GTFS</h2>
      {success ? (
        <SuccessMessage clear={() => setSuccess(false)} />
      ) : loading ? (
        <Loading url={url} />
      ) : (
        <>
          <form
            className="flex flex-row gap-3 items-start"
            onSubmit={async (event) => {
              event.preventDefault();

              if (!url) {
                toast('Please enter a URL', { type: 'error' });
                return;
              }

              let parsedOptions;
              if (options) {
                try {
                  parsedOptions = JSON.parse(options);
                } catch (error) {
                  console.error(error);

                  toast(
                    'Invalid options JSON. Check the syntax and try again.',
                    { type: 'error' },
                  );
                  return;
                }
              }

              setLoading(true);

              try {
                const response = await fetch('/api/generate/url', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ url, options: parsedOptions }),
                });

                if (response.ok === false) {
                  const data = await response.json();
                  toast(
                    data.error ??
                      'Error processing GTFS. For help, email gtfs@blinktag.com with the GTFS you are trying to use.',
                    {
                      type: 'error',
                    },
                  );
                } else {
                  await downloadResponse(response);
                  geojsonGenerationSuccess();
                }

                setLoading(false);
              } catch (error) {
                console.error('Error:', error);
                toast(
                  'Error processing GTFS. For help, email gtfs@blinktag.com with the GTFS you are trying to use.',
                  { type: 'error' },
                );
                setLoading(false);
              }
            }}
          >
            <label className="sr-only" htmlFor="gtfs_url">
              GTFS URL
            </label>
            <input
              type="text"
              id="gtfs_url"
              placeholder="Enter URL of zipped GTFS file"
              className="block w-full"
              value={url}
              onChange={(event) => {
                setUrl(event.target.value);
              }}
            />
            <button type="submit" className="block w-[150px]">
              Generate
            </button>
          </form>
          <div className="text-center text-2xl my-3">OR</div>
          <div
            className="flex items-center justify-center w-full"
            {...getRootProps()}
          >
            <label
              htmlFor="dropzone-file"
              className="flex flex-col items-center justify-center w-full border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <input {...getInputProps()} />
                <svg
                  className="w-10 h-10 mb-3 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  ></path>
                </svg>
                <div className="mb-2 text-sm text-gray-500">
                  {isDragActive ? (
                    <span className="font-semibold">
                      Drag &apos;n&apos; drop a zipped GTFS file here
                    </span>
                  ) : (
                    <span>
                      <span className="font-semibold">
                        Click to upload GTFS
                      </span>{' '}
                      or drag &apos;n&apos; drop
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  Zipped GTFS only (MAX. 4MB)
                </div>
              </div>
            </label>
          </div>
          <div className="mt-2">
            <OptionsEditor
              options={options}
              setOptions={setOptions}
            />
          </div>
        </>
      )}
      <ToastContainer />
    </>
  );
};

export default UploadForm;
