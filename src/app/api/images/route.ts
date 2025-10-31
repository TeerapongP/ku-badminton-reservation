import { NextRequest } from 'next/server'
import { createReadStream, promises as fs } from 'fs'
import { statSync } from 'fs'
import path from 'path'
import mime from 'mime'

const ALLOWED_DIRS = new Set(['profiles', 'facilities', 'courts', 'payments', 'banners', 'temp'])

export async function GET(req: NextRequest, { params }: { params: { path?: string[] } }) {
    try {
        const baseDir = process.env.IMAGE_PATH || '/app/public/uploads'
        const segments = params.path ?? []

        // ไม่มี path -> ส่งตัวอย่าง (เหมือน fallback ปัจจุบันแต่ 200/400 ตามต้องการ)
        if (segments.length === 0) {
            return new Response(JSON.stringify({
                error: 'Image path required',
                message: 'Please specify image path: /api/images/[path]',
                examples: [
                    '/api/images/profiles/image.jpg',
                    '/api/images/facilities/facility.png',
                    '/api/images/courts/court.webp',
                    '/api/images/banners/banner.jpg',
                ],
            }), { status: 400, headers: { 'content-type': 'application/json' } })
        }

        // ตรวจไดเรกทอรีชั้นแรกให้เป็น allowed เท่านั้น
        const top = segments[0]
        if (!ALLOWED_DIRS.has(top)) {
            return new Response(JSON.stringify({ error: 'Forbidden directory' }), {
                status: 403, headers: { 'content-type': 'application/json' },
            })
        }

        // ป้องกัน path traversal: resolve แล้วตรวจว่าอยู่ใต้ baseDir จริง
        const requested = path.join(...segments)
        const absBase = path.resolve(baseDir)
        const absFile = path.resolve(absBase, requested)

        if (!absFile.startsWith(absBase + path.sep)) {
            return new Response(JSON.stringify({ error: 'Invalid path' }), {
                status: 400, headers: { 'content-type': 'application/json' },
            })
        }

        // มีไฟล์ไหม
        let st
        try { st = statSync(absFile) } catch { /* no-op */ }
        if (!st || !st.isFile()) {
            return new Response(JSON.stringify({ error: 'Not Found' }), {
                status: 404, headers: { 'content-type': 'application/json' },
            })
        }

        // content-type
        const type = mime.getType(absFile) || 'application/octet-stream'

        // stream ออกไป (ต้องใช้ Node.js runtime ไม่ใช่ Edge)
        const stream = createReadStream(absFile)
        return new Response(stream as any, {
            status: 200,
            headers: {
                'content-type': type,
                'cache-control': 'public, max-age=31536000, immutable',
            },
        })
    } catch (err) {
        console.error('Image route error:', err)
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
            status: 500, headers: { 'content-type': 'application/json' },
        })
    }
}
