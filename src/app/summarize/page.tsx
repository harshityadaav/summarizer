'use client';

import { useState } from 'react';
import axios from 'axios';

interface SectionSummary {
  title: string;
  summary: string;
}

interface StructuredSummary {
  overview: string;
  sections: SectionSummary[];
}

// Type guard
function isStructuredSummary(data: any): data is StructuredSummary {
  return data && 
         typeof data.overview === 'string' && 
         Array.isArray(data.sections);
}

export default function SummarizePage() {
  const [url, setUrl] = useState('');
  const [summary, setSummary] = useState<StructuredSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await axios.post<{ summary?: StructuredSummary }>('/api/summarize', { url });
      const responseData = response.data;

      if (isStructuredSummary(responseData?.summary)) {
        setSummary(responseData.summary);
      } else {
        setError('Invalid summary format received from server');
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setError(error.response?.data?.error || 
                error.message || 
                'Failed to generate summary');
      } else if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Blog Summarizer</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="url" className="block text-sm font-medium mb-2">
            Blog URL
          </label>
          <input
            type="url"
            id="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full p-2 border rounded"
            required
            placeholder="https://example.com/blog-post"
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          aria-disabled={loading}
          className={`px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 ${
            loading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {loading ? 'Generating Summary...' : 'Summarize'}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {summary && (
        <div className="mt-8 space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-3">Overview</h2>
            <div className="p-4 bg-gray-100 rounded">
              <p>{summary.overview || 'No overview available'}</p>
            </div>
          </div>

          {summary.sections?.length > 0 ? (
            <div>
              <h2 className="text-xl font-semibold mb-3">Key Points</h2>
              <div className="space-y-4">
                {summary.sections.map((section, index) => (
                  <div key={section.title} className="p-4 bg-gray-100 rounded">
                    <h3 className="font-semibold text-lg mb-2">
                      {section.title}
                    </h3>
                    <ul className="list-disc list-inside">
                      {section.summary
                        .split('. ')
                        .filter((sentence) => sentence.trim())
                        .slice(0, 3)
                        .map((sentence, i) => (
                          <li key={`${section.title}-${i}`}>{sentence.trim()}</li>
                        ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-yellow-100 text-yellow-700 rounded">
              No key points found in the content
            </div>
          )}
        </div>
      )}
    </div>
  );
}