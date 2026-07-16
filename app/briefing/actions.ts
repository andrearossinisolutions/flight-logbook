"use server";

import { getWeekendDates, fetchWeekendWeather } from "@/lib/daily-jobs";
import { getCoordinatesFromName, ITALIAN_AIRPORTS } from "@/lib/weather";

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Raggio della Terra in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function getWeekendWeatherAction(defaultBase: string) {
  try {
    const dates = getWeekendDates(new Date());

    let baseLat = 45.461; // default Milano Linate
    let baseLon = 9.263;
    let baseApt = ITALIAN_AIRPORTS[defaultBase.toUpperCase()];
    let baseAptFound = false;

    if (baseApt) {
      baseLat = baseApt.lat;
      baseLon = baseApt.lon;
      baseAptFound = true;
    } else {
      const coords = await getCoordinatesFromName(defaultBase);
      if (coords) {
        baseLat = coords.lat;
        baseLon = coords.lon;
        baseAptFound = true;
      }
    }

    if (!baseAptFound) {
      return { error: "Impossibile trovare le coordinate della tua base." };
    }

    // 1. Fetch meteo della base
    const baseWeather = await fetchWeekendWeather(baseLat, baseLon, dates);

    // 2. Trova gli aeroporti entro 100km (max 4)
    const nearby = [];
    for (const [icao, apt] of Object.entries(ITALIAN_AIRPORTS)) {
      if (icao.toUpperCase() === defaultBase.toUpperCase()) continue;
      const dist = getDistanceKm(baseLat, baseLon, apt.lat, apt.lon);
      if (dist <= 100) {
        nearby.push({
          icao,
          name: apt.name,
          lat: apt.lat,
          lon: apt.lon,
          distanceKm: Math.round(dist)
        });
      }
    }
    nearby.sort((a, b) => a.distanceKm - b.distanceKm);
    const selectedNearby = nearby.slice(0, 4);

    // 3. Fetch meteo per gli aeroporti vicini
    const nearbyWeather = [];
    for (const apt of selectedNearby) {
      const w = await fetchWeekendWeather(apt.lat, apt.lon, dates);
      if (w) {
        nearbyWeather.push({
          icao: apt.icao,
          name: apt.name,
          distanceKm: apt.distanceKm,
          weather: w
        });
      }
    }

    const formatDateStr = (d: Date) => {
      return d.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
    };

    return {
      success: true,
      dates: {
        friday: formatDateStr(dates.friday),
        saturday: formatDateStr(dates.saturday),
        sunday: formatDateStr(dates.sunday)
      },
      baseWeather,
      nearbyWeather
    };
  } catch (err) {
    console.error("Errore nel recupero meteo weekend:", err);
    return { error: "Errore durante il recupero dei dati meteo." };
  }
}
