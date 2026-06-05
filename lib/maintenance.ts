export function getMaintenanceSplit(
  log: any,
  aircraft: any,
  partnershipFlights: any[],
  members: any[]
) {
  const logHours = Number(log.performedAtHours);
  const cost = Number(log.cost || 0);
  if (cost <= 0) return null;

  // 1. Find the previous maintenance hours for this aircraft
  const otherLogs = aircraft.maintenanceLogs || [];
  const prevLogs = otherLogs.filter((l: any) => Number(l.performedAtHours) < logHours);
  let prevHours = Number(aircraft.initialHours);
  if (prevLogs.length > 0) {
    const maxPrev = Math.max(...prevLogs.map((l: any) => Number(l.performedAtHours)));
    prevHours = maxPrev;
  }

  // 2. Sort all flights for this aircraft in chronological order (ascending by date)
  const aircraftFlights = partnershipFlights
    .filter((f: any) => f.partnershipAircraftId === aircraft.id)
    .map((f: any) => ({
      ...f,
      dateVal: new Date(f.movement.date).getTime()
    }))
    .sort((a: any, b: any) => a.dateVal - b.dateVal);

  // 3. Assign start/end engine hours to each flight
  let currentHours = Number(aircraft.initialHours);
  const flightsWithHours = aircraftFlights.map((f: any) => {
    const durationHours = f.durationMinutes / 60;
    const startHours = currentHours;
    const endHours = currentHours + durationHours;
    currentHours = endHours;
    return {
      ...f,
      startHours,
      endHours
    };
  });

  // 4. Filter flights in the interval (prevHours, logHours]
  // We use a small buffer margin of 0.05 hours (3 mins) to handle floating point issues.
  const intervalFlights = flightsWithHours.filter((f: any) => {
    return f.endHours > prevHours && f.endHours <= logHours + 0.05;
  });

  // 5. Aggregate duration by user
  const userDurations: { [userId: string]: number } = {};
  for (const m of members) {
    userDurations[m.userId] = 0;
  }

  let totalDurationMinutes = 0;
  for (const f of intervalFlights) {
    const uid = f.movement.userId;
    if (userDurations[uid] === undefined) {
      userDurations[uid] = 0;
    }
    userDurations[uid] += f.durationMinutes;
    totalDurationMinutes += f.durationMinutes;
  }

  // 6. Calculate shares
  const shares = members.map((m: any) => {
    const minutes = userDurations[m.userId] || 0;
    const shareAmount = totalDurationMinutes > 0 
      ? cost * (minutes / totalDurationMinutes) 
      : cost / members.length;
    return {
      userId: m.userId,
      name: m.user.fullName || m.user.email,
      minutes,
      hours: minutes / 60,
      amount: shareAmount
    };
  });

  return {
    prevHours,
    logHours,
    totalDurationMinutes,
    shares
  };
}

export function getMonthlyMaintenanceShares(
  startOfMonth: Date,
  endOfMonth: Date,
  aircrafts: any[],
  partnershipFlights: any[],
  members: any[]
) {
  const memberShares: { [userId: string]: number } = {};
  for (const m of members) {
    memberShares[m.userId] = 0;
  }

  for (const aircraft of aircrafts) {
    const logs = aircraft.maintenanceLogs || [];
    // Filter logs in the target month
    const targetLogs = logs.filter((l: any) => {
      const d = new Date(l.date);
      return d >= startOfMonth && d < endOfMonth;
    });

    for (const log of targetLogs) {
      const split = getMaintenanceSplit(log, aircraft, partnershipFlights, members);
      if (split) {
        for (const sh of split.shares) {
          memberShares[sh.userId] = (memberShares[sh.userId] || 0) + sh.amount;
        }
      }
    }
  }

  return memberShares;
}
