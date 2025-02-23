import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

interface Section {
  title: string;
  summary: string;
}

interface StructuredSummary {
  overview: string;
  sections: Section[];
}

// Function to chunk text while preserving sentence boundaries
function chunkText(text: string, maxLength = 500) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length <= maxLength) {
      currentChunk += sentence;
    } else {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = sentence;
    }
  }
  if (currentChunk) chunks.push(currentChunk.trim());

  return chunks;
}

// Function to extract structured content from HTML
function extractStructuredContent(html: string) {
  const $ = cheerio.load(html);

  // Remove irrelevant elements
  $('script, style, nav, footer, iframe, .advertisement, .nav, .menu').remove();

  const sections: Section[] = [];
  let mainContent = '';

  // Find all headings and their corresponding content
  $('h1, h2, h3, h4, h5, h6').each((_, heading) => {
    const $heading = $(heading);
    const title = $heading.text().trim();

    // Get content until the next heading
    let content = '';
    let $next = $heading.next();

    while ($next.length && !$next.is('h1, h2, h3, h4, h5, h6')) {
      content += ' ' + $next.text().trim();
      $next = $next.next();
    }

    if (content.trim()) {
      sections.push({
        title,
        summary: content.trim(),
      });
    }
  });

  // Get main content for fallback
  $('article, .post-content, .entry-content, .content, main').each((_, element) => {
    mainContent += $(element).text() + ' ';
  });

  return {
    sections,
    mainContent: mainContent.trim(),
  };
}

// Function to summarize a chunk of text using Hugging Face API
async function summarizeChunk(text: string, apiKey: string) {
  if (!text) {
    console.error('Summarization error: Text is undefined or empty');
    return null;
  }

  try {
    // Truncate text to minimize token usage (first 100 words)
    const truncatedText = text.split(/\s+/).slice(0, 100).join(' ');

    const { data } = await axios.post(
      'https://api-inference.huggingface.co/models/facebook/bart-large-cnn',
      {
        inputs: truncatedText,
        parameters: {
          max_length: 50,
          min_length: 20,
          length_penalty: 2.0,
          num_beams: 4,
          early_stopping: true,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    // Handle model loading errors
    if (data.error && data.error.includes('is currently loading')) {
      const estimatedTime = data.estimated_time || 10;
      console.log(`Model is loading. Retrying in ${estimatedTime} seconds...`);
      await delay(estimatedTime * 1000);
      return summarizeChunk(text, apiKey);
    }

    return Array.isArray(data) ? data[0]?.summary_text : data.summary_text;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Summarization error:', error.response?.data || error.message);
    } else {
      console.error('Summarization error:', error);
    }
    return null;
  }
}

// Delay function for rate limiting
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Fetch webpage content
    const { data: htmlContent } = await axios.get(url);

    // Extract structured content
    const { sections, mainContent } = extractStructuredContent(htmlContent);

    if (!mainContent && sections.length === 0) {
      return NextResponse.json(
        { error: 'Failed to extract content from the URL' },
        { status: 400 }
      );
    }

    // Generate structured summary
    const structuredSummary: StructuredSummary = {
      overview: '',
      sections: [],
    };

    // Generate overview from main content or first section
    const overviewText = mainContent || sections[0]?.summary || '';
    const overviewChunks = chunkText(overviewText);
    let overviewSummary = await summarizeChunk(
      overviewChunks[0],
      process.env.HUGGING_FACE_API_KEY!
    );

    if (!overviewSummary) {
      // Retry once
      await delay(2000);
      overviewSummary = await summarizeChunk(
        overviewChunks[0],
        process.env.HUGGING_FACE_API_KEY!
      );
    }

    structuredSummary.overview = overviewSummary || 'No overview available';

    // Generate summaries for each section (only the first 3 sections to save tokens)
    for (const section of sections.slice(0, 3)) {
      let sectionSummary = await summarizeChunk(
        section.summary,
        process.env.HUGGING_FACE_API_KEY!
      );

      if (!sectionSummary) {
        // Retry once
        await delay(2000);
        sectionSummary = await summarizeChunk(
          section.summary,
          process.env.HUGGING_FACE_API_KEY!
        );
      }

      if (sectionSummary) {
        structuredSummary.sections.push({
          title: section.title,
          summary: sectionSummary,
        });
      }
    }

    // Store in Supabase
    const { data, error: dbError } = await supabase
      .from('summaries')
      .insert({
        user_id: user.id,
        original_url: url,
        summary: JSON.stringify(structuredSummary),
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to save summary' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      summary: structuredSummary,
      data,
    });
  } catch (error) {
    console.error('Error:', error);
    if (axios.isAxiosError(error)) {
      return NextResponse.json(
        { error: `Request failed: ${error.message}` },
        { status: error.response?.status || 500 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    );
  }
}