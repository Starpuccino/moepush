export function generateExampleBody(rule: string) {
  try {
    const ruleObj = JSON.parse(rule);
    const exampleBody: Record<string, unknown> = {};

    // 递归查找所有包含 ${body. 的字段
    function findBodyVariables(
      obj: Record<string, unknown>,
      path: string[] = []
    ) {
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = [...path, key];
        if (typeof value === 'string') {
          const matches = value.match(/\$\{body\.([^}]+)\}/g);
          if (matches) {
            matches.forEach((match) => {
              const varPath = match.match(/\$\{body\.([^}]+)\}/)![1];
              const pathParts = varPath.split('.');
              let current = exampleBody;
              pathParts.slice(0, -1).forEach((part) => {
                if (!(part in current)) {
                  current[part] = {} as Record<string, unknown>;
                }
                current = current[part] as Record<string, unknown>;
              });
              current[pathParts[pathParts.length - 1]] =
                `示例${pathParts[pathParts.length - 1]}`;
            });
          }
        } else if (typeof value === 'object' && value !== null) {
          findBodyVariables(value as Record<string, unknown>, currentPath);
        }
      }
    }

    findBodyVariables(ruleObj);
    return exampleBody;
  } catch (error) {
    console.error('Error generating example body:', error);
    return { title: '示例标题', content: '示例内容' };
  }
}
