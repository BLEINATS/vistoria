export interface Property {
  id: string;
  name: string;
  address: string;
  type: 'apartment' | 'house' | 'commercial_room' | 'office' | 'store' | 'warehouse' | 'land';
  description: string;
  facadePhoto?: string;
  createdAt: Date;
  inspections: InspectionSummary[];
  user_id: string;
  responsibleName?: string;
}

export interface InspectionSummary {
  id: string;
  status: 'pending' | 'in-progress' | 'completed';
  inspection_type: 'entry' | 'exit';
  photoCount?: number;
  general_observations?: string | null;
  created_at: string;
}

export interface PropertyPhoto {
  id: string;
  url: string;
  room: string;
  description: string;
  uploadedAt: Date;
}

export interface InspectionReport {
  id: string;
  propertyId: string;
  inspectionDate: Date;
  status: 'pending' | 'in-progress' | 'completed';
  findings: InspectionFinding[];
  summary: string;
  photos: InspectionPhoto[];
}

export interface InspectionFinding {
  id:string;
  room: string;
  category: 'structural' | 'electrical' | 'plumbing' | 'cosmetic' | 'safety' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendation: string;
  photoId?: string;
  aiGenerated: boolean;
  userModified: boolean;
}

export interface InspectionPhoto {
  id: string;
  url: string;
  room: string;
  analysisResult: AIAnalysisResult;
  uploadedAt: Date;
}

export interface AIAnalysisResult {
  environmentType: string;
  objectsDetected: DetectedObject[];
  issues: DetectedIssue[];
  finishes: Finish[];
  safety: Safety;
  roomCondition: 'excellent' | 'good' | 'fair' | 'poor';
  confidence: number;
  maintenanceRecommendations: string[];
  description: string;
}

export interface DetectedObject {
  id: string;
  item: string;
  color: string;
  material: string;
  condition: 'new' | 'good' | 'worn' | 'damaged' | 'not_found';
  confidence: number;
  isManual?: boolean;
  photoUrl?: string;
  markerCoordinates?: { x: number; y: number }; // Add marker coordinates
}

export interface DetectedIssue {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location: string;
  confidence: number;
  isManual?: boolean;
}

export interface Finish {
  id: string;
  element: 'piso' | 'parede' | 'teto' | 'esquadria' | 'bancada' | 'etc';
  material: string;
  color: string;
  condition: 'new' | 'good' | 'worn' | 'damaged' | 'not_found';
  isManual?: boolean;
}

export interface Safety {
  locks: string;
  electrical: string;
  hazards: string[];
}
