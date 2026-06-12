import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const notificationStateSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    readKeys: { type: [String], default: [] },
    dismissedKeys: { type: [String], default: [] },
  },
  { timestamps: true },
);

export type NotificationStateDoc = InferSchemaType<typeof notificationStateSchema>;

export const NotificationState: Model<NotificationStateDoc> =
  (models.NotificationState as Model<NotificationStateDoc>) ??
  model<NotificationStateDoc>("NotificationState", notificationStateSchema);
