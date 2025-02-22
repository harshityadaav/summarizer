export function extractMainContent(html: string): string {
    // Common content wrapper patterns
    const contentPatterns = [
      /<article[^>]*>([\s\S]*?)<\/article>/i,
      /<div[^>]*?class="[^"]*?(?:post-content|entry-content|article-content)[^"]*?"[^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*?class="[^"]*?(?:blog-post|main-content)[^"]*?"[^>]*>([\s\S]*?)<\/div>/i,
    ];
  
    // Try to find main content
    for (const pattern of contentPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
  
    // Fallback: Remove common non-content elements
    let cleanHtml = html
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '');
  
    return cleanHtml;
  }