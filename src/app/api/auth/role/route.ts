import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/Auth';
import { decode } from '@/lib/Cryto';

const ALLOWED_ROLES = new Set(['admin', 'super_admin', 'student', 'staff', 'guest']);

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        // A01 — Reject unauthenticated requests
        if (!session?.user) {
            return NextResponse.json(
                { success: false, error: 'Not authenticated' },
                { status: 401 }
            );
        }

        const sessionRole = session.user.role;

        // A04 — Validate role exists before processing
        if (!sessionRole) {
            return NextResponse.json(
                { success: false, error: 'No role found' },
                { status: 400 }
            );
        }

        // A02 — Plain role: validate against whitelist directly, no decode needed
        if (ALLOWED_ROLES.has(sessionRole)) {
            return NextResponse.json({ success: true, role: sessionRole });
        }

        // A02 — Encrypted role: decode then validate against whitelist
        try {
            const decodedRole = await decode(sessionRole);

            // A03 — Never trust decoded value without whitelist validation
            if (!ALLOWED_ROLES.has(decodedRole)) {
                console.error('[api/auth/role] Decoded role not in whitelist:', decodedRole);
                return NextResponse.json(
                    { success: false, error: 'Invalid role' },
                    { status: 403 }
                );
            }

            return NextResponse.json({ success: true, role: decodedRole });

        } catch (error) {
            // A09 — decode failed = invalid format or tampered token
            // SECURITY: Never return raw/encrypted role to client
            console.error('[api/auth/role] Failed to decode role:', error instanceof Error ? error.message : 'Unknown error');
            return NextResponse.json(
                { success: false, error: 'Invalid role format' },
                { status: 400 }
            );
        }

    } catch (error) {
        // A09 — Generic handler: log internally, return generic message
        console.error('[api/auth/role] Unexpected error:', error instanceof Error ? error.message : 'Unknown error');
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}