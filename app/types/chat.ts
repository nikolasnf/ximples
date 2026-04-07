import { Message } from './message';
import { Task } from './task';
import { Milestone } from './milestone';
import { Asset } from './asset';

export interface Chat {
  id: number;
  user_id: number;
  tenant_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages?: Message[];
  tasks?: Task[];
  milestones?: Milestone[];
  assets?: Asset[];
}
