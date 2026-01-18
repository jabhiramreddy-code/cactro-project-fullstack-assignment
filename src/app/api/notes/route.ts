import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Note from '@/models/Note';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logEvent } from '@/lib/logger';

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const videoId = searchParams.get('videoId');
        const search = searchParams.get('search');

        await dbConnect();

        const query: any = {};
        if (videoId) query.videoId = videoId;
        if (search) {
            query.$or = [
                { content: { $regex: search, $options: 'i' } },
                { tags: { $in: [new RegExp(search, 'i')] } },
            ];
        }

        const notes = await Note.find(query).sort({ createdAt: -1 });
        return NextResponse.json(notes);
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to fetch notes' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { videoId, content, tags } = body;

        if (!videoId || !content) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        await dbConnect();
        const note = await Note.create({
            videoId,
            content,
            tags: tags || [],
        });

        await logEvent('NOTE_CREATED', { noteId: note._id, videoId });

        return NextResponse.json(note, { status: 201 });
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to create note' },
            { status: 500 }
        );
    }
}
