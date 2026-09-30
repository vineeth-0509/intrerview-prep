import { runPipeline } from "@aipk/core";
import { Kit } from "../models/Kit";
import { env } from "../config/env";


export async function runAndPersistPipeline(kitId: string): Promise<void> {
  const doc = await Kit.findById(kitId);
  if (!doc) return;

  try {
    doc.pipeline_status = "running";
    doc.current_step = undefined;
    doc.steps_completed = [];
    doc.pipeline_error = null;
    await doc.save();

    const result = await runPipeline(
      
      {
        onStep: async (step) => {
          doc.current_step = step;
          doc.steps_completed = [...doc.steps_completed, step];
          await doc.save();
        },
      },
    );

    if (!result.valid) {
      doc.pipeline_status = "failed";
      doc.pipeline_error = {
        code: "INVALID_KIT_STRUCTURE",
        message: result.validationErrors.map((e) => `${e.path}: ${e.message}`).join("; "),
      };
      await doc.save();
      return;
    }

    
    doc.kit = result.kit as unknown as typeof doc.kit;
    doc.pipeline_status = "completed";
    doc.current_step = undefined;
    await doc.save();
  } catch (err) {
    doc.pipeline_status = "failed";
    doc.pipeline_error = {
      code: "PIPELINE_ERROR",
      message: err instanceof Error ? err.message : "Unknown pipeline error",
    };
    await doc.save();
  }
}
