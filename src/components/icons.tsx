import { Loader2, Github } from 'lucide-react';

export const Icons = {
  spinner: Loader2,
  gitHub: Github
};

export type Icon = keyof typeof Icons;
