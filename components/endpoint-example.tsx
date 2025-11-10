'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Endpoint } from '@/lib/db/schema/endpoints';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { generateExampleBody } from '@/lib/generator';

interface EndpointExampleProps {
  endpoint: Endpoint | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EndpointExample({
  endpoint,
  open,
  onOpenChange
}: EndpointExampleProps) {
  if (!endpoint) return null;

  const exampleBody = generateExampleBody(endpoint.rule);
  const exampleJson = JSON.stringify(exampleBody, null, 6);

  const curlExample = `curl -X POST "${window.location.origin}/api/push/${endpoint.id}" \\
  -H "Content-Type: application/json" \\
  -H "X-Timeout: 10000" \\
  -H "X-Trace-Id: trace-001" \\
  -d '${exampleJson}'`;
  
  // 带回调的 cURL 示例
  const curlCallbackExample = `curl -X POST "${window.location.origin}/api/push/${endpoint.id}" \\
  -H "Content-Type: application/json" \\
  -H "X-Timeout: 10000" \\
  -H "X-Callback-Url: https://example.com/webhook" \\
  -H "X-Callback-Timeout: 5000" \\
  -d '${exampleJson}'`;

  const fetchExample = `await fetch("${window.location.origin}/api/push/${endpoint.id}", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Timeout": "10000",
      "X-Trace-Id": "trace-001",
    },
    body: JSON.stringify(${exampleJson})
})`;
  
  // 带回调的 Fetch 示例
  const fetchCallbackExample = `await fetch("${window.location.origin}/api/push/${endpoint.id}", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Timeout": "10000",
      "X-Callback-Url": "https://example.com/webhook",
      "X-Callback-Timeout": "5000",
    },
    body: JSON.stringify(${exampleJson})
})`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>接口示例</DialogTitle>
          <DialogDescription>查看接口调用示例和依赖的变量</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="curl" className="mt-4">
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
              <p>• <strong>X-Timeout</strong>: 推送超时时间（毫秒）</p>
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
              <p>• <strong>X-Timeout</strong>: 推送超时时间（毫秒）</p>
              <p>• <strong>X-Callback-Url</strong>: 异步回调地址（存在此 Header 时启用异步模式）</p>
              <p>• <strong>X-Callback-Timeout</strong>: 回调超时时间（毫秒，默认 5000）</p>
            </div>
          </TabsContent>
          <TabsContent value="fetch" className="mt-4">
            <div className="rounded-lg bg-muted p-4">
              <pre className="text-sm whitespace-pre-wrap break-all font-mono">
                {fetchExample}
              </pre>
            </div>
            <div className="mt-3 text-xs text-muted-foreground space-y-1">
              <p>• <strong>X-Timeout</strong>: 推送超时时间（毫秒）</p>
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
              <p>• <strong>X-Timeout</strong>: 推送超时时间（毫秒）</p>
              <p>• <strong>X-Callback-Url</strong>: 异步回调地址（存在此 Header 时启用异步模式）</p>
              <p>• <strong>X-Callback-Timeout</strong>: 回调超时时间（毫秒，默认 5000）</p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
