'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  MoreHorizontal,
  Loader2,
  Eye,
  Power,
  Trash,
  Pencil,
  Zap,
  Plus,
  Copy
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { useState } from 'react';
import { EndpointDialog } from '@/components/endpoint-dialog';
import { Endpoint } from '@/lib/db/schema/endpoints';
import { useToast } from '@/components/ui/use-toast';
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
import { Switch } from '@/components/ui/switch';
import { Channel } from '@/lib/channels';
import { EndpointExample } from '@/components/endpoint-example';
import { useRouter } from 'next/navigation';
import {
  deleteEndpoint,
  toggleEndpointStatus,
  testEndpoint,
  copyEndpoint
} from '@/lib/services/endpoints';
import { generateExampleBody } from '@/lib/generator';
import { Checkbox } from '@/components/ui/checkbox';
import { CreateEndpointGroupDialog } from './create-endpoint-group-dialog';
import { TestPushDialog } from './test-push-dialog';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDate } from '@/lib/utils';
import { ENDPOINT_STATUS } from '@/lib/constants/endpoints';

interface EndpointTableProps {
  endpoints: Endpoint[];
  channels: Channel[];
  onEndpointsUpdate: () => void;
  onGroupCreated: () => void;
}

export function EndpointTable({
  endpoints,
  channels,
  onEndpointsUpdate,
  onGroupCreated
}: EndpointTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [endpointToDelete, setEndpointToDelete] = useState<Endpoint | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTesting, setIsTesting] = useState<string | null>(null);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [endpointToCopy, setEndpointToCopy] = useState<Endpoint | null>(null);
  const [isCopying, setIsCopying] = useState(false);
  const [copyName, setCopyName] = useState('');
  const [copyStatus, setCopyStatus] = useState<
    (typeof ENDPOINT_STATUS)[keyof typeof ENDPOINT_STATUS]
  >(ENDPOINT_STATUS.INACTIVE);
  const { toast } = useToast();
  const [viewExample, setViewExample] = useState<Endpoint | null>(null);
  const router = useRouter();
  const [selectedEndpoints, setSelectedEndpoints] = useState<Endpoint[]>([]);
  const [createGroupDialogOpen, setCreateGroupDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [endpointToTest, setEndpointToTest] = useState<Endpoint | null>(null);
  const [testInitialContent, setTestInitialContent] = useState('');

  const filteredEndpoints =
    endpoints?.filter((endpoint) => {
      if (!searchQuery.trim()) return true;

      const channel = channels.find((c) => c.id === endpoint.channelId);
      const searchContent = [
        endpoint.id,
        endpoint.name,
        endpoint.rule,
        channel?.name
      ]
        .join(' ')
        .toLowerCase();

      const keywords = searchQuery.toLowerCase().split(/\s+/);
      return keywords.every((keyword) => searchContent.includes(keyword));
    }) ?? [];

  const handleDelete = async () => {
    if (!endpointToDelete) return;

    try {
      setIsDeleting(true);
      await deleteEndpoint(endpointToDelete.id);
      onEndpointsUpdate();
      toast({ description: '接口已删除' });
      router.refresh();
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting endpoint:', error);
      toast({
        variant: 'destructive',
        description: '删除失败，请重试'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      setIsLoading(id);
      await toggleEndpointStatus(id);

      onEndpointsUpdate();

      toast({
        description: '推送接口状态已更新'
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        description: error instanceof Error ? error.message : '操作失败'
      });
    } finally {
      setIsLoading(null);
    }
  };

  const handleCopy = async () => {
    if (!endpointToCopy || !copyName.trim()) return;

    try {
      setIsCopying(true);
      await copyEndpoint(endpointToCopy.id, copyName, copyStatus);
      onEndpointsUpdate();
      toast({ description: '接口已复制' });
      setCopyDialogOpen(false);
      setCopyName('');
      setCopyStatus(ENDPOINT_STATUS.INACTIVE);
      router.refresh();
    } catch (error) {
      console.error('Error copying endpoint:', error);
      toast({
        variant: 'destructive',
        description: error instanceof Error ? error.message : '复制失败，请重试'
      });
    } finally {
      setIsCopying(false);
    }
  };

  async function handleTest(testData: any) {
    if (!endpointToTest) return;

    setIsTesting(endpointToTest.id);
    try {
      await testEndpoint(endpointToTest.id, endpointToTest.rule, testData);
      toast({
        title: '测试成功',
        description: '消息已成功推送'
      });
    } catch (error) {
      console.error('Test endpoint error:', error);
      toast({
        title: '测试失败',
        description:
          error instanceof Error ? error.message : '请检查配置是否正确',
        variant: 'destructive'
      });
      throw error; // 重新抛出错误，让 TestPushDialog 知道测试失败了
    } finally {
      setIsTesting(null);
    }
  }

  const toggleEndpointSelection = (endpoint: Endpoint) => {
    setSelectedEndpoints((prev) => {
      const isSelected = prev.some((e) => e.id === endpoint.id);
      if (isSelected) {
        return prev.filter((e) => e.id !== endpoint.id);
      } else {
        return [...prev, endpoint];
      }
    });
  };

  const handleCreateGroup = () => {
    if (selectedEndpoints.length === 0) {
      toast({
        variant: 'destructive',
        description: '请至少选择一个接口'
      });
      return;
    }
    setCreateGroupDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <div className="flex w-full max-w-sm items-center space-x-2">
          <Input
            placeholder="搜索接口的名称、内容或备注..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9"
          />
        </div>
        <div className="flex space-x-2">
          {selectedEndpoints.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={handleCreateGroup}
            >
              <Plus className="h-4 w-4" />
              创建接口组 ({selectedEndpoints.length})
            </Button>
          )}
          <EndpointDialog channels={channels} onSuccess={onEndpointsUpdate} />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>ID</TableHead>
              <TableHead>名称</TableHead>
              <TableHead>推送渠道</TableHead>
              <TableHead>消息模版</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead className="w-[80px]">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEndpoints.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="h-24 text-center text-muted-foreground"
                >
                  {searchQuery ? '未找到匹配的接口' : '暂无接口'}
                </TableCell>
              </TableRow>
            ) : (
              filteredEndpoints.map((endpoint) => {
                const channel = channels.find(
                  (c) => c.id === endpoint.channelId
                );
                return (
                  <TableRow key={endpoint.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedEndpoints.some(
                          (e) => e.id === endpoint.id
                        )}
                        onCheckedChange={() =>
                          toggleEndpointSelection(endpoint)
                        }
                      />
                    </TableCell>
                    <TableCell className="font-mono">{endpoint.id}</TableCell>
                    <TableCell>{endpoint.name}</TableCell>
                    <TableCell>{channel?.name}</TableCell>
                    <TableCell>
                      <Popover>
                        <PopoverTrigger className="text-left">
                          <code className="font-mono text-sm max-w-[200px] truncate block hover:text-blue-500">
                            {endpoint.rule}
                          </code>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px]">
                          <pre className="font-mono text-sm whitespace-pre-wrap break-all bg-muted p-2 rounded-md">
                            {JSON.stringify(
                              JSON.parse(endpoint.rule || '{}'),
                              null,
                              2
                            )}
                          </pre>
                        </PopoverContent>
                      </Popover>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={endpoint.status} />
                    </TableCell>
                    <TableCell>{formatDate(endpoint.createdAt)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setViewExample(endpoint)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            查看示例
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setEndpointToTest(endpoint);
                              const exampleBody = generateExampleBody(
                                endpoint.rule
                              );
                              // 如果生成的示例体为空对象或只有默认消息，且规则包含 ${body}，则使用纯文本
                              const ruleHasBodyOnly =
                                endpoint.rule.includes('${body}') &&
                                !endpoint.rule.includes('${body.');
                              if (
                                ruleHasBodyOnly &&
                                Object.keys(exampleBody).length <= 1
                              ) {
                                setTestInitialContent('示例消息内容');
                              } else {
                                setTestInitialContent(
                                  JSON.stringify(exampleBody, null, 4)
                                );
                              }
                              setTestDialogOpen(true);
                            }}
                            disabled={
                              endpoint.status !== ENDPOINT_STATUS.ACTIVE
                            }
                          >
                            <Zap className="mr-2 h-4 w-4" />
                            测试推送
                          </DropdownMenuItem>
                          <EndpointDialog
                            mode="edit"
                            endpoint={endpoint}
                            channels={channels}
                            onSuccess={onEndpointsUpdate}
                            icon={<Pencil className="h-4 w-4 mr-2" />}
                          />
                          <DropdownMenuItem
                            onClick={() => {
                              setEndpointToCopy(endpoint);
                              setCopyName(`${endpoint.name}-副本`);
                              setCopyStatus(endpoint.status);
                              setCopyDialogOpen(true);
                            }}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            复制
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={isLoading === endpoint.id}
                            onClick={() => handleToggleStatus(endpoint.id)}
                          >
                            <Power className="h-4 w-4 mr-2" />
                            {endpoint.status === 'active' ? '禁用' : '启用'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => {
                              setEndpointToDelete(endpoint);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash className="h-4 w-4 mr-2" />
                            删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除接口 {endpointToDelete?.name} 吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction disabled={isDeleting} onClick={handleDelete}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              确认
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>复制接口</AlertDialogTitle>
            <AlertDialogDescription>
              复制接口: {endpointToCopy?.name}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="copy-name">
                新接口名称 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="copy-name"
                placeholder="请输入新名称"
                value={copyName}
                onChange={(e) => setCopyName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="copy-status">
                是否启用 <span className="text-red-500">*</span>
              </Label>
              <div>
                <Switch
                  id="copy-status"
                  checked={copyStatus === ENDPOINT_STATUS.ACTIVE}
                  onCheckedChange={(checked) =>
                    setCopyStatus(
                      checked
                        ? ENDPOINT_STATUS.ACTIVE
                        : ENDPOINT_STATUS.INACTIVE
                    )
                  }
                />
              </div>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              disabled={isCopying || !copyName.trim()}
              onClick={handleCopy}
            >
              {isCopying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              确认复制
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TestPushDialog
        open={testDialogOpen}
        onOpenChange={setTestDialogOpen}
        title="测试推送"
        description={
          <>
            接口: {endpointToTest?.name}
            <br />
            您可以修改下方的测试内容，支持 JSON 对象或纯文本格式。
          </>
        }
        initialContent={testInitialContent}
        isTesting={isTesting === endpointToTest?.id}
        onTest={handleTest}
      />

      <EndpointExample
        endpoint={viewExample}
        open={!!viewExample}
        onOpenChange={(open) => !open && setViewExample(null)}
      />

      <CreateEndpointGroupDialog
        open={createGroupDialogOpen}
        onOpenChange={setCreateGroupDialogOpen}
        selectedEndpoints={selectedEndpoints}
        onSuccess={() => {
          setSelectedEndpoints([]);
          onGroupCreated();
        }}
      />
    </div>
  );
}
