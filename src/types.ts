export interface Lesson {
  id: string;
  title: string;
  completed?: boolean;
}

export interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

export interface Curriculum {
  title: string;
  description: string;
  modules: Module[];
}

export interface PrinciplesData {
  principles: string[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
