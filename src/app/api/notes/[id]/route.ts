import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Note from '@/models/Note';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logEvent } from '@/lib/logger';

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> } // Fix: Promise
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const { content, tags } = body;

        await dbConnect();
        const note = await Note.findByIdAndUpdate(
            id,
            { content, tags },
            { new: true }
        );

        if (!note) {
            return NextResponse.json({ error: 'Note not found' }, { status: 404 });
        }

        await logEvent('NOTE_UPDATED', { noteId: id });

        return NextResponse.json(note);
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to update note' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> } // Fix: Promise
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        await dbConnect();
        const note = await Note.findByIdAndDelete(id);

        if (!note) {
            return NextResponse.json({ error: 'Note not found' }, { status: 404 });
        }

        await logEvent('NOTE_DELETED', { noteId: id });

        return NextResponse.json({ message: 'Note deleted' });
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to delete note' },
            { status: 500 }
        );
    }
}
