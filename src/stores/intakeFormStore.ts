import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  FormErrors,
  IntakeFieldId,
  IntakeFormData,
  ScreenId,
} from '../types/intake';
import { TOTAL_SCREENS } from '../types/intake';
import { validateScreen } from '../lib/intakeValidation';
import { saveIntake, resumeIntake } from '../lib/supabase/intake';

interface IntakeFormStore {
  formData: IntakeFormData;
  currentScreen: ScreenId;
  errors: FormErrors;
  auditId: string | null;
  isSaving: boolean;
  isSubmitting: boolean;
  lastSavedAt: string | null;
  saveError: string | null;

  setField: <K extends IntakeFieldId>(field: K, value: IntakeFormData[K]) => void;
  setMany: (patch: Partial<IntakeFormData>) => void;
  clearFieldError: (field: IntakeFieldId) => void;
  setErrors: (errors: FormErrors) => void;

  validateCurrentScreen: () => FormErrors;
  canAdvance: () => boolean;

  goToScreen: (screen: ScreenId, options?: { skipValidation?: boolean }) => boolean;
  nextScreen: () => boolean;
  prevScreen: () => void;

  saveProgress: () => Promise<void>;
  loadFromResumeToken: (token: string) => Promise<void>;

  setSubmitting: (isSubmitting: boolean) => void;
  resetForm: () => void;
}

const initialState = {
  formData: {} as IntakeFormData,
  currentScreen: 1 as ScreenId,
  errors: {} as FormErrors,
  auditId: null as string | null,
  isSaving: false,
  isSubmitting: false,
  lastSavedAt: null as string | null,
  saveError: null as string | null,
};

function clampScreen(n: number): ScreenId {
  return Math.max(1, Math.min(TOTAL_SCREENS, n)) as ScreenId;
}

export const useIntakeFormStore = create<IntakeFormStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setField: (field, value) =>
        set((s) => {
          const nextErrors = { ...s.errors };
          delete nextErrors[field];
          return {
            formData: { ...s.formData, [field]: value },
            errors: nextErrors,
          };
        }),

      setMany: (patch) =>
        set((s) => ({ formData: { ...s.formData, ...patch } })),

      clearFieldError: (field) =>
        set((s) => {
          if (!s.errors[field]) return s;
          const nextErrors = { ...s.errors };
          delete nextErrors[field];
          return { errors: nextErrors };
        }),

      setErrors: (errors) => set({ errors }),

      validateCurrentScreen: () => {
        const { currentScreen, formData } = get();
        const errors = validateScreen(currentScreen, formData);
        set({ errors });
        return errors;
      },

      canAdvance: () => {
        const { currentScreen, formData } = get();
        return Object.keys(validateScreen(currentScreen, formData)).length === 0;
      },

      goToScreen: (screen, options) => {
        const target = clampScreen(screen);
        const { currentScreen, formData } = get();

        if (!options?.skipValidation && target > currentScreen) {
          const errors = validateScreen(currentScreen, formData);
          if (Object.keys(errors).length > 0) {
            set({ errors });
            return false;
          }
        }

        set({ currentScreen: target, errors: {} });

        if (target !== currentScreen) {
          void get().saveProgress();
        }
        return true;
      },

      nextScreen: () => {
        const { currentScreen } = get();
        return get().goToScreen(clampScreen(currentScreen + 1));
      },

      prevScreen: () => {
        const { currentScreen } = get();
        set({
          currentScreen: clampScreen(currentScreen - 1),
          errors: {},
        });
      },

      saveProgress: async () => {
        const { auditId, formData, currentScreen } = get();
        if (!formData.email) return;

        set({ isSaving: true, saveError: null });
        try {
          const res = await saveIntake({
            auditId,
            formData,
            currentScreen,
            email: formData.email,
          });
          set({
            auditId: res.auditId,
            isSaving: false,
            lastSavedAt: new Date().toISOString(),
          });
        } catch (err) {
          set({
            isSaving: false,
            saveError:
              err instanceof Error
                ? err.message
                : 'Erreur de sauvegarde',
          });
        }
      },

      loadFromResumeToken: async (token) => {
        const res = await resumeIntake(token);
        set({
          auditId: res.auditId,
          formData: res.formData,
          currentScreen: clampScreen(res.currentScreen),
          errors: {},
        });
      },

      setSubmitting: (isSubmitting) => set({ isSubmitting }),

      resetForm: () => set({ ...initialState }),
    }),
    {
      name: 'pennyaudit-intake-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        formData: s.formData,
        currentScreen: s.currentScreen,
        auditId: s.auditId,
        lastSavedAt: s.lastSavedAt,
      }),
    },
  ),
);
