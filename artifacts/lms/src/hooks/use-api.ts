import { useAuthStore } from '@/store/auth-store';
import * as api from '@workspace/api-client-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Helper hook to inject Authorization headers for protected endpoints
export function useRequestOptions() {
  const token = useAuthStore((state) => state.accessToken);
  return {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  };
}

export function useLmsHealth() {
  return api.useHealthCheck();
}

export function useLmsRegister() {
  return api.useRegister();
}

export function useLmsLogin() {
  return api.useLogin();
}

export function useLmsLogout() {
  const request = useRequestOptions();
  return api.useLogout({ request });
}

export function useLmsSubjects(params?: api.ListSubjectsParams) {
  return api.useListSubjects(params);
}

export function useLmsSubject(subjectId: number) {
  const request = useRequestOptions();
  return api.useGetSubject(subjectId, { request });
}

export function useLmsSubjectTree(subjectId: number) {
  const request = useRequestOptions();
  return api.useGetSubjectTree(subjectId, { request });
}

export function useLmsEnroll() {
  const request = useRequestOptions();
  const queryClient = useQueryClient();
  
  return api.useEnrollSubject({
    request,
    mutation: {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: api.getGetSubjectQueryKey(variables.subjectId) });
        queryClient.invalidateQueries({ queryKey: api.getGetEnrollmentQueryKey(variables.subjectId) });
      }
    }
  });
}

export function useLmsEnrollment(subjectId: number) {
  const request = useRequestOptions();
  return api.useGetEnrollment(subjectId, { request });
}

export function useLmsVideo(videoId: number) {
  const request = useRequestOptions();
  return api.useGetVideo(videoId, { request });
}

export function useLmsVideoProgress(videoId: number) {
  const request = useRequestOptions();
  return api.useGetVideoProgress(videoId, { request });
}

export function useLmsUpdateProgress() {
  const request = useRequestOptions();
  const queryClient = useQueryClient();
  
  return api.useUpdateVideoProgress({
    request,
    mutation: {
      onSuccess: (data, variables) => {
        // Optimistically update or invalidate progress queries
        queryClient.invalidateQueries({ queryKey: api.getGetVideoProgressQueryKey(variables.videoId) });
      }
    }
  });
}

export function useLmsSubjectProgress(subjectId: number) {
  const request = useRequestOptions();
  return api.useGetSubjectProgress(subjectId, { request });
}

export interface EnrolledSubject {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  totalVideos: number;
  totalSections: number;
  completedVideos: number;
  percentComplete: number;
  lastVideoId: number | null;
  enrolledAt: string;
}

// ---- Reviews ----
export function useLmsSubjectReviews(subjectId: number) {
  return useQuery<{
    averageRating: number | null;
    totalReviews: number;
    reviews: Array<{ id: number; rating: number; reviewText: string | null; createdAt: string; userName: string; userId: number }>;
  }>({
    queryKey: ['reviews', subjectId],
    queryFn: async () => {
      const res = await fetch(`/api/reviews/subjects/${subjectId}`);
      if (!res.ok) throw new Error('Failed to fetch reviews');
      return res.json();
    },
    enabled: subjectId > 0,
  });
}

export function useLmsMyReview(subjectId: number) {
  const token = useAuthStore((state) => state.accessToken);
  return useQuery<{ review: { id: number; rating: number; reviewText: string | null } | null }>({
    queryKey: ['my-review', subjectId, token],
    queryFn: async () => {
      const res = await fetch(`/api/reviews/mine/${subjectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch my review');
      return res.json();
    },
    enabled: !!token && subjectId > 0,
  });
}

export function useLmsSubmitReview(subjectId: number) {
  const token = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { rating: number; review_text?: string }) => {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subject_id: subjectId, ...data }),
      });
      if (!res.ok) throw new Error('Failed to submit review');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', subjectId] });
      queryClient.invalidateQueries({ queryKey: ['my-review', subjectId] });
    },
  });
}

// ---- Certificates ----
export function useLmsCertificate(subjectId: number) {
  const token = useAuthStore((state) => state.accessToken);
  return useQuery<{ certificate: { id: number; certificateUrl: string; issuedAt: string } | null }>({
    queryKey: ['certificate', subjectId, token],
    queryFn: async () => {
      const res = await fetch(`/api/certificates/${subjectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch certificate');
      return res.json();
    },
    enabled: !!token && subjectId > 0,
  });
}

export function useLmsAllCertificates() {
  const token = useAuthStore((state) => state.accessToken);
  return useQuery<{
    certificates: Array<{ id: number; subjectId: number; subjectTitle: string; subjectSlug: string; certificateUrl: string; issuedAt: string }>;
  }>({
    queryKey: ['all-certificates', token],
    queryFn: async () => {
      const res = await fetch('/api/certificates/user/all', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch certificates');
      return res.json();
    },
    enabled: !!token,
  });
}

export function useLmsGenerateCertificate(subjectId: number) {
  const token = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/certificates/generate/${subjectId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to generate certificate');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificate', subjectId] });
      queryClient.invalidateQueries({ queryKey: ['all-certificates'] });
      queryClient.invalidateQueries({ queryKey: ['enrolled-subjects'] });
    },
  });
}

// ---- Discussion ----
export function useLmsVideoQuestions(videoId: number) {
  const token = useAuthStore((state) => state.accessToken);
  return useQuery<{
    questions: Array<{
      id: number; userId: number; userName: string; questionText: string; createdAt: string;
      answers: Array<{ id: number; userId: number; userName: string; answerText: string; createdAt: string }>;
    }>;
  }>({
    queryKey: ['questions', videoId, token],
    queryFn: async () => {
      const res = await fetch(`/api/questions/videos/${videoId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch questions');
      return res.json();
    },
    enabled: !!token && videoId > 0,
  });
}

export function useLmsAskQuestion(videoId: number) {
  const token = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (question_text: string) => {
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ video_id: videoId, question_text }),
      });
      if (!res.ok) throw new Error('Failed to post question');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['questions', videoId] }),
  });
}

export function useLmsPostAnswer(videoId: number) {
  const token = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ question_id, answer_text }: { question_id: number; answer_text: string }) => {
      const res = await fetch('/api/questions/answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ question_id, answer_text }),
      });
      if (!res.ok) throw new Error('Failed to post answer');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['questions', videoId] }),
  });
}

export function useLmsEnrolledSubjects() {
  const token = useAuthStore((state) => state.accessToken);
  return useQuery<{ subjects: EnrolledSubject[] }>({
    queryKey: ['enrolled-subjects', token],
    queryFn: async () => {
      const res = await fetch('/api/subjects/enrolled', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch enrolled subjects');
      return res.json();
    },
    enabled: !!token,
  });
}
