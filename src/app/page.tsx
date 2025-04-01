import Image from 'next/image';

import UploadForm from '../components/UploadForm';

export default function Home() {
  return (
    <>
      <main className="flex min-h-screen flex-col items-center justify-between px-3 py-4 md:pt-20">
        <div className="">
          <Image
            className="relative"
            src="/gtfs-to-geojson-logo.svg"
            alt="GTFS-to-geojson Logo"
            width={180}
            height={180}
            priority
          />
        </div>
        <div className="card my-6 max-w-[650px]">
          <UploadForm />
        </div>
        <div className="card max-w-[475px] mx-auto my-6">
          <h2 className="mb-3">About GTFS-to-geojson</h2>

          <div className="flex flex-row gap-10 mb-8">
            <div className="shrink-0 text-6xl mt-2">🚆</div>
            <div>
              GTFS-to-geojson converts transit data from GTFS format into GeoJSON, making it easy to visualize a transit network on maps.
            </div>
          </div>

          <div className="flex flex-row gap-10 mb-8">
            <div className="shrink-0 text-6xl mt-2">🚍</div>
            <div>
              Create interactive map visualizations of transit routes and stops, with options to display either or both.
            </div>
          </div>

          <div className="flex flex-row gap-10 mb-8">
            <div className="shrink-0 text-6xl mt-2">⭕</div>
            <div>
              Create service area analysis by generating customizable buffer zones around stops or along routes.
            </div>
          </div>

          <div className="flex flex-row justify-center">
            <a href="https://github.com/BlinkTagInc/gtfs-to-geojson" className="btn">
              Learn More About GTFS-to-geojson
            </a>
          </div>
        </div>

        <div className="card max-w-[475px] mx-auto my-6">
          <h2 className="mb-3">
            Get in Touch
          </h2>

          <div className="flex flex-row gap-10 mb-8">
            <div className="shrink-0 text-6xl">✉️</div>
            <div>
              Need help implementing GTFS-to-geojson or want to discuss how it can benefit your agency? 
              Contact our team at <a href="mailto:gtfs@blinktag.com">gtfs@blinktag.com</a>.
              <br />
              <br />
              We&apos;d love to hear how you&apos;re using GTFS-to-geojson! <a href="mailto:gtfs@blinktag.com">Share your story</a> with us.
            </div>
          </div>
        </div>
      </main>

      <div className="footer">
        Developed by <a href="https://blinktag.com">BlinkTag Inc</a>
        <br />
        Built with <a href="https://github.com/BlinkTagInc/gtfs-to-geojson">GTFS-to-geojson</a>
        <br />
        <div className="flex flex-col md:flex-row md:gap-4 justify-center">
          <a href="https://gtfstohtml.com/docs/related-libraries">
            Explore More GTFS Tools
          </a>
          <a href="https://github.com/BlinkTagInc/gtfs-to-geojson">Contribute on GitHub</a>
          <a href="mailto:gtfs@blinktag.com">Contact Us</a>
        </div>
      </div>
    </>
  );
}
