# @algoux/standard-ranklist-renderer-component

The srk renderer component.

This package only includes the implementation for React.

Supported srk versions: `>=0.0.1 && <=0.2.3`

## Installation

```bash
npm i -D @algoux/standard-ranklist
npm i -S @algoux/standard-ranklist-renderer-component rc-dialog
```

## Usage

```tsx
import { Ranklist } from '@algoux/standard-ranklist-renderer-component';
import '@algoux/standard-ranklist-renderer-component/dist/style.css';
import 'rc-dialog/assets/index.css';

export default function RanklistPage() {
  return <Ranklist data={srkData} />;
}
```
