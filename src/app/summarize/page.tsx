'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'

export default function SummarizePage() {
  const [url, setUrl] = useState('')
  const [summary, setSummary] = useState('')
  const [contentLength, setContentLength] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const response = await axios.post('/api/summarize', { url })
      setSummary(response.data.summary)
      setContentLength(response.data.contentLength)
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setError(error.response?.data?.error || 'Failed to generate summary')
      } else {
        setError('An unexpected error occurred')
      }
    } finally {
      setLoading(false)
    }
  }

  if (!isClient) {
    return null // Render nothing on the server
  }

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
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-2">Summary</h2>
          <div className="p-4 bg-gray-100 rounded">
            <p className="mb-2">{summary}</p>
            <p className="text-sm text-gray-600">
              Original content length: {contentLength} characters
            </p>
          </div>
        </div>
      )}
    </div>
  );
}