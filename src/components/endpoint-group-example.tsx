'use client';

import { useState, useEffect } from 'react';
import { EndpointGroupWithEndpoints } from '@/types/endpoint-group';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { generateExampleBody } from '@/lib/generator';

interface EndpointGroupExampleProps {
  group: EndpointGroupWithEndpoints | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config?: {
    pushTimeout: number;
    callbackTimeout: number;
  };
}

export function EndpointGroupExample({
  group,
  open,
  onOpenChange,
  config
}: EndpointGroupExampleProps) {
  const pushTimeout = config?.pushTimeout;
  const callbackTimeout = config?.callbackTimeout;
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  if (!group) return null;

  // 使用所有接口中的所有规则创建一个示例
  const allRules = group.endpoints.flatMap((e) => (e.rule ? [e.rule] : []));
  const exampleBody = generateExampleBody(
    allRules.length > 0 ? allRules.join('\n') : '{}'
  );
  const exampleJson = JSON.stringify(exampleBody, null, 6);

  const curlExample = `curl -X POST "${origin}/api/push-group/${group.id}" \\
  -H "Content-Type: application/json" \\
  -H "X-Timeout: ${pushTimeout}" \\
  -H "X-Trace-Id: trace-group-001" \\
  -d '${exampleJson}'`;

  const curlCallbackExample = `curl -X POST "${origin}/api/push-group/${group.id}" \\
  -H "Content-Type: application/json" \\
  -H "X-Timeout: ${pushTimeout}" \\
  -H "X-Callback-Url: https://example.com/webhook" \\
  -H "X-Callback-Timeout: ${callbackTimeout}" \\
  -d '${exampleJson}'`;

  const fetchExample = `await fetch("${origin}/api/push-group/${group.id}", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Timeout": "${pushTimeout}",
      "X-Trace-Id": "trace-group-001",
    },
    body: JSON.stringify(${exampleJson})
})`;

  const fetchCallbackExample = `await fetch("${origin}/api/push-group/${group.id}", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Timeout": "${pushTimeout}",
      "X-Callback-Url": "https://example.com/webhook",
      "X-Callback-Timeout": "${callbackTimeout}",
    },
    body: JSON.stringify(${exampleJson})
})`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>接口组示例</DialogTitle>
          <DialogDescription>查看接口组调用示例和包含的接口</DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <div>
            <h3 className="mb-2 text-sm font-medium">
              包含的接口 ({group.endpoints.length})
            </h3>
            <div className="max-h-[150px] overflow-y-auto p-2 border rounded-md">
              <ul className="space-y-1">
                {group.endpoints.map((endpoint) => (
                  <li
                    key={endpoint.id}
                    className="text-sm text-muted-foreground"
                  >
                    {endpoint.name}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <Tabs defaultValue="curl">
            <TabsList>
              <TabsTrigger value="curl">cURL (同步)</TabsTrigger>
              <TabsTrigger value="curl-callback">cURL (异步回调)</TabsTrigger>
              <TabsTrigger value="fetch">Fetch (同步)</TabsTrigger>
              <TabsTrigger value="fetch-callback">Fetch (异步回调)</TabsTrigger>
            </TabsList>
            <TabsContent value="curl" className="mt-4">
              <div className="rounded-lg bg-muted p-4">
                <pre className="text-sm whitespace-pre-wrap break-all font-mono">
                  {curlExample}
                </pre>
              </div>
              <div className="mt-3 text-xs text-muted-foreground space-y-1">
                <p>• <strong>X-Timeout</strong>: 推送超时时间（毫秒{pushTimeout ? `，当前默认：${pushTimeout}` : ''}）</p>
                <p>• <strong>X-Trace-Id</strong>: 自定义追踪 ID（可选，服务端会自动生成）</p>
              </div>
            </TabsContent>
            <TabsContent value="curl-callback" className="mt-4">
              <div className="rounded-lg bg-muted p-4">
                <pre className="text-sm whitespace-pre-wrap break-all font-mono">
                  {curlCallbackExample}
                </pre>
              </div>
              <div className="mt-3 text-xs text-muted-foreground space-y-1">
                <p>• <strong>X-Timeout</strong>: 推送超时时间（毫秒{pushTimeout ? `，当前默认：${pushTimeout}` : ''}）</p>
                <p>• <strong>X-Callback-Url</strong>: 异步回调地址（存在此 Header 时启用异步模式）</p>
                <p>• <strong>X-Callback-Timeout</strong>: 回调超时时间（毫秒{callbackTimeout ? `，当前默认：${callbackTimeout}` : ''}）</p>
              </div>
            </TabsContent>
            <TabsContent value="fetch" className="mt-4">
              <div className="rounded-lg bg-muted p-4">
                <pre className="text-sm whitespace-pre-wrap break-all font-mono">
                  {fetchExample}
                </pre>
              </div>
              <div className="mt-3 text-xs text-muted-foreground space-y-1">
                <p>• <strong>X-Timeout</strong>: 推送超时时间（毫秒{pushTimeout ? `，当前默认：${pushTimeout}` : ''}）</p>
                <p>• <strong>X-Trace-Id</strong>: 自定义追踪 ID（可选，服务端会自动生成）</p>
              </div>
            </TabsContent>
            <TabsContent value="fetch-callback" className="mt-4">
              <div className="rounded-lg bg-muted p-4">
                <pre className="text-sm whitespace-pre-wrap break-all font-mono">
                  {fetchCallbackExample}
                </pre>
              </div>
              <div className="mt-3 text-xs text-muted-foreground space-y-1">
                <p>• <strong>X-Timeout</strong>: 推送超时时间（毫秒{pushTimeout ? `，当前默认：${pushTimeout}` : ''}）</p>
                <p>• <strong>X-Callback-Url</strong>: 异步回调地址（存在此 Header 时启用异步模式）</p>
                <p>• <strong>X-Callback-Timeout</strong>: 回调超时时间（毫秒{callbackTimeout ? `，当前默认：${callbackTimeout}` : ''}）</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
