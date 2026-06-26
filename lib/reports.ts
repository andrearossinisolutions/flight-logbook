import { prisma } from "@/lib/prisma";
import { getRomeDateTimeParts } from "@/lib/utils";
import { getMonthlyMaintenanceShares } from "@/lib/maintenance";

export interface AircraftDetail {
  registration: string;
  durationMinutes: number;
  cost: number;
}

export interface MemberReport {
  userId: string;
  fullName: string;
  fixedCost: number;
  flightCost: number;
  maintenanceShare: number;
  hoursExpenseShare: number;
  advancedExpense: number;
  totalCost: number;
  durationMinutes: number;
  flightsCount: number;
  aircraftDetails: AircraftDetail[];
  localBalance?: number;
  previousDebt?: number;
  totalBalance?: number;
}

export interface MonthlyReportData {
  fixedCostTotal: number;
  fixedCostPerMember: number;
  reports: MemberReport[];
}

export function computeSingleMonthReport({
  partnership,
  year,
  month,
  movements,
  memberExpenses,
  maintenanceShares,
}: {
  partnership: any;
  year: number;
  month: number;
  movements: any[];
  memberExpenses: any[];
  maintenanceShares: { [userId: string]: number };
}): MonthlyReportData {
  const fixedCostTotal = partnership.fixedCosts.reduce((acc: number, c: any) => {
    if (c.period === "MONTHLY") return acc + Number(c.amount);
    if (c.period === "YEARLY_PRORATED" || c.period === "YEARLY") return acc + Number(c.amount) / 12;
    if (c.period === "YEARLY_ONCE") {
      return c.billingMonth === month + 1 ? acc + Number(c.amount) : acc;
    }
    if (c.period === "ONE_OFF") {
      return c.billingMonth === month + 1 && c.billingYear === year ? acc + Number(c.amount) : acc;
    }
    return acc;
  }, 0);
  const fixedCostPerMember = partnership.members.length > 0 ? fixedCostTotal / partnership.members.length : 0;

  const totalDurationMinutes = movements.reduce((acc, mov) => {
    const f = mov.flight;
    const pa = f?.partnershipAircraft;
    if (!f || !pa) return acc;
    return acc + f.durationMinutes;
  }, 0);

  const totalHoursExpenses = memberExpenses
    .filter((t) => t.type === "MEMBER_EXPENSE_HOURS")
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const memberReports: MemberReport[] = partnership.members.map((m: any) => {
    const userMovements = movements.filter((mov) => mov.userId === m.userId);
    let flightCost = 0;
    let durationMinutes = 0;

    const aircraftDetailsMap = new Map<string, { duration: number; cost: number }>();

    for (const mov of userMovements) {
      const f = mov.flight;
      const pa = f?.partnershipAircraft;
      if (!f || !pa) continue;
      durationMinutes += f.durationMinutes;

      const hourlyCost = Number(pa.hourlyFuelCost) + Number(pa.hourlyMaintCost) + Number(pa.hourlyEngineFund);
      const cost = (f.durationMinutes / 60) * hourlyCost;
      flightCost += cost;

      const current = aircraftDetailsMap.get(pa.registration) || { duration: 0, cost: 0 };
      current.duration += f.durationMinutes;
      current.cost += cost;
      aircraftDetailsMap.set(pa.registration, current);
    }

    const userSentExpenses = memberExpenses.filter((t) => t.userId === m.userId);
    const userReceivedTransfers = memberExpenses.filter(
      (t) => t.type === "MEMBER_TRANSFER" && t.recipientId === m.userId
    );
    const advancedExpense =
      userSentExpenses.reduce((acc, t) => acc + Number(t.amount), 0) -
      userReceivedTransfers.reduce((acc, t) => acc + Number(t.amount), 0);
    const maintenanceShare = maintenanceShares[m.userId] || 0;

    let hoursExpenseShare = 0;
    if (totalHoursExpenses > 0) {
      if (totalDurationMinutes > 0) {
        hoursExpenseShare = totalHoursExpenses * (durationMinutes / totalDurationMinutes);
      } else {
        hoursExpenseShare = totalHoursExpenses / partnership.members.length;
      }
    }

    const totalCost = fixedCostPerMember + flightCost + maintenanceShare + hoursExpenseShare - advancedExpense;

    return {
      userId: m.userId,
      fullName: m.user.fullName || m.user.email,
      fixedCost: fixedCostPerMember,
      flightCost,
      maintenanceShare,
      hoursExpenseShare,
      advancedExpense,
      totalCost,
      durationMinutes,
      flightsCount: userMovements.length,
      aircraftDetails: Array.from(aircraftDetailsMap.entries()).map(([reg, data]) => ({
        registration: reg,
        durationMinutes: data.duration,
        cost: data.cost,
      })),
    };
  });

  const totalCostSum = memberReports.reduce((acc: number, r: any) => acc + r.totalCost, 0);
  const averageCost = partnership.members.length > 0 ? totalCostSum / partnership.members.length : 0;

  const reportsWithBalance = memberReports.map((r: any) => ({
    ...r,
    localBalance: r.totalCost - averageCost,
  }));

  return {
    fixedCostTotal,
    fixedCostPerMember,
    reports: reportsWithBalance,
  };
}

export async function calculateHistoricalReports(
  partnershipId: string,
  targetYear: number,
  targetMonth: number // 0-indexed
): Promise<MonthlyReportData> {
  const partnership = await prisma.partnership.findUnique({
    where: { id: partnershipId },
    include: {
      members: { include: { user: true } },
      fixedCosts: true,
      aircrafts: true,
    },
  });
  if (!partnership) throw new Error("Società non trovata");

  const startYear = partnership.createdAt.getFullYear();
  const startMonth = partnership.createdAt.getMonth();

  // Find range of months: all months from partnership.createdAt up to (targetYear, targetMonth) inclusive
  const months: { year: number; month: number }[] = [];
  let currYear = startYear;
  let currMonth = startMonth;
  while (currYear < targetYear || (currYear === targetYear && currMonth <= targetMonth)) {
    months.push({ year: currYear, month: currMonth });
    currMonth++;
    if (currMonth > 11) {
      currMonth = 0;
      currYear++;
    }
  }

  const endOfTargetMonth = new Date(targetYear, targetMonth + 1, 1);
  const aircraftIds = partnership.aircrafts.map((a) => a.id);

  // Fetch all historical flights and transactions up to the end of targetMonth
  const [allMovements, allExpenses, aircraftsWithLogs, allHistoricalFlights] = await Promise.all([
    prisma.movement.findMany({
      where: {
        type: "FLIGHT",
        isDraft: false,
        date: { lt: endOfTargetMonth },
        flight: { partnershipAircraftId: { in: aircraftIds } },
      },
      include: {
        flight: { include: { partnershipAircraft: true } },
        user: true,
      },
    }),
    prisma.partnershipTransaction.findMany({
      where: {
        partnershipId,
        type: { in: ["MEMBER_EXPENSE", "MEMBER_EXPENSE_HOURS", "MEMBER_TRANSFER"] },
        date: { lt: endOfTargetMonth },
      },
    }),
    prisma.partnershipAircraft.findMany({
      where: { partnershipId },
      include: {
        maintenanceLogs: { orderBy: { date: "desc" } },
      },
    }),
    prisma.flight.findMany({
      where: {
        partnershipAircraftId: { in: aircraftIds },
        movement: { isDraft: false },
      },
      include: {
        movement: { include: { user: true } },
      },
    }),
  ]);

  const previousBalances: { [userId: string]: number } = {};
  for (const m of partnership.members) {
    previousBalances[m.userId] = 0;
  }

  let targetReport: MonthlyReportData | null = null;

  for (const m of months) {
    const isTarget = m.year === targetYear && m.month === targetMonth;
    const startOfMonth = new Date(m.year, m.month, 1);
    const endOfMonth = new Date(m.year, m.month + 1, 1);

    const monthMovements = allMovements.filter(
      (mov) => mov.date >= startOfMonth && mov.date < endOfMonth
    );
    const monthExpenses = allExpenses.filter(
      (t) => t.date >= startOfMonth && t.date < endOfMonth
    );

    let maintenanceShares: { [userId: string]: number } = {};
    if (partnership.disableSharedFund && aircraftIds.length > 0) {
      maintenanceShares = getMonthlyMaintenanceShares(
        startOfMonth,
        endOfMonth,
        aircraftsWithLogs,
        allHistoricalFlights,
        partnership.members
      );
    }

    const report = computeSingleMonthReport({
      partnership,
      year: m.year,
      month: m.month,
      movements: monthMovements,
      memberExpenses: monthExpenses,
      maintenanceShares,
    });

    if (isTarget) {
      targetReport = report;
    } else {
      for (const r of report.reports) {
        previousBalances[r.userId] = (previousBalances[r.userId] || 0) + (r.localBalance ?? 0);
      }
    }
  }

  if (!targetReport) {
    targetReport = computeSingleMonthReport({
      partnership,
      year: targetYear,
      month: targetMonth,
      movements: [],
      memberExpenses: [],
      maintenanceShares: {},
    });
  }

  const finalReports = targetReport.reports.map((r) => {
    const prevDebt = previousBalances[r.userId] || 0;
    const totalBalance = (r.localBalance ?? 0) + prevDebt;
    return {
      ...r,
      previousDebt: prevDebt,
      totalBalance: totalBalance,
    };
  });

  return {
    fixedCostTotal: targetReport.fixedCostTotal,
    fixedCostPerMember: targetReport.fixedCostPerMember,
    reports: finalReports,
  };
}
