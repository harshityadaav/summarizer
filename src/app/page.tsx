import Link from 'next/link';

export default function Home() {
  return (
    <>
      {/* Main Content */}
      <main className="pt-16"> {/* Add padding-top to account for the fixed header height */}
        <div className="max-w-4xl mx-auto p-4 mt-4">
          <h1 className="text-2xl font-bold mb-4">Welcome to Summarizer</h1>
          <p className="text-gray-600 mb-6">
            Summarize your favorite blog posts and articles with ease.
          </p>

          {/* Button to navigate to /summarize */}
          <Link
            href="/summarize"
            className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Go to Summarize
          </Link>
        </div>
      </main>
    </>
  );
}