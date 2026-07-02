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

export function cleanEventTitle(title: string): string {
  const dashIndex = title.indexOf("–") !== -1 ? title.indexOf("–") : title.indexOf("-");
  if (dashIndex !== -1) {
    const prefix = title.substring(0, dashIndex).trim();
    if (
      /luglio|agosto|settembre|ottobre|novembre|dicembre|gennaio|febbraio|marzo|aprile|maggio|giugno/i.test(prefix) || 
      /\d+/.test(prefix)
    ) {
      return title.substring(dashIndex + 1).trim();
    }
  }
  return title;
}

const monthsIt = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

export function parseEventDateLabel(label: string, pubDate: Date | null): Date | null {
  const text = label.toLowerCase();
  
  const yearMatch = text.match(/\b(20\d{2})\b/);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : (pubDate ? pubDate.getFullYear() : new Date().getFullYear());
  
  let monthIdx = -1;
  for (let i = 0; i < monthsIt.length; i++) {
    if (text.includes(monthsIt[i])) {
      monthIdx = i;
      break;
    }
  }
  if (monthIdx === -1) {
    return pubDate;
  }
  
  const dayMatch = text.match(/\b(\d{1,2})\b/);
  const day = dayMatch ? parseInt(dayMatch[1], 10) : 1;
  
  return new Date(year, monthIdx, day);
}

export function getEventIcao(title: string, description: string): string | null {
  const icaoMatch = (title + " " + description).match(/\b(li[a-z]{2})\b/i);
  if (icaoMatch) {
    return icaoMatch[1].toUpperCase();
  }
  
  const customMatch = (title + " " + description).match(/\b([a-z]{2}[-\s]?\d{2})\b/i);
  if (customMatch) {
    return customMatch[1].toUpperCase().replace(/\s+/, "-");
  }
  return null;
}

export const getNextEvent = cache(async (): Promise<EventItem | null> => {
  const events = await fetchAllEvents();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const futureEvents = events
    .map(event => {
      const parsedDate = parseEventDateLabel(event.eventDateLabel, event.pubDate);
      return { ...event, parsedDate };
    })
    .filter((event): event is EventItem & { parsedDate: Date } => event.parsedDate !== null && event.parsedDate >= todayStart)
    .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());
    
  return futureEvents.length > 0 ? futureEvents[0] : null;
});
