import { createContext } from 'react';

// optional catalog scope supplies source-name revision pins without changing authored locators.
export const SourceRevisionContext = createContext<Readonly<Record<string, string>>>({});
