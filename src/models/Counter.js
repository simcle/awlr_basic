import mongoose from "mongoose";
const { Schema } = mongoose;

const CounterSchema = new Schema({
  name: { type: String, required: true },
  seq: { type: Number, default: 0 }
});

export default mongoose.model("Counter", CounterSchema);