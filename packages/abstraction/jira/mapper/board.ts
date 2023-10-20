import { Board as ExternalApiBoard } from '../external/api';
import { BoardConfig } from '../external/webhook';

export type Board = Pick<ExternalApiBoard, 'id' | 'name' | 'self' | 'type'> &
  Partial<Pick<ExternalApiBoard, 'location'>> &
  Partial<Pick<BoardConfig, 'filter' | 'columnConfig' | 'ranking'>> & {
    organization: string;
    createdAt: string;
    isDeleted: boolean;
    deletedAt: string | null;
  };
