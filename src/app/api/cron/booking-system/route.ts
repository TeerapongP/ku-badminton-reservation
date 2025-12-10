import { scheduledTasks } from "@/lib/scheduled-tasks";
import { NextRequest, NextResponse } from "next/server";


// GET - ตรวจสอบสถานะ scheduled tasks
export async function GET(request: NextRequest) {
  try {
    const status = await scheduledTasks.getCurrentStatus();
    
    return NextResponse.json({
      success: true,
      data: {
        ...status,
        currentTime: new Date().toISOString(),
        scheduledTasksRunning: true
      },
      message: "Scheduled tasks status retrieved successfully"
    });

  } catch (error) {
    console.error("Error getting scheduled tasks status:", error);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดในการดึงสถานะ scheduled tasks" },
      { status: 500 }
    );
  }
}

// POST - เรียกใช้ scheduled task ทันที (สำหรับ cron job)
export async function POST(request: NextRequest) {
  try {
    // ตรวจสอบ authorization header สำหรับ cron job
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'default-secret';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: "ไม่ได้รับอนุญาต" },
        { status: 401 }
      );
    }

    // เรียกใช้ scheduled task
    const instance = scheduledTasks;
    await instance['checkBookingSystemSchedule']();

    const status = await instance.getCurrentStatus();

    return NextResponse.json({
      success: true,
      data: status,
      message: "Scheduled task executed successfully"
    });

  } catch (error) {
    console.error("Error executing scheduled task:", error);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดในการเรียกใช้ scheduled task" },
      { status: 500 }
    );
  }
}