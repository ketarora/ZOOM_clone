"use client";

/**
 * React Query hooks for every API resource.
 *
 * Each hook wraps the corresponding function from `api.ts` with sensible
 * defaults — 30-second stale time for lists, instant refetch on window focus
 * for the dashboard summary.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import * as api from "./api";

// ── Current user ───────────────────────────────────────────────────────────

export function useMe() {
  return useQuery({
    queryKey: api.queryKeys.me,
    queryFn: api.getMe,
    staleTime: 300_000,
    retry: 1,
  });
}

// ── Dashboard ──────────────────────────────────────────────────────────────

export function useDashboardSummary(
  options?: Partial<UseQueryOptions<api.DashboardSummary>>
) {
  return useQuery({
    queryKey: api.queryKeys.dashboardSummary,
    queryFn: api.getDashboardSummary,
    staleTime: 30_000,
    ...options,
  });
}

// ── Meetings ───────────────────────────────────────────────────────────────

export function useMeetings(
  filter: api.MeetingFilter = "all",
  page = 1,
  pageSize = 20
) {
  return useQuery({
    queryKey: api.queryKeys.meetings(filter),
    queryFn: () => api.listMeetings(filter, page, pageSize),
    staleTime: 30_000,
  });
}

export function useMeeting(id: string, enabled = true) {
  return useQuery({
    queryKey: api.queryKeys.meeting(id),
    queryFn: () => api.getMeeting(id),
    enabled: enabled && !!id,
    staleTime: 10_000,
  });
}

export function useMeetingParticipants(id: string, enabled = true) {
  return useQuery({
    queryKey: api.queryKeys.participants(id),
    queryFn: () => api.getMeetingParticipants(id),
    enabled: enabled && !!id,
    refetchInterval: 5_000,
  });
}

// ── Mutations ──────────────────────────────────────────────────────────────

export function useCreateMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createMeeting,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meetings"] });
      qc.invalidateQueries({ queryKey: api.queryKeys.dashboardSummary });
    },
  });
}

export function useUpdateMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: api.MeetingUpdate }) =>
      api.updateMeeting(id, data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: api.queryKeys.meeting(id) });
      qc.invalidateQueries({ queryKey: ["meetings"] });
    },
  });
}

export function useDeleteMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteMeeting,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meetings"] });
      qc.invalidateQueries({ queryKey: api.queryKeys.dashboardSummary });
    },
  });
}

export function useJoinMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, displayName }: { id: string; displayName: string }) =>
      api.joinMeeting(id, displayName),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: api.queryKeys.participants(id) });
      qc.invalidateQueries({ queryKey: api.queryKeys.meeting(id) });
      qc.invalidateQueries({ queryKey: api.queryKeys.dashboardSummary });
    },
  });
}

export function useLeaveMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      displayName,
      participantId,
    }: {
      id: string;
      displayName?: string;
      participantId?: number;
    }) => api.leaveMeeting(id, { displayName, participantId }),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: api.queryKeys.participants(id) });
      qc.invalidateQueries({ queryKey: api.queryKeys.meeting(id) });
      qc.invalidateQueries({ queryKey: api.queryKeys.dashboardSummary });
    },
  });
}

export function useMuteAll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.muteAll(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: api.queryKeys.participants(id) });
      qc.invalidateQueries({ queryKey: api.queryKeys.meeting(id) });
    },
  });
}

export function useRemoveParticipant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, participantId }: { id: string; participantId: number }) =>
      api.removeParticipant(id, participantId),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: api.queryKeys.participants(id) });
      qc.invalidateQueries({ queryKey: api.queryKeys.meeting(id) });
    },
  });
}

export function useAdmitParticipant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, participantId }: { id: string; participantId: number }) =>
      api.admitParticipant(id, participantId),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: api.queryKeys.participants(id) });
    },
  });
}

export function useEndMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.endMeeting,
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: api.queryKeys.meeting(id) });
      qc.invalidateQueries({ queryKey: ["meetings"] });
      qc.invalidateQueries({ queryKey: api.queryKeys.dashboardSummary });
    },
  });
}
