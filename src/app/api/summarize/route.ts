import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import axios from 'axios'
import * as cheerio from 'cheerio'

// Function to extract and clean content using cheerio
function extractContent(html: string) {
  const $ = cheerio.load(html)

  // Remove unwanted elements
  $('script, style, nav, header, footer, iframe, .advertisement, .sidebar, #sidebar, .menu, .nav').remove()

  // Try to find main content containers
  const possibleContentSelectors = [
    'article',
    '.post-content',
    '.entry-content',
    '.article-content',
    '.blog-post',
    '.main-content',
    'main',
    '#main',
    '.content',
    '[role="main"]'
  ]

  let content = ''

  // Try each selector
  for (const selector of possibleContentSelectors) {
    const element = $(selector)
    if (element.length) {
      content = element.text()
      break
    }
  }

  // If no content found, get body text as fallback
  if (!content) {
    content = $('body').text()
  }

  // Clean the content
  return content
    .replace(/\s+/g, ' ')      // Replace multiple spaces
    .replace(/\n+/g, ' ')      // Replace newlines
    .trim()
}

// Function to chunk text for API processing
function chunkText(text: string, maxLength = 4000) {
  // Split into sentences (rough approximation)
  const sentences = text.match(/[^.!?]+[.!?]+/g) || []
  let chunks = []
  let currentChunk = ''

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length <= maxLength) {
      currentChunk += sentence
    } else {
      if (currentChunk) chunks.push(currentChunk.trim())
      currentChunk = sentence
    }
  }
  if (currentChunk) chunks.push(currentChunk.trim())

  return chunks
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { url } = await request.json()
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Fetch webpage content
    const { data: htmlContent } = await axios.get(url)
    
    // Extract and clean content
    const extractedContent = extractContent(htmlContent)
    
    // Split content into manageable chunks
    const chunks = chunkText(extractedContent)
    
    // Process first chunk (or full content if small enough)
    const processChunk = chunks[0]

    // Call Hugging Face API
    const { data: summaryData } = await axios.post(
      "https://api-inference.huggingface.co/models/facebook/bart-large-cnn",
      {
        inputs: processChunk,
        parameters: {
          max_length: 250, // Increased for better overview
          min_length: 100, // Increased for more content
          length_penalty: 2.0,
          num_beams: 4,
          early_stopping: true
        }
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.HUGGING_FACE_API_KEY}`
        }
      }
    )

    // Extract summary text
    const summaryText = Array.isArray(summaryData) 
      ? summaryData[0]?.summary_text 
      : summaryData.summary_text

    if (!summaryText) {
      return NextResponse.json(
        { error: 'No summary generated' },
        { status: 500 }
      )
    }

    // Store in Supabase
    const { data, error: dbError } = await supabase
      .from('summaries')
      .insert({
        user_id: user.id,
        original_url: url,
        summary: summaryText,
        original_content: extractedContent.slice(0, 1000), // Store first 1000 chars of original
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json(
        { error: 'Failed to save summary' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      summary: summaryText,
      contentLength: extractedContent.length,
      data
    })

  } catch (error) {
    console.error('Error:', error)
    if (axios.isAxiosError(error)) {
      return NextResponse.json(
        { error: `Request failed: ${error.message}` },
        { status: error.response?.status || 500 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    )
  }
}