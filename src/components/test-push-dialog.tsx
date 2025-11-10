'use client';

import { useState, useEffect } from 'react';
import { Loader2, Copy, Check } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TestPushDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string | React.ReactNode;
  initialContent: string;
  isTesting: boolean;
  onTest: (testData: any) => Promise<any>;
}

export function TestPushDialog({
  open,
  onOpenChange,
  title,
  description,
  initialContent,
  isTesting,
  onTest
}: TestPushDialogProps) {
  const [testContent, setTestContent] = useState(initialContent);
  const [testResponse, setTestResponse] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [internalOpen, setInternalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('request');
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // 当对话框从外部打开时，更新内部状态
  useEffect(() => {
    if (open && !internalOpen) {
      setInternalOpen(true);
      setTestContent(initialContent);
      setTestResponse(null);
      setCopied(false);
      setActiveTab('request');
      setError(null);
    }
  }, [open]);

  // 处理内部关闭
  const handleClose = (shouldClose: boolean) => {
    setInternalOpen(shouldClose);
    onOpenChange(shouldClose);
  };

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(testContent);
      setTestContent(JSON.stringify(parsed, null, 4));
      toast({
        description: 'JSON 格式化成功'
      });
    } catch (error) {
      console.error('Error formatting JSON:', error);
      toast({
        variant: 'destructive',
        description: '无法格式化：内容不是有效的 JSON 格式'
      });
    }
  };

  const handleTest = async () => {
    if (!testContent.trim()) {
      toast({
        variant: 'destructive',
        description: '请输入测试内容'
      });
      return;
    }

    let testData: any;
    // 尝试解析为 JSON，如果失败则作为纯文本字符串
    try {
      testData = JSON.parse(testContent);
    } catch (error) {
      // 不是有效的 JSON，将其作为纯文本字符串使用
      console.error('Error parsing JSON:', error);
      testData = testContent.trim();
    }

    try {
      const result = await onTest(testData);
      setTestResponse(result);
      setError(null);
      setActiveTab('response');
    } catch (error) {
      console.error('[TestPushDialog] Error during test push:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(errorMessage);
      setTestResponse(null);
      setActiveTab('response');
    }
  };

  const handleCopyResponse = () => {
    if (testResponse) {
      const jsonString = JSON.stringify(testResponse, null, 2);
      navigator.clipboard.writeText(jsonString).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <AlertDialog open={internalOpen} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>{description}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4 py-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="request">请求内容</TabsTrigger>
              <TabsTrigger value="response" disabled={!testResponse && !error}>
                响应结果
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="request" className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="test-content">
                  测试内容 <span className="text-red-500">*</span>
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleFormatJson}
                  disabled={isTesting}
                >
                  格式化 JSON
                </Button>
              </div>
              <Textarea
                id="test-content"
                placeholder='JSON 格式: {"message": "示例消息"}&#10;或纯文本: 示例消息内容'
                value={testContent}
                onChange={(e) => setTestContent(e.target.value)}
                className="font-mono text-sm min-h-[200px]"
                disabled={isTesting}
              />
              <p className="text-xs text-muted-foreground">
                支持 JSON 对象（如 {`{"message": "内容"}`}）或纯文本字符串
              </p>
            </TabsContent>

            <TabsContent value="response" className="space-y-2">
              {error ? (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-red-600 mt-0.5">⚠️</div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-red-900 mb-1">请求出错</h4>
                      <p className="text-sm text-red-800 font-mono break-words">{error}</p>
                    </div>
                  </div>
                </div>
              ) : testResponse ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>响应内容</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCopyResponse}
                      className="gap-2"
                      disabled={isTesting}
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4" />
                          已复制
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          复制
                        </>
                      )}
                    </Button>
                  </div>
                  <pre className="font-mono text-sm bg-muted p-3 rounded-md overflow-auto max-h-[300px] border break-words whitespace-pre-wrap">
                    {JSON.stringify(testResponse, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  点击"确认发送"后，响应结果将显示在这里
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
        <AlertDialogFooter>
          <Button
            variant="outline"
            disabled={isTesting}
            onClick={() => handleClose(false)}
          >
            关闭
          </Button>
          <Button
            disabled={isTesting || !testContent.trim()}
            onClick={handleTest}
          >
            {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            确认发送
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
