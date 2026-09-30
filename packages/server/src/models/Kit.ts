import { Schema, model, Types } from "mongoose";



const ItemMetaSchema = new Schema(
  {
    source: {
      type: String,
      enum: ["generated", "user_edited", "user_created"],
      required: true,
    },
    pinned: { type: Boolean, required: true },
    version: { type: Number, required: true, default: 0 },
  },
  { _id: false },
);

const RequirementSchema = new Schema(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
    kind: { type: String, enum: ["technical", "behavioural", "domain"], required: true },
    priority: { type: String, enum: ["must", "nice"], required: true },
    meta: { type: ItemMetaSchema, required: false },
  },
  { _id: false },
);

const QuestionSchema = new Schema(
  {
    id: { type: String, required: true },
    requirement_ids: { type: [String], required: true, default: [] },
    category: {
      type: String,
      enum: ["technical", "behavioural", "system-design", "company-fit"],
      required: true,
    },
    prompt: { type: String, required: true },
    answer_outline: { type: String, default: "" }, // zod allows "" — not required
    difficulty: { type: Number, enum: [1, 2, 3], required: true },
    meta: { type: ItemMetaSchema, required: false },
  },
  { _id: false },
);

const FlashcardSchema = new Schema(
  {
    id: { type: String, required: true },
    front: { type: String, required: true },
    back: { type: String, required: true },
    requirement_ids: { type: [String], required: true, default: [] },
    meta: { type: ItemMetaSchema, required: false },
  },
  { _id: false },
);

const ScheduleDaySchema = new Schema(
  {
    day: { type: Number, required: true },
    focus: { type: String, default: "" }, // zod allows "" — not required
    question_ids: { type: [String], required: true, default: [] },
    minutes: { type: Number, required: true },
    meta: { type: ItemMetaSchema, required: false },
  },
  { _id: false },
);

const KitBodySchema = new Schema(
  {
    source: {
      company: { type: String, default: "" }, // zod allows "" — not required
      company_url: { type: String, required: true }, // zod requires a valid URL
      role: { type: String, default: "" }, // zod allows "" — not required
      location: { type: String, default: "" }, // zod allows "" — not required
      jd_chars: { type: Number, required: true, default: 0 },
      researched_at: { type: String, required: true }, // zod requires a valid timestamp
      pages_used: { type: [String], required: true, default: [] },
    },
    company_brief: {
      summary: { type: String, default: "" }, // zod allows "" — not required
      what_they_do: { type: String, default: "" }, // always "" when nothing was found (§10)
      sources: { type: [String], required: true, default: [] },
      meta: { type: ItemMetaSchema, required: false },
    },
    role: {
      title: { type: String, default: "" }, // zod allows "" — not required
      seniority: { type: String, default: "" }, // zod allows "" — not required
      responsibilities: { type: [String], required: true, default: [] },
      requirements: { type: [RequirementSchema], required: true, default: [] },
    },
    questions: { type: [QuestionSchema], required: true, default: [] },
    flashcards: { type: [FlashcardSchema], required: true, default: [] },
    schedule: {
      days_available: { type: Number, required: true, default: 0 },
      days: { type: [ScheduleDaySchema], required: true, default: [] },
    },
    coverage: {
      uncovered_requirement_ids: { type: [String], required: true, default: [] },
      passes: { type: Number, required: true, default: 0 },
    },
  },
  { _id: false },
);

const PipelineErrorSchema = new Schema(
  {
    code: { type: String, required: true },
    message: { type: String, required: true },
    step: { type: String, required: false },
  },
  { _id: false },
);

const KitSchema = new Schema(
  {
    owner_id: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    jd_text: { type: String, required: true },
    company_url: { type: String, required: true },
    days_requested: { type: Number, required: true },
    content_hash: { type: String, required: true, index: true },

    pipeline_status: {
      type: String,
      enum: ["idle", "running", "completed", "failed"],
      required: true,
      default: "idle",
    },
    current_step: { type: String, required: false },
    steps_completed: { type: [String], required: true, default: [] },
    pipeline_error: { type: PipelineErrorSchema, required: false, default: null },

    kit: { type: KitBodySchema, required: false, default: null },
  },
  { timestamps: true },
);


KitSchema.index({ owner_id: 1, content_hash: 1 });

export const Kit = model("Kit", KitSchema);
