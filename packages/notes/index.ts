import { Note } from '@packages/abstraction/types/note';
export const notes: Record<string, Note> = {
  id1: {
    noteId: 'id1',
    userId: 'user1',
    createdAt: Date.now(),
    content: 'Hello World!',
  },
  id2: {
    noteId: 'id2',
    userId: 'user2',
    createdAt: Date.now() - 10000,
    content: 'Hello Old World! Old note.',
  },
};
