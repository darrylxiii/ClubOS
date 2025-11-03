export interface CompensationState {
  employmentType: 'fulltime' | 'freelance' | 'both';
  currentSalaryRange: [number, number];
  desiredSalaryRange: [number, number];
  freelanceHourlyRate: [number, number];
  fulltimeHoursPerWeek: [number, number];
  freelanceHoursPerWeek: [number, number];
  noticePeriod: string;
  contractEndDate: Date | null;
  hasIndefiniteContract: boolean;
}

export type CompensationAction =
  | { type: 'SET_EMPLOYMENT_TYPE'; payload: 'fulltime' | 'freelance' | 'both' }
  | { type: 'SET_CURRENT_SALARY_RANGE'; payload: [number, number] }
  | { type: 'SET_DESIRED_SALARY_RANGE'; payload: [number, number] }
  | { type: 'SET_FREELANCE_HOURLY_RATE'; payload: [number, number] }
  | { type: 'SET_FULLTIME_HOURS_PER_WEEK'; payload: [number, number] }
  | { type: 'SET_FREELANCE_HOURS_PER_WEEK'; payload: [number, number] }
  | { type: 'SET_NOTICE_PERIOD'; payload: string }
  | { type: 'SET_CONTRACT_END_DATE'; payload: Date | null }
  | { type: 'SET_HAS_INDEFINITE_CONTRACT'; payload: boolean }
  | { type: 'LOAD_COMPENSATION'; payload: Partial<CompensationState> }
  | { type: 'RESET' };

export const initialCompensationState: CompensationState = {
  employmentType: 'fulltime',
  currentSalaryRange: [150000, 180000],
  desiredSalaryRange: [200000, 250000],
  freelanceHourlyRate: [100, 200],
  fulltimeHoursPerWeek: [35, 45],
  freelanceHoursPerWeek: [15, 25],
  noticePeriod: "2_weeks",
  contractEndDate: null,
  hasIndefiniteContract: false,
};

export function compensationReducer(state: CompensationState, action: CompensationAction): CompensationState {
  switch (action.type) {
    case 'SET_EMPLOYMENT_TYPE':
      return { ...state, employmentType: action.payload };
    case 'SET_CURRENT_SALARY_RANGE':
      return { ...state, currentSalaryRange: action.payload };
    case 'SET_DESIRED_SALARY_RANGE':
      return { ...state, desiredSalaryRange: action.payload };
    case 'SET_FREELANCE_HOURLY_RATE':
      return { ...state, freelanceHourlyRate: action.payload };
    case 'SET_FULLTIME_HOURS_PER_WEEK':
      return { ...state, fulltimeHoursPerWeek: action.payload };
    case 'SET_FREELANCE_HOURS_PER_WEEK':
      return { ...state, freelanceHoursPerWeek: action.payload };
    case 'SET_NOTICE_PERIOD':
      return { ...state, noticePeriod: action.payload };
    case 'SET_CONTRACT_END_DATE':
      return { ...state, contractEndDate: action.payload };
    case 'SET_HAS_INDEFINITE_CONTRACT':
      return { ...state, hasIndefiniteContract: action.payload };
    case 'LOAD_COMPENSATION':
      return { ...state, ...action.payload };
    case 'RESET':
      return initialCompensationState;
    default:
      return state;
  }
}
