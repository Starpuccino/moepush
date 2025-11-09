'use client';

import { Input } from '@/components/ui/input';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { UseFormReturn } from 'react-hook-form';
import type { ChannelFormData } from '@/lib/db/schema/channels';

interface DingtalkFieldsProps {
  form: UseFormReturn<ChannelFormData>;
}

export function DingtalkFields({ form }: DingtalkFieldsProps) {
  return (
    <>
      <FormField
        control={form.control}
        name="webhook"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Webhook URL
              <span className="text-red-500 ml-1">*</span>
            </FormLabel>
            <FormControl>
              <Input
                placeholder="请输入 Webhook 地址"
                className="font-mono"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="secret"
        render={({ field }) => (
          <FormItem>
            <FormLabel>签名密钥</FormLabel>
            <FormControl>
              <Input placeholder="如果已配置加签，请输入签名密钥" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
