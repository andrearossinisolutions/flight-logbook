function parseSwllFilenameToDate(url: string): { url: string; date: Date; label: string } {
  const match = url.match(/SWLL_([0-9]{2})([0-9]{2})00_[a-z0-9]{4}\.png/);
  if (!match) {
    return { url, date: new Date(0), label: "Unknown" };
  }
  const day = parseInt(match[1], 10);
  const hour = parseInt(match[2], 10);
  
  const now = new Date();
  let year = now.getUTCFullYear();
  let month = now.getUTCMonth(); // 0-indexed
  
  // If card day is e.g. 30/31 and current day is 1/2, it's from the previous month
  if (day > now.getUTCDate() + 5) {
    month -= 1;
    if (month < 0) {
      month = 11;
      year -= 1;
    }
  }
  // If card day is 1/2 and current day is 30/31, it's from the next month (prediction)
  else if (day < now.getUTCDate() - 5) {
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }
  
  const date = new Date(Date.UTC(year, month, day, hour, 0, 0));
  
  // Create a nice human-readable label
  const localTimeStr = date.toLocaleString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Rome"
  });
  
  const label = `Carta del ${localTimeStr} (Locali) - ${hour.toString().padStart(2, "0")}:00 UTC`;
  
  return { url, date, label };
}

async function testScrape() {
  console.log("Fetching Desk Aeronautico weather page...");
  try {
    const res = await fetch("https://www.deskaeronautico.it/carte-meteo/", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    
    if (!res.ok) {
      console.error(`HTTP error: ${res.status}`);
      return;
    }
    
    const html = await res.text();
    const regex = /https:\/\/www\.deskaeronautico\.it\/swll\/SWLL_[0-9]{6}_[a-z0-9]{4}\.png/g;
    const matches = html.match(regex);
    
    if (!matches) {
      console.log("No matches found!");
      return;
    }
    
    const uniqueUrls = Array.from(new Set(matches));
    
    // Parse and sort
    const parsed = uniqueUrls.map(parseSwllFilenameToDate);
    parsed.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    console.log("Sorted SWLL Charts:");
    parsed.forEach(item => {
      console.log(`- [${item.label}] -> ${item.url}`);
    });
    
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

testScrape();
