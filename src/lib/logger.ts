import dbConnect from '@/lib/db';
import Log from '@/models/Log';

export async function logEvent(event: string, details: any = {}) {
    try {
        await dbConnect();
        await Log.create({
            event,
            details,
        });
    } catch (error) {
        console.error('Failed to log event:', error);
    }
}
