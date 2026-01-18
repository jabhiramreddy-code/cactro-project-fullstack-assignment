import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILog extends Document {
    event: string;
    details: Record<string, any>;
    timestamp: Date;
}

const LogSchema: Schema = new Schema(
    {
        event: { type: String, required: true },
        details: { type: Schema.Types.Mixed, default: {} },
        timestamp: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

const Log: Model<ILog> =
    mongoose.models.Log || mongoose.model<ILog>('Log', LogSchema);

export default Log;
