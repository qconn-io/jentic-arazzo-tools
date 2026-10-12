import { createContext } from 'react';

// The standalone shell supplies a concrete layout internally. This private
// signal preserves whether that layout came from an explicit reader choice.
export const ReadingIntentContext = createContext<boolean | null>(null);
