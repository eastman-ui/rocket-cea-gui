import axios from 'axios';
import type {
  CEARunRequest,
  CEAResult,
  SpeciesSearchResult,
  CADGenerateRequest,
  CADGenerateResult,
  RocketPyExportRequest,
  RocketPyExportResult,
} from '../types/api';

const api = axios.create({ baseURL: '/api' });

export const cea = {
  run: (data: CEARunRequest) => api.post<CEAResult>('/cea/run', data).then(r => r.data),
  getResult: (id: string) => api.get<CEAResult>(`/cea/result/${id}`).then(r => r.data),
  searchSpecies: (q: string) => api.get<SpeciesSearchResult[]>('/cea/species', { params: { q } }).then(r => r.data),
};

export const cad = {
  generate: (data: CADGenerateRequest) => api.post<CADGenerateResult>('/cad/generate', data).then(r => r.data),
};

export const exp = {
  rocketpy: (data: RocketPyExportRequest) => api.post<RocketPyExportResult>('/export/rocketpy', data).then(r => r.data),
};