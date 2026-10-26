export type UserRole = 
  | 'owner' 
  | 'admin' 
  | 'designer' 
  | 'operator_printing' 
  | 'operator_press' 
  | 'operator_cutting' 
  | 'operator_sewing';

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  roleLabel: string;
  avatarInitial: string;
}

export const WORKSHOP_PROFILES: UserProfile[] = [
  {
    id: 'user-owner',
    name: 'Reyhan (Owner)',
    role: 'owner',
    roleLabel: 'Owner & Direktur',
    avatarInitial: 'OW',
  },
  {
    id: 'user-admin',
    name: 'Admin Workshop',
    role: 'admin',
    roleLabel: 'Administrator Produksi',
    avatarInitial: 'AD',
  },
  {
    id: 'user-designer',
    name: 'Desainer Grafis (RH)',
    role: 'designer',
    roleLabel: 'Desainer Layout & Mockup',
    avatarInitial: 'DS',
  },
  {
    id: 'user-printing',
    name: 'Operator Sublim (Epson)',
    role: 'operator_printing',
    roleLabel: 'Operator Printing Sublim',
    avatarInitial: 'PR',
  },
  {
    id: 'user-cutting',
    name: 'Operator Cutting Pola',
    role: 'operator_cutting',
    roleLabel: 'Operator Cutting Kain',
    avatarInitial: 'CT',
  },
  {
    id: 'user-sewing',
    name: 'Kepala Jahit & Finishing',
    role: 'operator_sewing',
    roleLabel: 'Operator Jahit & Obras',
    avatarInitial: 'JH',
  },
];

const STORAGE_KEY = 'myprintin_active_user_profile';

export const authRoleService = {
  getCurrentProfile(): UserProfile {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.id) return parsed;
      }
    } catch {
      // fallback
    }
    return WORKSHOP_PROFILES[1]; // default: Admin Workshop
  },

  setCurrentProfile(profile: UserProfile): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  },

  getAllProfiles(): UserProfile[] {
    return WORKSHOP_PROFILES;
  },
};
