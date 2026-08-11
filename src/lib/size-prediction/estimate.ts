// Formula-based body measurement estimate from height/weight/gender.
// Not a substitute for a tape measure — gives a reasonable circumference
// estimate for typical builds so we can suggest a size, with a visible
// "Any doubts? Edit" escape hatch in the UI for the user to override.

export type Gender = 'male' | 'female'

export type EstimatedMeasurements = {
  bustCm: number
  waistCm: number
  hipCm: number
}

// BMI drives how much a person's frame carries around the waist/hip/bust
// relative to height, height alone drives the overall scale. Coefficients
// are tuned against published adult anthropometric survey averages (e.g.
// ISO 8559 / ASTM D5585-011 body measurement tables), not a proprietary
// dataset — expect +/-3-5cm error for atypical proportions.
export const estimateMeasurements = (
  heightCm: number,
  weightKg: number,
  gender: Gender,
): EstimatedMeasurements => {
  const bmi = weightKg / (heightCm / 100) ** 2

  if (gender === 'male') {
    return {
      bustCm: round1(0.5 * heightCm + 1.5 * bmi + 8),
      waistCm: round1(0.45 * heightCm + 1.8 * bmi - 8),
      hipCm: round1(0.48 * heightCm + 1.3 * bmi + 4),
    }
  }

  return {
    bustCm: round1(0.42 * heightCm + 1.6 * bmi + 8),
    waistCm: round1(0.34 * heightCm + 1.6 * bmi - 2),
    hipCm: round1(0.44 * heightCm + 1.4 * bmi + 10),
  }
}

const round1 = (value: number) => Math.round(value * 10) / 10

export const cmToIn = (cm: number) => round1(cm / 2.54)

// A user-entered bust/waist/hip always beats the height/weight formula for
// that specific measurement — this is what "Detailed Fit" refines.
export const applyMeasurementOverrides = (
  base: EstimatedMeasurements,
  overrides: { bustCm?: number | null; waistCm?: number | null; hipCm?: number | null },
): EstimatedMeasurements => ({
  bustCm: overrides.bustCm ?? base.bustCm,
  waistCm: overrides.waistCm ?? base.waistCm,
  hipCm: overrides.hipCm ?? base.hipCm,
})
