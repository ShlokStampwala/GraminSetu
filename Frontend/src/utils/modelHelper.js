import * as tflite from '@tensorflow/tfjs-tflite';
import * as tf from '@tensorflow/tfjs';

/**
 * SCALER VALUES FROM YOUR pkl FILE [cite: 1, 2]
 * Training ke waqt jo features the: 
 * ['age', 'gender', 'height', 'weight', 'ap_hi', 'ap_lo', 'cholesterol', 'smoke', 'alco', 'active']
 */
const SCALER_MEAN = [
  46.8524,  // age
  1.3496,   // gender
  164.3592, // height
  74.2057,  // weight
  128.8145, // ap_hi
  81.3129,  // ap_lo
  1.3646,   // cholesterol
  0.0881,   // smoke
  0.0538,   // alco
  0.8037    // active
];

const SCALER_SCALE = [
  6.7645,   // age
  0.4768,   // gender
  8.2135,   // height
  14.3957,  // weight
  15.4003,  // ap_hi
  9.8824,   // ap_lo
  0.6802,   // cholesterol
  0.2834,   // smoke
  0.2255,   // alco
  0.3972    // active
];

/**
 * Function to load model and run inference 
 * @param {Array} features - Array of 10 numeric health values
 */
export const predictGraminSetuRisk = async (features) => {
  try {
    // 1. Model Loading (Make sure .tflite is in public folder) 
    const model = await tflite.loadTFLiteModel('/graminsetu_v3.tflite');

    // 2. Pre-processing: Standard Scaling [cite: 1, 2]
    // formula: (x - mean) / scale
    const scaledData = features.map((val, i) => (val - SCALER_MEAN[i]) / SCALER_SCALE[i]);
    
    // 3. Convert to Tensor 
    const inputTensor = tf.tensor([scaledData], [1, 10], 'float32');

    // 4. Run Prediction [cite: 4]
    const predictions = model.predict(inputTensor);

    // Multi-task Head Mapping [cite: 4]
    // Note: Names must match the output layer names in your Python code
    const results = {
      heartRisk: (await predictions['heart'].data())[0],
      obesityRisk: (await predictions['obesity'].data())[0],
      diabetesRisk: (await predictions['diabetes'].data())[0]
    };

    // 5. Memory Cleanup
    inputTensor.dispose();
    Object.values(predictions).forEach(t => t.dispose());

    return results;
  } catch (error) {
    console.error("Inference Error:", error);
    return null;
  }
};