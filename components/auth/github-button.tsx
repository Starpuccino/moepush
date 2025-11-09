'use client';

import { Button } from '@/components/ui/button';
import { Github } from 'lucide-react';
import { signIn } from 'next-auth/react';

interface GitHubButtonProps {
  text?: string;
}

export function GitHubButton({
  text = '使用 GitHub 账号注册'
}: GitHubButtonProps) {
  return (
    <Button
      variant="outline"
      className="w-full"
      onClick={() => signIn('github', { callbackUrl: '/moe' })}
    >
      <Github className="mr-2 h-4 w-4" />
      {text}
    </Button>
  );
}
