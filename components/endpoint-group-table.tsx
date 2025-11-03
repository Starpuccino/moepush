"use client"

import { useState } from "react"
import { Loader2, Trash, Eye, Power, Send, Pencil, Copy } from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { EndpointGroupWithEndpoints } from "@/types/endpoint-group"
import { deleteEndpointGroup, toggleEndpointGroupStatus, testEndpointGroup, copyEndpointGroup } from "@/lib/services/endpoint-groups"
import { formatDate } from "@/lib/utils"
import { generateExampleBody } from "@/lib/generator"
import { EndpointGroupExample } from "./endpoint-group-example"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"
import { EndpointGroupDialog } from "./endpoint-group-dialog"
import { Endpoint } from "@/lib/db/schema/endpoints"
import { TestPushDialog } from "./test-push-dialog"
import { StatusBadge } from "@/components/ui/status-badge"

interface EndpointGroupTableProps {
  groups: EndpointGroupWithEndpoints[]
  availableEndpoints: Endpoint[]
  onGroupsUpdate: () => void
}

export function EndpointGroupTable({ groups, availableEndpoints, onGroupsUpdate }: EndpointGroupTableProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [groupToDelete, setGroupToDelete] = useState<EndpointGroupWithEndpoints | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [viewExample, setViewExample] = useState<EndpointGroupWithEndpoints | null>(null)
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [isTesting, setIsTesting] = useState<string | null>(null)
  const [copyDialogOpen, setCopyDialogOpen] = useState(false)
  const [groupToCopy, setGroupToCopy] = useState<EndpointGroupWithEndpoints | null>(null)
  const [isCopying, setIsCopying] = useState(false)
  const [copyName, setCopyName] = useState("")
  const [copyStatus, setCopyStatus] = useState<"active" | "inactive">("inactive")
  const [testDialogOpen, setTestDialogOpen] = useState(false)
  const [groupToTest, setGroupToTest] = useState<EndpointGroupWithEndpoints | null>(null)
  const [testInitialContent, setTestInitialContent] = useState("")
  const { toast } = useToast()
  
  const filteredGroups = groups.filter((group) => {
    if (!searchQuery.trim()) return true
    
    const searchContent = [
      group.id,
      group.name,
      ...group.endpoints.map(e => e.name)
    ].join(" ").toLowerCase()
    
    const keywords = searchQuery.toLowerCase().split(/\s+/)
    return keywords.every(keyword => searchContent.includes(keyword))
  })
  
  const handleDelete = async () => {
    if (!groupToDelete) return
    
    try {
      setIsDeleting(true)
      await deleteEndpointGroup(groupToDelete.id)
      onGroupsUpdate()
      toast({ description: "接口组已删除" })
      setDeleteDialogOpen(false)
    } catch (error) {
      console.error('Error deleting endpoint group:', error)
      toast({ 
        variant: "destructive",
        description: "删除失败，请重试" 
      })
    } finally {
      setIsDeleting(false)
    }
  }
  
  const handleToggleStatus = async (id: string) => {
    try {
      setIsLoading(id)
      await toggleEndpointGroupStatus(id)
      
      onGroupsUpdate()
      toast({
        description: "接口组状态已更新",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        description: error instanceof Error ? error.message : "操作失败",
      })
    } finally {
      setIsLoading(null)
    }
  }
  
  const handleCopy = async () => {
    if (!groupToCopy || !copyName.trim()) return
    
    try {
      setIsCopying(true)
      await copyEndpointGroup(groupToCopy.id, copyName, copyStatus)
      onGroupsUpdate()
      toast({ description: "接口组已复制" })
      setCopyDialogOpen(false)
      setCopyName("")
      setCopyStatus("inactive")
    } catch (error) {
      console.error('Error copying endpoint group:', error)
      toast({ 
        variant: "destructive",
        description: error instanceof Error ? error.message : "复制失败，请重试" 
      })
    } finally {
      setIsCopying(false)
    }
  }
  
  const handleTest = async (testData: any) => {
    if (!groupToTest) return

    if (groupToTest.endpoints.length === 0) {
      toast({
        variant: "destructive",
        description: "接口组内没有接口，无法测试"
      })
      throw new Error("接口组内没有接口")
    }

    // 检查是否所有接口都有规则
    const hasInvalidRule = groupToTest.endpoints.some(e => !e.rule)
    if (hasInvalidRule) {
      toast({
        variant: "destructive",
        description: "接口组中存在未配置规则的接口"
      })
      throw new Error("接口组中存在未配置规则的接口")
    }

    setIsTesting(groupToTest.id)
    try {
      const result = await testEndpointGroup(groupToTest, testData)
      toast({
        title: "测试结果",
        description: `成功: ${result.successCount}, 失败: ${result.failedCount}`,
        variant: result.failedCount > 0 ? "destructive" : "default"
      })
    } catch (error) {
      toast({
        variant: "destructive",
        description: error instanceof Error ? error.message : "测试失败"
      })
      throw error
    } finally {
      setIsTesting(null)
    }
  }
  
  const getEndpointCountDisplay = (group: EndpointGroupWithEndpoints) => {
    const totalCount = group.endpoints.length
    const activeCount = group.endpoints.filter(e => e.status === "active").length
    const inactiveCount = totalCount - activeCount

    if (inactiveCount === 0) {
      return <span>{totalCount}</span>
    }

    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-help">
              {activeCount} / {totalCount}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{inactiveCount} 个接口已禁用</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <div className="flex w-full max-w-sm items-center space-x-2">
          <Input
            placeholder="搜索接口组名称..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9"
          />
        </div>
        <EndpointGroupDialog 
          availableEndpoints={availableEndpoints}
          onSuccess={onGroupsUpdate}
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>名称</TableHead>
              <TableHead>包含接口数</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead className="w-[80px]">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredGroups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  没有找到接口组
                </TableCell>
              </TableRow>
            ) : (
              filteredGroups.map((group) => (
                <TableRow key={group.id}>
                  <TableCell className="font-mono">
                    {group.id}
                  </TableCell>
                  <TableCell className="font-medium">{group.name}</TableCell>
                  <TableCell>{getEndpointCountDisplay(group)}</TableCell>
                  <TableCell>
                    <StatusBadge status={group.status} label={group.status === "active" ? "启用" : "禁用"} />
                  </TableCell>
                  <TableCell>{formatDate(group.createdAt)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setViewExample(group)}>
                          <Eye className="mr-2 h-4 w-4" />
                          查看示例
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setGroupToTest(group)
                            const allRules = group.endpoints.flatMap(e => e.rule ? [e.rule] : [])
                            const combinedRule = allRules.join('\n')
                            const exampleBody = generateExampleBody(allRules.length > 0 ? combinedRule : '{}')
                            // 如果任一规则包含 ${body}（不带点号），且生成的示例体为空或只有默认消息，则使用纯文本
                            const hasBodyOnly = allRules.some(rule => rule.includes('${body}') && !rule.includes('${body.'))
                            if (hasBodyOnly && Object.keys(exampleBody).length <= 1) {
                              setTestInitialContent("示例消息内容")
                            } else {
                              setTestInitialContent(JSON.stringify(exampleBody, null, 4))
                            }
                            setTestDialogOpen(true)
                          }}
                          disabled={group.status === "inactive"}
                        >
                          <Send className="mr-2 h-4 w-4" />
                          测试推送
                        </DropdownMenuItem>
                        <EndpointGroupDialog 
                          mode="edit"
                          group={group}
                          availableEndpoints={availableEndpoints}
                          onSuccess={onGroupsUpdate}
                          icon={<Pencil className="h-4 w-4 mr-2" />}
                        />
                        <DropdownMenuItem
                          onClick={() => {
                            setGroupToCopy(group)
                            setCopyName(`${group.name}-副本`)
                            setCopyStatus(group.status)
                            setCopyDialogOpen(true)
                          }}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          复制
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleToggleStatus(group.id)}
                          disabled={isLoading === group.id}
                        >
                          <Power className="mr-2 h-4 w-4" />
                          {isLoading === group.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            group.status === "active" ? "禁用" : "启用"
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => {
                            setGroupToDelete(group)
                            setDeleteDialogOpen(true)
                          }}
                          className="text-red-600"
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除接口组 {groupToDelete?.name} 吗？此操作不会删除组内的接口，但无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={handleDelete}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              确认
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>复制接口组</AlertDialogTitle>
            <AlertDialogDescription>
              复制接口组: {groupToCopy?.name}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="copy-group-name">
                新接口组名称 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="copy-group-name"
                placeholder="请输入新名称"
                value={copyName}
                onChange={(e) => setCopyName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="copy-group-status">
                是否启用 <span className="text-red-500">*</span>
              </Label>
              <div>
                <Switch
                  id="copy-group-status"
                  checked={copyStatus === "active"}
                  onCheckedChange={(checked) => setCopyStatus(checked ? "active" : "inactive")}
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
            接口组: {groupToTest?.name}
            <br />
            包含 {groupToTest?.endpoints.length} 个接口
            <br />
            您可以修改下方的测试内容，支持 JSON 对象或纯文本格式。
          </>
        }
        initialContent={testInitialContent}
        isTesting={isTesting === groupToTest?.id}
        onTest={handleTest}
      />
      
      <EndpointGroupExample
        group={viewExample}
        open={!!viewExample}
        onOpenChange={(open) => !open && setViewExample(null)}
      />
    </div>
  )
} 