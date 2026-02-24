import mongoose, { Schema, Document } from 'mongoose';

export interface IConversation extends Document {
  participants: { user: mongoose.Types.ObjectId; role?: string }[];
  lastMessage?: string;
  metadata?: { type?: string; leadName?: string };
  updatedAt: Date;
  createdAt: Date;
}

const ConversationSchema: Schema = new Schema(
  {
    participants: [
      {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        role: { type: String },
      },
    ],
    lastMessage: { type: String },
    metadata: {
      type: { type: String },
      leadName: { type: String },
    },
  },
  { timestamps: true }
);

export default mongoose.model<IConversation>('RealtimeConversation', ConversationSchema);
