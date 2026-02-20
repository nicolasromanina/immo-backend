import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  conversation: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  content: string;
  type: 'text' | 'image' | 'file';
  readBy: mongoose.Types.ObjectId[];
  createdAt: Date;
}

const MessageSchema: Schema = new Schema(
  {
    conversation: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String },
    type: { type: String, enum: ['text', 'image', 'file'], default: 'text' },
    readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model<IMessage>('Message', MessageSchema);
