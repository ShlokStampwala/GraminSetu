/**
 * useModel.js — HealthRisk ANN v3
 * 24 features — ONNX ONLY, no CDN imports, no TFLite CDN
 * Requires: npm install onnxruntime-web
 * Files needed in public/models/: health_risk.onnx, model_meta.json
 */
import { useState, useCallback, useRef } from 'react';

// ── Helpers ──────────────────────────────────────────────────────
export function calcAge(dob) {
  if (!dob) return 0;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return Math.max(0, age);
}

export function getBMIInfo(bmi) {
  if (bmi < 18.5) return { label: 'Underweight', color: '#00e5ff' };
  if (bmi < 25)   return { label: 'Normal',       color: '#69ff47' };
  if (bmi < 30)   return { label: 'Overweight',   color: '#ffd93d' };
  return                  { label: 'Obese',        color: '#ff6b6b' };
}

export function getRiskLevel(prob) {
  if (prob >= 0.65) return { label: 'HIGH',     color: '#ff6b6b', bg: '#ff6b6b22', emoji: '🔴' };
  if (prob >= 0.35) return { label: 'MODERATE', color: '#ffd93d', bg: '#ffd93d22', emoji: '🟡' };
  return                   { label: 'LOW',      color: '#69ff47', bg: '#69ff4722', emoji: '🟢' };
}

/**
 * 24 features in exact order matching model_meta.json:
 * age, gender, height, weight, bmi, wnh,
 * ap_hi, ap_lo, cholesterol, gluc, smoke, alco, active,
 * pulse_pressure, map, hypertension, stage2_htn,
 * age_chol, age_bmi, age_map, map_chol, pp_age, ap_hi_chol, bmi_chol
 */
export function buildFeatures(formData, scaler) {
  const age    = calcAge(formData.dob);
  const gender = Number(formData.gender)      || 1;
  const height = Number(formData.height)      || 170;
  const weight = Number(formData.weight)      || 70;
  const ap_hi  = Number(formData.ap_hi)       || 120;
  const ap_lo  = Number(formData.ap_lo)       || 80;
  const chol   = Number(formData.cholesterol) || 1;
  const gluc   = Number(formData.gluc)        || 1;
  const smoke  = Number(formData.smoke)       || 0;
  const alco   = Number(formData.alco)        || 0;
  const active = Number(formData.active)      || 1;

  const bmi            = height > 0 ? weight / ((height / 100) ** 2) : 0;
  const wnh            = height > 0 ? weight / height : 0;
  const pulse_pressure = ap_hi - ap_lo;
  const map_val        = ap_lo + pulse_pressure / 3;
  const hypertension   = (ap_hi >= 130 || ap_lo >= 80) ? 1 : 0;
  const stage2_htn     = ap_hi >= 140 ? 1 : 0;
  const age_chol       = age * chol;
  const age_bmi        = age * bmi;
  const age_map        = age * map_val;
  const map_chol       = map_val * chol;
  const pp_age         = pulse_pressure * age;
  const ap_hi_chol     = ap_hi * chol;
  const bmi_chol       = bmi * chol;

  const raw = [
    age, gender, height, weight, bmi, wnh,
    ap_hi, ap_lo, chol, gluc, smoke, alco, active,
    pulse_pressure, map_val, hypertension, stage2_htn,
    age_chol, age_bmi, age_map, map_chol, pp_age, ap_hi_chol, bmi_chol
  ];

  if (scaler?.mean?.length === 24 && scaler?.scale?.length === 24) {
    return new Float32Array(raw.map((v, i) => (v - scaler.mean[i]) / scaler.scale[i]));
  }
  return new Float32Array(raw);
}

export function getCalculatedValues(formData) {
  const age = calcAge(formData.dob);
  const h_m = (Number(formData.height) || 170) / 100;
  const bmi = h_m > 0 ? Number(formData.weight) / (h_m * h_m) : 0;
  const pp  = (Number(formData.ap_hi) || 0) - (Number(formData.ap_lo) || 0);
  const map = Number(formData.ap_lo || 0) + pp / 3;
  const htn = (Number(formData.ap_hi) >= 130 || Number(formData.ap_lo) >= 80);
  return {
    age,
    bmi: parseFloat(bmi.toFixed(1)),
    bmiInfo: getBMIInfo(bmi),
    pulse_pressure: pp,
    map_val: parseFloat(map.toFixed(1)),
    hypertension: htn,
  };
}

// ── Main Hook ────────────────────────────────────────────────────
export function useModel() {
  const [status,    setStatus]    = useState('idle');
  const [modelType, setModelType] = useState(null);
  const [meta,      setMeta]      = useState(null);
  const [error,     setError]     = useState(null);
  const onnxRef = useRef(null);

  const loadMeta = useCallback(async () => {
    const res = await fetch('/models/model_meta.json');
    if (!res.ok) throw new Error(`model_meta.json not found. Put it in public/models/`);
    return res.json();
  }, []);

  const loadONNX = useCallback(async () => {
    try {
      const ort = await import('onnxruntime-web');
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.simd = true;

      const session = await ort.InferenceSession.create(
        '/models/health_risk.onnx',
        { executionProviders: ['wasm'], graphOptimizationLevel: 'all' }
      );
      onnxRef.current = {
        session,
        Tensor:     ort.Tensor,
        inputName:  session.inputNames[0],
        outputName: session.outputNames[0],
      };
      console.log('[Model] ONNX loaded ✓');
      return true;
    } catch (e) {
      console.warn('[Model] ONNX failed:', e.message);
      return false;
    }
  }, []);

  const initialize = useCallback(async () => {
    if (status === 'ready' || status === 'loading') return;
    setStatus('loading');
    setError(null);
    try {
      const metaData = await loadMeta();
      setMeta(metaData);
      if (await loadONNX()) {
        setModelType('onnx');
        setStatus('ready');
        return;
      }
      throw new Error('ONNX failed. Run: npm install onnxruntime-web  and check public/models/health_risk.onnx exists.');
    } catch (e) {
      setError(e.message);
      setStatus('error');
      console.error('[Model]', e.message);
    }
  }, [status, loadMeta, loadONNX]);

  const predict = useCallback(async (formData) => {
    if (status !== 'ready') throw new Error('Model not ready');
    if (!meta)              throw new Error('Meta not loaded');

    const inputArray = buildFeatures(formData, meta.scaler);
    const dim        = meta.input_dim; // 24

    const { session, Tensor, inputName, outputName } = onnxRef.current;
    const tensor  = new Tensor('float32', inputArray, [1, dim]);
    const results = await session.run({ [inputName]: tensor });
    const probs   = Array.from(results[outputName].data);

    const result = {};
    meta.output_labels.forEach((label, i) => {
      const prob = Math.max(0, Math.min(1, probs[i]));
      result[label] = {
        probability: prob,
        percentage:  Math.round(prob * 1000) / 10,
        ...getRiskLevel(prob),
      };
    });
    result._calculated = getCalculatedValues(formData);
    return result;
  }, [status, meta, modelType]);

  const reset = useCallback(() => {
    onnxRef.current = null;
    setStatus('idle'); setModelType(null); setMeta(null); setError(null);
  }, []);

  return {
    initialize, predict, reset,
    status, modelType, meta, error,
    isReady:   status === 'ready',
    isLoading: status === 'loading',
    hasError:  status === 'error',
  };
}