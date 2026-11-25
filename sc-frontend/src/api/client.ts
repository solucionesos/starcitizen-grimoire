import axios, { type InternalAxiosRequestConfig } from 'axios';
import type {
  AbyssalMark,
  AuditLogsQueryParams,
  Blueprint,
  BrotherProfile,
  CalendarEvent,
  Chronicle,
  CouncilAuditLog,
  CouncilAuditLogsResponse,
  CouncilUsersResponse,
  CreateCrusadePayload,
  CreateMemberShipPayload,
  CreateObjectivePayload,
  CreatePollPayload,
  Crusade,
  CrusadeDetail,
  CrusadeSignupPayload,
  GrantAbyssalMarkPayload,
  HermandadDirectoryResponse,
  HermandadMemberResponse,
  MemberShip,
  Mission,
  Objective,
  Poll,
  PreregisterUserPayload,
  PublicBrother,
  PublicFleetSummary,
  Resource,
  SaveChroniclePayload,
  Ship,
  UpdateCouncilUserPayload,
  UpdateMemberShipPayload,
  UpdateObjectivePayload,
  UpdateProfilePayload,
  UpdateVerdictPayload,
  VehicleComponent,
  VehicleWeapon,
  Verdict,
} from '../types';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
});

function readStoredToken(): string | null {
  try {
    if (
      typeof globalThis !== 'undefined' &&
      typeof globalThis.localStorage !== 'undefined' &&
      typeof globalThis.localStorage.getItem === 'function'
    ) {
      return globalThis.localStorage.getItem('ancalagon_token');
    }
  } catch {
    return null;
  }
  return null;
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = readStoredToken();
  const headers = config.headers;
  const hasAuth = headers
    ? typeof headers.get === 'function'
      ? Boolean(headers.get('Authorization'))
      : Boolean(headers.Authorization)
    : false;
  if (token && !hasAuth && headers) {
    if (typeof headers.set === 'function') {
      headers.set('Authorization', `Bearer ${token}`);
    } else {
      headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function unwrapArray<T>(data: unknown, nestedKey?: string): T[] {
  if (Array.isArray(data)) {
    return data as T[];
  }
  if (nestedKey && isPlainObject(data) && Array.isArray(data[nestedKey])) {
    return data[nestedKey] as T[];
  }
  return [];
}

function unwrapMutationResult(
  data: unknown,
  defaultSuccess = false,
): { success: boolean; message?: string } {
  if (!isPlainObject(data)) {
    return { success: defaultSuccess };
  }
  return {
    success: typeof data.success === 'boolean' ? data.success : defaultSuccess,
    ...(typeof data.message === 'string' ? { message: data.message } : {}),
  };
}

const EMPTY_FLEET_SUMMARY: PublicFleetSummary = {
  total_operational: 0,
  by_model: [],
  by_class: [],
};

// ── Existing Catalog Exports (Backwards-Compatible) ──

export type BlueprintsPayload = Blueprint[] | { blueprints?: Blueprint[] };

export const getMissions = (): Promise<Mission[]> =>
  api
    .get<Mission[] | { missions?: Mission[] } | null>('/missions')
    .then((res) => unwrapArray<Mission>(res.data, 'missions'));

export const getBlueprints = (): Promise<BlueprintsPayload> =>
  api.get<BlueprintsPayload | null>('/blueprints').then((res) => {
    if (Array.isArray(res.data)) {
      return res.data;
    }
    if (isPlainObject(res.data)) {
      return {
        blueprints: Array.isArray(res.data.blueprints)
          ? (res.data.blueprints as Blueprint[])
          : [],
      };
    }
    return [];
  });

export const getResources = (): Promise<Resource[]> =>
  api
    .get<Resource[] | { resources?: Resource[] } | null>('/resources')
    .then((res) => unwrapArray<Resource>(res.data, 'resources'));

export const getChronicles = (): Promise<Chronicle[]> =>
  api
    .get<Chronicle[] | { chronicles?: Chronicle[] } | null>('/chronicles')
    .then((res) => unwrapArray<Chronicle>(res.data, 'chronicles'));

export const getShips = (): Promise<Ship[]> =>
  api
    .get<Ship[] | { ships?: Ship[] } | null>('/ships')
    .then((res) => unwrapArray<Ship>(res.data, 'ships'));

export const getWeapons = (): Promise<VehicleWeapon[]> =>
  api
    .get<VehicleWeapon[] | { weapons?: VehicleWeapon[] } | null>('/weapons')
    .then((res) => unwrapArray<VehicleWeapon>(res.data, 'weapons'));

// ── System & Components ──

export const getVersion = (): Promise<{ version: string | null }> =>
  api.get<{ version?: string | null } | null>('/version').then((res) => ({
    version:
      isPlainObject(res.data) && typeof res.data.version === 'string'
        ? res.data.version
        : null,
  }));

export const getComponents = (): Promise<VehicleComponent[]> =>
  api
    .get<VehicleComponent[] | { components?: VehicleComponent[] } | null>('/components')
    .then((res) => unwrapArray<VehicleComponent>(res.data, 'components'));

// ── Auth & Self Profile ──

export const getMe = (): Promise<BrotherProfile | null> =>
  api
    .get<BrotherProfile | { user?: BrotherProfile | null } | null>('/auth/me')
    .then((res) => {
      const data = res.data;
      if (!isPlainObject(data)) {
        return null;
      }
      if ('user' in data) {
        if (!isPlainObject(data.user)) {
          return null;
        }
        return data.user as unknown as BrotherProfile;
      }
      return data as unknown as BrotherProfile;
    });

export const updateMe = (
  payload: UpdateProfilePayload,
): Promise<{ success?: boolean; user?: BrotherProfile; message?: string }> =>
  api
    .patch<
      { success?: boolean; user?: BrotherProfile | null; message?: string } | BrotherProfile | null
    >('/auth/me', payload)
    .then((res) => {
      const data = res.data;
      if (!isPlainObject(data)) {
        return { success: false };
      }
      if ('user' in data) {
        return {
          success: typeof data.success === 'boolean' ? data.success : true,
          message: typeof data.message === 'string' ? data.message : undefined,
          user: isPlainObject(data.user) ? (data.user as unknown as BrotherProfile) : undefined,
        };
      }
      if ('id' in data) {
        return {
          success: true,
          user: data as unknown as BrotherProfile,
        };
      }
      return {
        success: typeof data.success === 'boolean' ? data.success : false,
        message: typeof data.message === 'string' ? data.message : undefined,
      };
    });

export const getRoster = (): Promise<BrotherProfile[]> =>
  api
    .get<BrotherProfile[] | { roster?: BrotherProfile[] } | null>('/auth/roster')
    .then((res) => unwrapArray<BrotherProfile>(res.data, 'roster'));

// ── Public OPSEC Directory (/api/hermandad) ──

export const getHermandad = (): Promise<HermandadDirectoryResponse> =>
  api.get<HermandadDirectoryResponse | null>('/hermandad').then((res) => {
    const data = res.data;
    if (!isPlainObject(data)) {
      return {
        members: [],
        fleet_summary: EMPTY_FLEET_SUMMARY,
        is_authenticated_brother: false,
      };
    }
    const fleetSummary = isPlainObject(data.fleet_summary) ? data.fleet_summary : null;
    return {
      members: Array.isArray(data.members) ? (data.members as PublicBrother[]) : [],
      fleet_summary: fleetSummary
        ? {
            total_operational:
              typeof fleetSummary.total_operational === 'number'
                ? fleetSummary.total_operational
                : 0,
            by_model: Array.isArray(fleetSummary.by_model)
              ? (fleetSummary.by_model as PublicFleetSummary['by_model'])
              : [],
            by_class: Array.isArray(fleetSummary.by_class)
              ? (fleetSummary.by_class as PublicFleetSummary['by_class'])
              : [],
          }
        : EMPTY_FLEET_SUMMARY,
      is_authenticated_brother: Boolean(data.is_authenticated_brother),
    };
  });

export const getHermanoByHandle = (handle: string): Promise<HermandadMemberResponse> =>
  api
    .get<HermandadMemberResponse | PublicBrother | null>(
      `/hermandad/${encodeURIComponent(handle)}`,
    )
    .then((res) => {
      const data = res.data;
      if (!isPlainObject(data)) {
        throw new Error('Respuesta inválida de /api/hermandad/:handle');
      }
      if ('member' in data) {
        if (!isPlainObject(data.member)) {
          throw new Error('Expediente del hermano ausente en /api/hermandad/:handle');
        }
        return {
          member: data.member as unknown as PublicBrother,
          is_authenticated_brother: Boolean(data.is_authenticated_brother),
        };
      }
      if ('id' in data) {
        return {
          member: data as unknown as PublicBrother,
          is_authenticated_brother: false,
        };
      }
      throw new Error('Expediente del hermano ausente en /api/hermandad/:handle');
    });

export const getHermandadMember = getHermanoByHandle;

// ── Personal Hangar (/api/profile/ships) ──

export const getMyShips = (): Promise<MemberShip[]> =>
  api
    .get<MemberShip[] | { ships?: MemberShip[] } | null>('/profile/ships')
    .then((res) => unwrapArray<MemberShip>(res.data, 'ships'));

export const createMyShip = (
  payload: CreateMemberShipPayload,
): Promise<{ success?: boolean; ship: MemberShip }> =>
  api
    .post<{ success?: boolean; ship?: MemberShip } | null>('/profile/ships', payload)
    .then((res) => {
      if (!isPlainObject(res.data) || !isPlainObject(res.data.ship)) {
        throw new Error('Respuesta inválida al registrar Arca Estelar');
      }
      return {
        success: typeof res.data.success === 'boolean' ? res.data.success : true,
        ship: res.data.ship as unknown as MemberShip,
      };
    });

export const updateMyShip = (
  id: string,
  payload: UpdateMemberShipPayload,
): Promise<{ success?: boolean; ship: MemberShip }> =>
  api
    .patch<{ success?: boolean; ship?: MemberShip } | null>(
      `/profile/ships/${encodeURIComponent(id)}`,
      payload,
    )
    .then((res) => {
      if (!isPlainObject(res.data) || !isPlainObject(res.data.ship)) {
        throw new Error('Respuesta inválida al actualizar Arca Estelar');
      }
      return {
        success: typeof res.data.success === 'boolean' ? res.data.success : true,
        ship: res.data.ship as unknown as MemberShip,
      };
    });

export const deleteMyShip = (id: string): Promise<{ success: boolean; message?: string }> =>
  api
    .delete<{ success?: boolean; message?: string } | null>(
      `/profile/ships/${encodeURIComponent(id)}`,
    )
    .then((res) => unwrapMutationResult(res.data));

// ── Objectives (/api/objectives) ──

export const getObjectives = (params?: {
  scope?: string;
  status?: string;
  category?: string;
  assigned_to?: string;
}): Promise<Objective[]> =>
  api
    .get<Objective[] | { objectives?: Objective[] } | null>('/objectives', { params })
    .then((res) => unwrapArray<Objective>(res.data, 'objectives'));

export const createObjective = (payload: CreateObjectivePayload): Promise<Objective> =>
  api
    .post<Objective | { objective?: Objective } | null>('/objectives', payload)
    .then((res) => {
      const data = res.data;
      if (!isPlainObject(data)) {
        throw new Error('Respuesta inválida al crear Designio Sagrado');
      }
      if ('objective' in data) {
        if (!isPlainObject(data.objective)) {
          throw new Error('Designio ausente en respuesta de /api/objectives');
        }
        return data.objective as unknown as Objective;
      }
      return data as unknown as Objective;
    });

export const updateObjective = (
  id: string,
  payload: UpdateObjectivePayload,
): Promise<Objective | { message?: string }> =>
  api
    .patch<Objective | { message?: string } | null>(
      `/objectives/${encodeURIComponent(id)}`,
      payload,
    )
    .then((res) => {
      if (!isPlainObject(res.data)) {
        throw new Error('Respuesta inválida al actualizar Designio Sagrado');
      }
      return res.data as unknown as Objective | { message?: string };
    });

export const verifyObjective = (id: string): Promise<{ success: boolean; message?: string }> =>
  api
    .post<{ success?: boolean; message?: string } | null>(
      `/objectives/${encodeURIComponent(id)}/verify`,
    )
    .then((res) => unwrapMutationResult(res.data));

export const deleteObjective = (id: string): Promise<{ success: boolean; message?: string }> =>
  api
    .delete<{ success?: boolean; message?: string } | null>(
      `/objectives/${encodeURIComponent(id)}`,
    )
    .then((res) => unwrapMutationResult(res.data));

// ── Crusades & Polls (/api/crusades, /api/polls) ──

export const getCrusades = (): Promise<Crusade[]> =>
  api
    .get<Crusade[] | { crusades?: Crusade[] } | null>('/crusades')
    .then((res) => unwrapArray<Crusade>(res.data, 'crusades'));

export const getCrusadeById = (id: string): Promise<CrusadeDetail> =>
  api.get<CrusadeDetail | null>(`/crusades/${encodeURIComponent(id)}`).then((res) => {
    if (!isPlainObject(res.data)) {
      throw new Error('Respuesta inválida de /api/crusades/:id');
    }
    return {
      ...(res.data as unknown as CrusadeDetail),
      ships_required: Array.isArray(res.data.ships_required)
        ? (res.data.ships_required as string[])
        : [],
      roster: Array.isArray(res.data.roster)
        ? (res.data.roster as CrusadeDetail['roster'])
        : [],
    };
  });

export const createCrusade = (
  payload: CreateCrusadePayload,
): Promise<{ id: string; title: string; success: boolean }> =>
  api
    .post<{ id?: string; title?: string; success?: boolean } | null>('/crusades', payload)
    .then((res) => {
      if (!isPlainObject(res.data) || typeof res.data.id !== 'string') {
        throw new Error('Respuesta inválida al proclamar Edicto de Cruzada');
      }
      return {
        id: res.data.id,
        title: typeof res.data.title === 'string' ? res.data.title : payload.title,
        success: typeof res.data.success === 'boolean' ? res.data.success : true,
      };
    });

export const signupCrusade = (
  crusadeId: string,
  payload: CrusadeSignupPayload,
): Promise<{ success: boolean; message: string }> =>
  api
    .post<{ success?: boolean; message?: string } | null>(
      `/crusades/${encodeURIComponent(crusadeId)}/signup`,
      payload,
    )
    .then((res) => {
      const result = unwrapMutationResult(res.data);
      return {
        success: result.success,
        message: result.message ?? '',
      };
    });

export const leaveCrusade = (crusadeId: string): Promise<{ success: boolean; message?: string }> =>
  api
    .delete<{ success?: boolean; message?: string } | null>(
      `/crusades/${encodeURIComponent(crusadeId)}/signup`,
    )
    .then((res) => unwrapMutationResult(res.data));

export const updateCrusade = (
  id: string,
  payload: Partial<
    Pick<
      Crusade,
      | 'title'
      | 'description'
      | 'briefing'
      | 'operation_date'
      | 'location'
      | 'status'
      | 'ships_required'
      | 'max_brothers'
    >
  >,
): Promise<{ success: boolean; crusade?: Crusade }> =>
  api
    .patch<{ success?: boolean; crusade?: Crusade } | null>(
      `/crusades/${encodeURIComponent(id)}`,
      payload,
    )
    .then((res) => {
      if (!isPlainObject(res.data)) {
        return { success: false };
      }
      return {
        success: typeof res.data.success === 'boolean' ? res.data.success : true,
        crusade: isPlainObject(res.data.crusade)
          ? (res.data.crusade as unknown as Crusade)
          : undefined,
      };
    });

export const deleteCrusade = (id: string): Promise<{ success: boolean; message?: string }> =>
  api
    .delete<{ success?: boolean; message?: string } | null>(
      `/crusades/${encodeURIComponent(id)}`,
    )
    .then((res) => unwrapMutationResult(res.data));

export const getCalendarEvents = (): Promise<CalendarEvent[]> =>
  api
    .get<CalendarEvent[] | { events?: CalendarEvent[] } | null>('/crusades/calendar/all')
    .then((res) => unwrapArray<CalendarEvent>(res.data, 'events'));

export const getPolls = (): Promise<Poll[]> =>
  api
    .get<Poll[] | { polls?: Poll[] } | null>('/polls')
    .then((res) => unwrapArray<Poll>(res.data, 'polls'));

export const getHomeVerdicts = (): Promise<Verdict[]> =>
  api
    .get<Verdict[] | { verdicts?: Verdict[] } | null>('/polls/verdicts/home')
    .then((res) => unwrapArray<Verdict>(res.data, 'verdicts'));

export const createPoll = (
  payload: CreatePollPayload,
): Promise<{ id: string; message?: string }> =>
  api.post<{ id?: string; message?: string } | null>('/polls', payload).then((res) => {
    if (!isPlainObject(res.data) || typeof res.data.id !== 'string') {
      throw new Error('Respuesta inválida al convocar deliberación');
    }
    return {
      id: res.data.id,
      ...(typeof res.data.message === 'string' ? { message: res.data.message } : {}),
    };
  });

export const votePoll = (
  id: string,
  optionId: string,
): Promise<{ success: boolean; message?: string }> =>
  api
    .post<{ success?: boolean; message?: string } | null>(
      `/polls/${encodeURIComponent(id)}/vote`,
      { option_id: optionId },
    )
    .then((res) => unwrapMutationResult(res.data));

export const closePoll = (
  id: string,
): Promise<{ success: boolean; message?: string; verdict?: Record<string, unknown> }> =>
  api
    .post<{ success?: boolean; message?: string; verdict?: Record<string, unknown> } | null>(
      `/polls/${encodeURIComponent(id)}/close`,
    )
    .then((res) => {
      if (!isPlainObject(res.data)) {
        return { success: false };
      }
      return {
        success: typeof res.data.success === 'boolean' ? res.data.success : false,
        ...(typeof res.data.message === 'string' ? { message: res.data.message } : {}),
        ...(isPlainObject(res.data.verdict) ? { verdict: res.data.verdict } : {}),
      };
    });

export const deletePoll = (id: string): Promise<{ success: boolean; message?: string }> =>
  api
    .delete<{ success?: boolean; message?: string } | null>(`/polls/${encodeURIComponent(id)}`)
    .then((res) => unwrapMutationResult(res.data));

// ── Council Governance (/api/council/*) ──

export const getCouncilUsers = (status?: string): Promise<CouncilUsersResponse> =>
  api
    .get<CouncilUsersResponse | BrotherProfile[] | null>('/council/users', {
      params: status ? { status } : undefined,
    })
    .then((res) => {
      if (Array.isArray(res.data)) {
        return {
          users: res.data,
          pending_count: res.data.filter((u) => u.status === 'pending').length,
        };
      }
      if (isPlainObject(res.data) && Array.isArray(res.data.users)) {
        const users = res.data.users as BrotherProfile[];
        return {
          users,
          pending_count:
            typeof res.data.pending_count === 'number'
              ? res.data.pending_count
              : users.filter((u) => u.status === 'pending').length,
        };
      }
      return { users: [], pending_count: 0 };
    });

export const preregisterCouncilUser = (
  payload: PreregisterUserPayload,
): Promise<{ success: boolean; user: BrotherProfile; message?: string }> =>
  api
    .post<{ success?: boolean; user?: BrotherProfile; message?: string } | null>(
      '/council/users/preregister',
      payload,
    )
    .then((res) => {
      if (!isPlainObject(res.data) || !isPlainObject(res.data.user)) {
        throw new Error('Respuesta inválida al pre-registrar Hermano');
      }
      return {
        success: typeof res.data.success === 'boolean' ? res.data.success : true,
        user: res.data.user as unknown as BrotherProfile,
        ...(typeof res.data.message === 'string' ? { message: res.data.message } : {}),
      };
    });

export const mergeCouncilUser = (
  targetId: string,
  sourceUserId: string,
): Promise<{ success: boolean; user?: BrotherProfile; message?: string }> =>
  api
    .post<{ success?: boolean; user?: BrotherProfile; message?: string } | null>(
      `/council/users/${encodeURIComponent(targetId)}/merge`,
      { source_user_id: sourceUserId },
    )
    .then((res) => {
      if (!isPlainObject(res.data)) {
        return { success: false };
      }
      return {
        success: typeof res.data.success === 'boolean' ? res.data.success : true,
        ...(typeof res.data.message === 'string' ? { message: res.data.message } : {}),
        ...(isPlainObject(res.data.user)
          ? { user: res.data.user as unknown as BrotherProfile }
          : {}),
      };
    });

export const unlinkCouncilUserDiscord = (
  id: string,
): Promise<{ success: boolean; user?: BrotherProfile; message?: string }> =>
  api
    .post<{ success?: boolean; user?: BrotherProfile; message?: string } | null>(
      `/council/users/${encodeURIComponent(id)}/unlink-discord`,
    )
    .then((res) => {
      if (!isPlainObject(res.data)) {
        return { success: false };
      }
      return {
        success: typeof res.data.success === 'boolean' ? res.data.success : true,
        ...(typeof res.data.message === 'string' ? { message: res.data.message } : {}),
        ...(isPlainObject(res.data.user)
          ? { user: res.data.user as unknown as BrotherProfile }
          : {}),
      };
    });

export const approveCouncilUser = (
  id: string,
): Promise<{ success: boolean; user?: BrotherProfile; message?: string }> =>
  api
    .post<{ success?: boolean; user?: BrotherProfile; message?: string } | null>(
      `/council/users/${encodeURIComponent(id)}/approve`,
    )
    .then((res) => {
      if (!isPlainObject(res.data)) {
        return { success: false };
      }
      return {
        success: typeof res.data.success === 'boolean' ? res.data.success : true,
        ...(typeof res.data.message === 'string' ? { message: res.data.message } : {}),
        ...(isPlainObject(res.data.user)
          ? { user: res.data.user as unknown as BrotherProfile }
          : {}),
      };
    });

export const rejectCouncilUser = (
  id: string,
): Promise<{ success: boolean; message?: string }> =>
  api
    .post<{ success?: boolean; message?: string } | null>(
      `/council/users/${encodeURIComponent(id)}/reject`,
    )
    .then((res) => unwrapMutationResult(res.data));

export const updateCouncilUser = (
  id: string,
  payload: UpdateCouncilUserPayload,
): Promise<{ success: boolean; user?: BrotherProfile; message?: string }> =>
  api
    .patch<{ success?: boolean; user?: BrotherProfile; message?: string } | null>(
      `/council/users/${encodeURIComponent(id)}`,
      payload,
    )
    .then((res) => {
      if (!isPlainObject(res.data)) {
        return { success: false };
      }
      return {
        success: typeof res.data.success === 'boolean' ? res.data.success : true,
        ...(typeof res.data.message === 'string' ? { message: res.data.message } : {}),
        ...(isPlainObject(res.data.user)
          ? { user: res.data.user as unknown as BrotherProfile }
          : {}),
      };
    });

export const grantAbyssalMark = (
  userId: string,
  payload: GrantAbyssalMarkPayload,
): Promise<{ success: boolean; mark: AbyssalMark }> =>
  api
    .post<{ success?: boolean; mark?: AbyssalMark } | null>(
      `/council/users/${encodeURIComponent(userId)}/marks`,
      payload,
    )
    .then((res) => {
      if (!isPlainObject(res.data) || !isPlainObject(res.data.mark)) {
        throw new Error('Respuesta inválida al otorgar Marca del Abismo');
      }
      return {
        success: typeof res.data.success === 'boolean' ? res.data.success : true,
        mark: res.data.mark as unknown as AbyssalMark,
      };
    });

export const revokeAbyssalMark = (
  markId: string,
): Promise<{ success: boolean; message?: string }> =>
  api
    .delete<{ success?: boolean; message?: string } | null>(
      `/council/marks/${encodeURIComponent(markId)}`,
    )
    .then((res) => unwrapMutationResult(res.data));

export const getCouncilVerdicts = (): Promise<Verdict[]> =>
  api
    .get<Verdict[] | { verdicts?: Verdict[] } | null>('/council/verdicts')
    .then((res) => unwrapArray<Verdict>(res.data, 'verdicts'));

export const updateCouncilVerdict = (
  id: string,
  payload: UpdateVerdictPayload,
): Promise<{ success: boolean; verdict?: Verdict }> =>
  api
    .patch<{ success?: boolean; verdict?: Verdict | null } | null>(
      `/council/verdicts/${encodeURIComponent(id)}`,
      payload,
    )
    .then((res) => {
      if (!isPlainObject(res.data)) {
        return { success: false };
      }
      return {
        success: typeof res.data.success === 'boolean' ? res.data.success : true,
        ...(isPlainObject(res.data.verdict)
          ? { verdict: res.data.verdict as unknown as Verdict }
          : {}),
      };
    });

export const deleteCouncilVerdict = (
  id: string,
): Promise<{ success: boolean; message?: string }> =>
  api
    .delete<{ success?: boolean; message?: string } | null>(
      `/council/verdicts/${encodeURIComponent(id)}`,
    )
    .then((res) => unwrapMutationResult(res.data));

export const getCouncilChronicles = (): Promise<Chronicle[]> =>
  api
    .get<Chronicle[] | { chronicles?: Chronicle[] } | null>('/council/chronicles')
    .then((res) => unwrapArray<Chronicle>(res.data, 'chronicles'));

export const createCouncilChronicle = (
  payload: SaveChroniclePayload,
): Promise<{ success: boolean; chronicle: Chronicle }> =>
  api
    .post<{ success?: boolean; chronicle?: Chronicle } | null>('/council/chronicles', payload)
    .then((res) => {
      if (!isPlainObject(res.data) || !isPlainObject(res.data.chronicle)) {
        throw new Error('Respuesta inválida al crear Crónica Sagrada');
      }
      return {
        success: typeof res.data.success === 'boolean' ? res.data.success : true,
        chronicle: res.data.chronicle as unknown as Chronicle,
      };
    });

export const updateCouncilChronicle = (
  id: number,
  payload: SaveChroniclePayload,
): Promise<{ success: boolean; chronicle: Chronicle }> =>
  api
    .put<{ success?: boolean; chronicle?: Chronicle } | null>(`/council/chronicles/${id}`, payload)
    .then((res) => {
      if (!isPlainObject(res.data) || !isPlainObject(res.data.chronicle)) {
        throw new Error('Respuesta inválida al actualizar Crónica Sagrada');
      }
      return {
        success: typeof res.data.success === 'boolean' ? res.data.success : true,
        chronicle: res.data.chronicle as unknown as Chronicle,
      };
    });

export const deleteCouncilChronicle = (
  id: number,
): Promise<{ success: boolean; message?: string }> =>
  api
    .delete<{ success?: boolean; message?: string } | null>(`/council/chronicles/${id}`)
    .then((res) => unwrapMutationResult(res.data));

export const getCouncilAuditLogs = (
  params?: AuditLogsQueryParams,
): Promise<CouncilAuditLogsResponse> =>
  api
    .get<CouncilAuditLogsResponse | CouncilAuditLog[] | null>('/council/audit-logs', { params })
    .then((res) => {
      const data = res.data;
      if (Array.isArray(data)) {
        return { logs: data, total: data.length };
      }
      if (isPlainObject(data) && Array.isArray(data.logs)) {
        return {
          logs: data.logs as CouncilAuditLog[],
          total: typeof data.total === 'number' ? data.total : data.logs.length,
        };
      }
      return { logs: [], total: 0 };
    });
