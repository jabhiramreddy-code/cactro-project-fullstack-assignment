import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INote extends Document {
    videoId: string;
    content: string;
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
}

const NoteSchema: Schema = new Schema(
    {
        videoId: { type: String, required: true, index: true },
        content: { type: String, required: true },
        tags: { type: [String], default: [] },
    },
    { timestamps: true }
);

// Prevent overwrite on HMR
const Note: Model<INote> =
    mongoose.models.Note || mongoose.model<INote>('Note', NoteSchema);

export default Note;
