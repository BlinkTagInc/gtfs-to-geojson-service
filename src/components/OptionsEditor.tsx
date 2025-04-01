export const OptionsEditor = ({
  options,
  setOptions,
}: {
  options: string;
  setOptions: (options: string) => void;
}) => {
  // Parse the current options
  const parsedOptions = JSON.parse(options);

  const handleChange = (field: string, value: string | number) => {
    const newOptions = {
      ...parsedOptions,
      [field]: value,
    };
    setOptions(JSON.stringify(newOptions, null, 2));
  };

  return (
    <>
      <div className="mt-4 flex flex-row justify-between items-center">
        <h2 className="mb-0">GTFS-to-geojson Options</h2>
        <a
          href="https://github.com/BlinkTagInc/gtfs-to-geojson?tab=readme-ov-file#configuration"
          target="_blank"
          className="text-sm"
        >
          View Documentation
        </a>
      </div>
      
      <div className="mt-2 space-y-4">
        <div>
          <label htmlFor="outputFormat" className="block text-sm font-medium text-gray-700">
            Output Format
          </label>
          <select
            id="outputFormat"
            className="mt-1 w-full p-2 border border-gray-300 rounded-sm"
            value={parsedOptions.outputFormat}
            onChange={(e) => handleChange('outputFormat', e.target.value)}
          >
            <option value="envelope">Envelope</option>
            <option value="convex">Convex</option>
            <option value="stops">Stops</option>
            <option value="stops-buffer">Stops Buffer</option>
            <option value="stops-dissolved">Stops Dissolved</option>
            <option value="lines">Lines</option>
            <option value="lines-buffer">Lines Buffer</option>
            <option value="lines-dissolved">Lines Dissolved</option>
            <option value="lines-and-stops">Lines and Stops</option>
          </select>

          <div className="mt-2 text-center">
            {parsedOptions.outputFormat === 'envelope' && <div className="mt-1 text-sm">A rectangular box around route lines.</div>}
            {parsedOptions.outputFormat === 'convex' && <div className="mt-1 text-sm">A convex polygon around route endpoints.</div>}
            {parsedOptions.outputFormat === 'stops' && <div className="mt-1 text-sm">Stops as points.</div>}
            {parsedOptions.outputFormat === 'stops-buffer' && <div className="mt-1 text-sm">A buffer around stops.</div>}
            {parsedOptions.outputFormat === 'stops-dissolved' && <div className="mt-1 text-sm">A dissolved buffer around stops.</div>}
            {parsedOptions.outputFormat === 'lines' && <div className="mt-1 text-sm">Routes as lines.</div>}
            {parsedOptions.outputFormat === 'lines-buffer' && <div className="mt-1 text-sm">A buffer around route lines.</div>}
            {parsedOptions.outputFormat === 'lines-dissolved' && <div className="mt-1 text-sm">A dissolved buffer around route lines.</div>}
            {parsedOptions.outputFormat === 'lines-and-stops' && <div className="mt-1 text-sm">Both points and lines for stops and routes.</div>}
            
            <img src={`/examples/${parsedOptions.outputFormat}.png`} alt={parsedOptions.outputFormat} />
            <i>Example output for <code>{parsedOptions.outputFormat}</code></i><br />
            <a href={`/examples/${parsedOptions.outputFormat}.geojson`} download>Download Example GeoJSON</a><br />
            <a href="#" onClick={async (event) => {
              event.preventDefault();
              const geojson = await fetch(`/examples/${parsedOptions.outputFormat}.geojson`).then(res => res.json());
              window.location = `https://geojson.io/#data=data:application/json,${encodeURIComponent(JSON.stringify(geojson, null, 2))}`;
            }}>View Example on geojson.io</a>
          </div>
        </div>

        {(parsedOptions.outputFormat.includes('buffer') || parsedOptions.outputFormat.includes('dissolved')) && (
          <>
            <div>
              <label htmlFor="bufferSizeMeters" className="block text-sm font-medium text-gray-700">
                Buffer Size (meters)
              </label>
              <input
                type="number"
                id="bufferSizeMeters"
                className="mt-1 w-full p-2 border border-gray-300 rounded-sm"
                value={parsedOptions.bufferSizeMeters}
                onChange={(e) => handleChange('bufferSizeMeters', Number(e.target.value))}
              />
            </div>
          </>
        )}

        <div>
          <label htmlFor="outputType" className="block text-sm font-medium text-gray-700">
            Output Type
          </label>
          <select
            id="outputType"
            className="mt-1 w-full p-2 border border-gray-300 rounded-sm"
            value={parsedOptions.outputType}
            onChange={(e) => handleChange('outputType', e.target.value)}
          >
            <option value="agency">Agency</option>
            <option value="route">Route</option>
            <option value="shape">Shape</option>
          </select>

          {parsedOptions.outputType === 'agency' && <div className="mt-1 text-sm">Output one geoJSON file with all routes for a single agency combined together.</div>}
          {parsedOptions.outputType === 'route' && <div className="mt-1 text-sm">Output one geoJSON file per route and direction.</div>}
          {parsedOptions.outputType === 'shape' && <div className="mt-1 text-sm">Output one geoJSON file per shape_id.</div>}
        </div>
      </div>
    </>
  );
};
