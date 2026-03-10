// src/lib/PricingService.ts
import { prisma } from "./prisma";
import { users_role, users_membership, pricing_rules_user_role, pricing_rules_membership } from "@prisma/client";

export class PricingService {
    /**
     * Map user role to pricing rules role
     */
    static mapUserRole(role: users_role): pricing_rules_user_role {
        switch (role) {
            case 'student':
            case 'demonstration_student':
                return 'student';
            case 'staff':
                return 'staff';
            case 'admin':
            case 'super_admin':
                return 'admin';
            case 'guest':
            default:
                return 'public';
        }
    }

    /**
     * Map user membership status to pricing rules membership status
     */
    static mapMembership(membership: users_membership | null): pricing_rules_membership {
        return membership === 'member' ? 'member' : 'non_member';
    }

    /**
     * Get booking price based on user role and membership
     * Official Pricing Rules (Default fallbacks):
     * 1. Student/Univ Student/Univ Staff: Member 40, Non-Member 60
     * 2. General Public: Member 60, Non-Member 80
     */
    static async getBookingPrice(params: {
        facilityId: bigint;
        courtId?: bigint;
        slotId?: bigint;
        role: users_role;
        membership: users_membership | null;
    }): Promise<number> {
        const { facilityId, courtId, slotId, role, membership } = params;
        const pricingRole = this.mapUserRole(role);
        const pricingMembership = this.mapMembership(membership);

        // Try to find the most specific rule first
        // Hierarchy: Court+Slot+Role+Mem > Court+Role+Mem > Slot+Role+Mem > Facility+Role+Mem > Default

        const rule = await prisma.pricing_rules.findFirst({
            where: {
                facility_id: facilityId,
                active: true,
                user_role: pricingRole,
                membership: pricingMembership,
                effective_from: { lte: new Date() },
                AND: [
                    {
                        OR: [
                            { court_id: courtId },
                            { court_id: null }
                        ],
                    },
                    {
                        OR: [
                            { effective_to: null },
                            { effective_to: { gte: new Date() } },
                        ],
                    },
                ],
            },
            orderBy: [
                { court_id: 'desc' }, // specific court first
                { pricing_id: 'desc' }
            ]
        });

        if (rule) {
            return rule.price_cents;
        }

        // Default Fallbacks according to requirements if no rule is found in DB
        if (pricingRole === 'public') {
            return pricingMembership === 'member' ? 60 : 80;
        } else {
            // student, staff, admin
            return pricingMembership === 'member' ? 40 : 60;
        }
    }
}
