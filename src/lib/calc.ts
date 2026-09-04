import type { ActivityLevel, GoalType, Profile, Sex } from '../types'

/** 体脂肪1kg ≒ 7200kcal */
const KCAL_PER_KG = 7200

export function bmi(heightCm: number, weightKg: number): number {
  if (!heightCm || !weightKg) return 0
  const m = heightCm / 100
  return weightKg / (m * m)
}

export function bmiCategory(value: number): string {
  if (value < 18.5) return '低体重'
  if (value < 25) return '普通体重'
  if (value < 30) return '肥満(1度)'
  if (value < 35) return '肥満(2度)'
  return '肥満(3度以上)'
}

/** 標準体重 (BMI 22 基準) */
export function standardWeight(heightCm: number): number {
  const m = heightCm / 100
  return 22 * m * m
}

/** 基礎代謝量 (Mifflin-St Jeor 式) */
export function bmr(profile: Pick<Profile, 'heightCm' | 'weightKg' | 'age' | 'sex'>): number {
  const { heightCm, weightKg, age, sex } = profile
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  const offset = sexOffset(sex)
  return Math.max(0, base + offset)
}

function sexOffset(sex: Sex): number {
  // male: +5, female: -161。other は中間値を用いる
  if (sex === 'male') return 5
  if (sex === 'female') return -161
  return -78
}

const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
}

export const ACTIVITY_LABEL: Record<ActivityLevel, string> = {
  sedentary: 'ほぼ座り仕事・運動なし',
  light: '週1〜3回の軽い運動',
  moderate: '週3〜5回の運動',
  active: '週6回以上・肉体労働',
}

/** 総消費カロリー */
export function tdee(profile: Profile): number {
  return bmr(profile) * ACTIVITY_FACTOR[profile.activityLevel]
}

/** 最大心拍数 (Tanaka 式) */
export function maxHeartRate(age: number): number {
  return Math.round(208 - 0.7 * age)
}

export interface GoalPlan {
  /** 目標体重までの差分(kg)。正なら増量、負なら減量 */
  deltaKg: number
  direction: 'gain' | 'lose' | 'maintain'
  /** 推奨される1週間あたりの体重変化(kg) */
  safeWeeklyKg: number
  /** 推奨ペースで到達するまでの週数 */
  weeksAtSafePace: number
  /** 推奨ペースでの到達予定日 */
  projectedDate: string | null
  /** 1日の推奨摂取カロリー */
  dailyCalories: number
  /** 維持カロリーとの差 */
  calorieDelta: number
  /** 1日の推奨タンパク質(g) */
  proteinG: number
  /** 目標日が設定されている場合、そのペースが無理なく達成可能か */
  deadlineFeasible: boolean | null
  /** 目標日までの週数 */
  weeksToDeadline: number | null
  milestones: Milestone[]
}

export interface Milestone {
  label: string
  weightKg: number
  /** YYYY-MM-DD */
  date: string
  weeksFromNow: number
}

/**
 * プロフィールと目標から、目標体重までのステップを算出する。
 * 減量は体重の0.5%/週、増量は0.25%/週を安全ペースとしている。
 */
export function buildGoalPlan(
  profile: Profile,
  goalType: GoalType,
  targetWeightKg?: number,
  targetDate?: string,
): GoalPlan {
  const maintenance = tdee(profile)
  const target = targetWeightKg ?? profile.weightKg
  const deltaKg = round1(target - profile.weightKg)
  const direction: GoalPlan['direction'] =
    Math.abs(deltaKg) < 0.5 ? 'maintain' : deltaKg > 0 ? 'gain' : 'lose'

  const ratePerWeek = direction === 'gain' ? 0.0025 : 0.005
  const safeWeeklyKg = round2(profile.weightKg * ratePerWeek)
  const weeksAtSafePace =
    direction === 'maintain' || safeWeeklyKg <= 0
      ? 0
      : Math.ceil(Math.abs(deltaKg) / safeWeeklyKg)

  const weeksToDeadline = targetDate ? weeksBetween(new Date(), new Date(targetDate)) : null

  // 実際に用いる週あたり変化量。目標日があればそれに合わせるが、安全上限の1.5倍で頭打ち
  let weeklyKg = direction === 'maintain' ? 0 : safeWeeklyKg * (direction === 'gain' ? 1 : -1)
  let deadlineFeasible: boolean | null = null
  if (weeksToDeadline !== null && weeksToDeadline > 0 && direction !== 'maintain') {
    const required = deltaKg / weeksToDeadline
    deadlineFeasible = Math.abs(required) <= safeWeeklyKg * 1.2
    const cap = safeWeeklyKg * 1.5
    weeklyKg = clamp(required, -cap, cap)
  }

  const calorieDelta = Math.round((weeklyKg * KCAL_PER_KG) / 7)
  // 筋トレによる消費分を上乗せせず、最低ラインは基礎代謝を割らないようにする
  const dailyCalories = Math.max(Math.round(bmr(profile)), Math.round(maintenance + calorieDelta))

  const proteinPerKg = goalType === 'fatloss' ? 2.0 : goalType === 'endurance' ? 1.4 : 1.8
  const proteinG = Math.round(Math.min(profile.weightKg, target) * proteinPerKg)

  return {
    deltaKg,
    direction,
    safeWeeklyKg,
    weeksAtSafePace,
    projectedDate: weeksAtSafePace > 0 ? addWeeks(new Date(), weeksAtSafePace) : null,
    dailyCalories,
    calorieDelta: dailyCalories - Math.round(maintenance),
    proteinG,
    deadlineFeasible,
    weeksToDeadline,
    milestones: buildMilestones(profile.weightKg, target, weeklyKg),
  }
}

function buildMilestones(current: number, target: number, weeklyKg: number): Milestone[] {
  if (Math.abs(target - current) < 0.5 || weeklyKg === 0) return []
  const steps = 4
  const out: Milestone[] = []
  for (let i = 1; i <= steps; i++) {
    const weight = round1(current + ((target - current) * i) / steps)
    const weeks = Math.ceil((weight - current) / weeklyKg)
    out.push({
      label: i === steps ? '目標達成' : `ステップ ${i}`,
      weightKg: weight,
      date: addWeeks(new Date(), weeks),
      weeksFromNow: weeks,
    })
  }
  return out
}

export function weeksBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime()
  return Math.round(ms / (1000 * 60 * 60 * 24 * 7))
}

export function addWeeks(from: Date, weeks: number): string {
  const d = new Date(from)
  d.setDate(d.getDate() + weeks * 7)
  return toDateKey(d)
}

export function toDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

export function round1(v: number): number {
  return Math.round(v * 10) / 10
}

export function round2(v: number): number {
  return Math.round(v * 100) / 100
}
