import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromCookie } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await getSessionFromCookie();
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const data = await request.json();
  const { path, config } = data;

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Update Settings
      await tx.settings.upsert({
        where: { userId: session.userId },
        update: {
          instructorRatePerHour: config.instructorRate || 80,
          rentalRatePerHour: config.rentalRate || 150,
          onboardingCompleted: true,
        },
        create: {
          userId: session.userId,
          instructorRatePerHour: config.instructorRate || 80,
          rentalRatePerHour: config.rentalRate || 150,
          onboardingCompleted: true,
        },
      });

      // 2. Path Specific Logic
      if (path === "RENTAL" && config.aircraft) {
        await tx.rentalAircraft.create({
          data: {
            userId: session.userId,
            registration: config.aircraft.registration.toUpperCase(),
            type: config.aircraft.type || "P92",
            hourlyCost: config.aircraft.hourlyCost || 150,
          },
        });
      } else if (path === "PARTNERSHIP_ADMIN" && config.partnership) {
        const p = await tx.partnership.create({
          data: { name: config.partnership.name },
        });

        await tx.partnershipMember.create({
          data: {
            partnershipId: p.id,
            userId: session.userId,
            role: "ADMIN",
          },
        });

        if (config.partnership.aircraft) {
          await tx.partnershipAircraft.create({
            data: {
              partnershipId: p.id,
              registration: config.partnership.aircraft.registration.toUpperCase(),
              type: config.partnership.aircraft.type || "P92",
              hourlyFuelCost: config.partnership.aircraft.hourlyFuelCost || 0,
              hourlyMaintCost: config.partnership.aircraft.hourlyMaintCost || 0,
              hourlyEngineFund: config.partnership.aircraft.hourlyEngineFund || 0,
            },
          });
        }

        if (config.partnership.fixedCosts && config.partnership.fixedCosts.length > 0) {
          for (const fc of config.partnership.fixedCosts) {
            await tx.partnershipFixedCost.create({
              data: {
                partnershipId: p.id,
                description: fc.description,
                amount: fc.amount,
                period: fc.period || "MONTHLY",
              },
            });
          }
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Onboarding error:", error);
    return new NextResponse(error.message || "Internal Server Error", { status: 500 });
  }
}
