export interface Annotation {
  id: string;
  trafficId: string;
  content: string;
  color: 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'gray';
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface AnnotationCreateInput {
  trafficId: string;
  content: string;
  color?: Annotation['color'];
  tags?: string[];
}

export interface AnnotationUpdateInput {
  content?: string;
  color?: Annotation['color'];
  tags?: string[];
}
