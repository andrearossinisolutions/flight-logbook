import { cache } from "react";

export interface EventItem {
  title: string;
  link: string;
  pubDate: Date | null;
  description: string;
  imageUrl: string | null;
  eventDateLabel: string;
  sourceName: string;
}

export interface EventSource {
  name: string;
  url: string;
  feedUrl: string;
}

export const EVENT_SOURCES: EventSource[] = [
  {
    name: "Piloti di Classe",
    url: "https://www.pilotidiclasse.it",
    feedUrl: "https://www.pilotidiclasse.it/category/eventi-e-raduni/feed/",
  },
];

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&#8211;/g, "–")
    .replace(/&#8220;/g, "“")
    .replace(/&#8221;/g, "”")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ");
}

export function parseRssFeed(xmlText: string, sourceName: string): EventItem[] {
  const items: EventItem[] = [];
  const itemMatches = xmlText.match(/<item>([\s\S]*?)<\/item>/g);
  
  if (!itemMatches) return items;
  
  for (const itemXml of itemMatches) {
    const titleMatch = itemXml.match(/<title>([\s\S]*?)<\/title>/);
    const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/);
    const pubDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
    
    let description = "";
    const descCdataMatch = itemXml.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/);
    if (descCdataMatch) {
      description = descCdataMatch[1];
    } else {
      const descMatch = itemXml.match(/<description>([\s\S]*?)<\/description>/);
      if (descMatch) description = descMatch[1];
    }
    
    let contentEncoded = "";
    const contentMatch = itemXml.match(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/);
    if (contentMatch) {
      contentEncoded = contentMatch[1];
    }
    
    const title = titleMatch ? decodeHtmlEntities(titleMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, '$1')) : "Senza Titolo";
    const link = linkMatch ? linkMatch[1].trim() : "";
    const pubDateStr = pubDateMatch ? pubDateMatch[1].trim() : "";
    
    let imageUrl: string | null = null;
    const imgRegex = /<img[^>]+src=["']([^"']+)["']/;
    const imgMatch = contentEncoded.match(imgRegex) || description.match(imgRegex);
    if (imgMatch) {
      imageUrl = imgMatch[1];
      if (imageUrl.startsWith('http://')) {
        imageUrl = imageUrl.replace('http://', 'https://');
      }
    }
    
    let cleanDesc = description
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
      .replace(/<[^>]*>/g, '')
      .replace(/\[\&\#8230\;\]/g, '...')
      .replace(/\s+/g, ' ')
      .trim();
      
    cleanDesc = decodeHtmlEntities(cleanDesc);
    
    // Attempt to extract event date label from the title
    let eventDateLabel = "";
    const titleParts = title.split(/[–\-]/);
    if (titleParts.length > 1) {
      const firstPart = titleParts[0].trim();
      if (
        /luglio|agosto|settembre|ottobre|novembre|dicembre|gennaio|febbraio|marzo|aprile|maggio|giugno/i.test(firstPart) ||
        /\d+\/\d+/.test(firstPart)
      ) {
        eventDateLabel = firstPart;
      }
    }
    
    // Fallback eventDateLabel if not found in title, use pubDate
    if (!eventDateLabel && pubDateStr) {
      const date = new Date(pubDateStr);
      eventDateLabel = date.toLocaleDateString("it-IT", {
        day: "numeric",
        month: "long",
        year: "numeric"
      });
    }
    
    items.push({
      title,
      link,
      pubDate: pubDateStr ? new Date(pubDateStr) : null,
      description: cleanDesc,
      imageUrl,
      eventDateLabel,
      sourceName
    });
  }
  
  return items;
}

export async function fetchEventsForSource(source: EventSource): Promise<EventItem[]> {
  try {
    const res = await fetch(source.feedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      next: { revalidate: 3600 } // cache per 1 ora
    });

    if (!res.ok) {
      console.warn(`Impossibile recuperare il feed RSS per ${source.name}: HTTP ${res.status}`);
      return [];
    }

    const xmlText = await res.text();
    return parseRssFeed(xmlText, source.name);
  } catch (error) {
    console.error(`Errore nel recupero del feed per ${source.name}:`, error);
    return [];
  }
}

export const fetchAllEvents = cache(async (): Promise<EventItem[]> => {
  const allResults = await Promise.all(
    EVENT_SOURCES.map(source => fetchEventsForSource(source))
  );
  
  const flattened = allResults.flat();
  
  return flattened.sort((a, b) => {
    const dateA = a.pubDate ? a.pubDate.getTime() : 0;
    const dateB = b.pubDate ? b.pubDate.getTime() : 0;
    return dateB - dateA;
  });
});
