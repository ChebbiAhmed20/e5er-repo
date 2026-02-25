import { apiClient } from "./api-client";

export const patientsApi = {
  list: (options?: { limit?: number; search?: string }) =>
    apiClient.request("/api/patients", {
      params: {
        limit: options?.limit,
        search: options?.search,
      },
    }),
  get: (id: string) => apiClient.request(`/api/patients/${id}`),
  create: (data: Record<string, any>) =>
    apiClient.request("/api/patients", { method: "POST", data }),
  update: (id: string, data: Record<string, any>) =>
    apiClient.request(`/api/patients/${id}`, { method: "PUT", data }),
  delete: (id: string) =>
    apiClient.request(`/api/patients/${id}`, { method: "DELETE" }),
};

export const appointmentsApi = {
  list: (filters?: { status?: string; start_date?: string; end_date?: string; patientId?: string }) =>
    apiClient.request("/api/appointments", {
      params: {
        status: filters?.status,
        start_date: filters?.start_date,
        end_date: filters?.end_date,
        patientId: filters?.patientId,
      },
    }),
  get: (id: string) => apiClient.request(`/api/appointments/${id}`),
  create: (data: Record<string, any>) =>
    apiClient.request("/api/appointments", { method: "POST", data }),
  update: (id: string, data: Record<string, any>) =>
    apiClient.request(`/api/appointments/${id}`, { method: "PUT", data }),
  delete: (id: string) =>
    apiClient.request(`/api/appointments/${id}`, { method: "DELETE" }),
};

export const treatmentsApi = {
  list: (filters?: { patientId?: string; toothNumber?: number; paymentStatus?: string }) =>
    apiClient.request("/api/treatments", {
      params: {
        patientId: filters?.patientId,
        toothNumber: filters?.toothNumber,
        paymentStatus: filters?.paymentStatus,
      },
    }),
  listByPatient: (patientId: string) =>
    apiClient.request(`/api/treatments/patient/${patientId}`),
  get: (id: string) => apiClient.request(`/api/treatments/${id}`),
  create: (data: Record<string, any>) =>
    apiClient.request("/api/treatments", { method: "POST", data }),
  update: (id: string, data: Record<string, any>) =>
    apiClient.request(`/api/treatments/${id}`, { method: "PUT", data }),
  delete: (id: string) =>
    apiClient.request(`/api/treatments/${id}`, { method: "DELETE" }),
};

export const prescriptionsApi = {
  listByPatient: (patientId: string) =>
    apiClient.request(`/api/prescriptions/patient/${patientId}`),
  get: (id: string) => apiClient.request(`/api/prescriptions/${id}`),
  create: (data: Record<string, any>) =>
    apiClient.request("/api/prescriptions", { method: "POST", data }),
  update: (id: string, data: Record<string, any>) =>
    apiClient.request(`/api/prescriptions/${id}`, { method: "PUT", data }),
  delete: (id: string) =>
    apiClient.request(`/api/prescriptions/${id}`, { method: "DELETE" }),
};

export const analyticsApi = {
  get: (range: string = "30d") =>
    apiClient.request("/api/analytics", { params: { range } }),
};

export default {
  patients: patientsApi,
  appointments: appointmentsApi,
  treatments: treatmentsApi,
  prescriptions: prescriptionsApi,
  analytics: analyticsApi,
};
