---
id: [module-name]
title: [ModuleName] — [Brief Description]
sidebar_label: [ModuleName]
slug: /[module-name]
description: [Detailed description của module này, mô tả tính năng chính và use cases.]
tags: [tag1, tag2, tag3, technology, framework]
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

:::info
[Brief overview của module - 1-2 câu mô tả tổng quan về module này làm gì]
:::

### Tổng quan

- **Mục tiêu**: [Mục tiêu chính của module]
- **Điểm nổi bật**:
    - **[Feature 1]**: [Mô tả feature 1]
    - **[Feature 2]**: [Mô tả feature 2]
    - **[Feature 3]**: [Mô tả feature 3]
    - **[Feature 4]**: [Mô tả feature 4]

### Cách hoạt động

```mermaid
[Mermaid diagram mô tả flow hoặc architecture]
```

### Options/Configuration

| Option    | Type   | Mặc định  | Mô tả          |
| --------- | ------ | --------- | -------------- |
| `option1` | `type` | `default` | Mô tả option 1 |
| `option2` | `type` | `default` | Mô tả option 2 |
| `option3` | `type` | `default` | Mô tả option 3 |

:::note
[Ghi chú quan trọng về options hoặc configuration]
:::

### Usage Examples

<Tabs>
  <TabItem value="basic" label="Basic Usage">

```ts
// Basic example
import { ModuleName } from '@ecom-co/[package]';

// Simple usage
const instance = new ModuleName();
```

  </TabItem>
  <TabItem value="advanced" label="Advanced Usage">

```ts
// Advanced example với configuration
const instance = new ModuleName({
    option1: 'value1',
    option2: true,
    option3: 100,
});
```

  </TabItem>
  <TabItem value="integration" label="Integration Example">

```ts
// Integration với NestJS hoặc framework khác
@Module({
    providers: [ModuleName],
})
export class AppModule {}
```

  </TabItem>
</Tabs>

### API Reference

#### Methods

| Method      | Parameters                   | Return Type  | Mô tả          |
| ----------- | ---------------------------- | ------------ | -------------- |
| `method1()` | `param: type`                | `ReturnType` | Mô tả method 1 |
| `method2()` | `param1: type, param2: type` | `ReturnType` | Mô tả method 2 |

#### Properties

| Property    | Type   | Mô tả            |
| ----------- | ------ | ---------------- |
| `property1` | `type` | Mô tả property 1 |
| `property2` | `type` | Mô tả property 2 |

### Advanced Examples

<Tabs>
  <TabItem value="custom" label="Custom Configuration">

```ts
// Custom configuration example
```

  </TabItem>
  <TabItem value="testing" label="Testing">

```ts
// Testing example
describe('ModuleName', () => {
    it('should work correctly', () => {
        // Test implementation
    });
});
```

  </TabItem>
</Tabs>

### Integration với Other Modules

[Mô tả cách module này tích hợp với các modules khác trong ecosystem]

### Best Practices

- **Practice 1**: Mô tả best practice 1
- **Practice 2**: Mô tả best practice 2
- **Practice 3**: Mô tả best practice 3
- **Practice 4**: Mô tả best practice 4

### Troubleshooting

#### Common Issues

**Issue 1: [Tên issue]**

```bash
# Error message
Error: [error message]
```

**Solution**: [Cách giải quyết]

**Issue 2: [Tên issue]**

```bash
# Error message
Error: [error message]
```

**Solution**: [Cách giải quyết]

:::tip
[Tip hữu ích cho việc sử dụng module]
:::

:::warning
[Warning quan trọng cần lưu ý]
:::

:::danger
[Danger/critical warning nếu có]
:::
