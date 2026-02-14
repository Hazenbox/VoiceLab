Summary of all install commands (copy-paste friendly)
# 1. Create project (skip if you already have one)
npm create vite@latest my-app -- --template react-ts
cd my-app

# 2. Copy the .tgz into src/ (adjust path as needed)
cp /path/to/jio-datavis-components-0.1.0.tgz ./src/

# 3. Install the library + peer dependencies
npm install ./src/jio-datavis-components-0.1.0.tgz d3@^7.9.0

# 4. Install dev type definitions
npm install -D @types/d3

# 5. Start the dev server

Attaching the files:
Library - jio-datavis-components-0.1.0.tgz
Types for Typescript declarations to work: jio-datavis-components.d.ts  (place it in types folder. If you get error AI should be able to solve it for you  )

Basic usage: 
import { VerticalBarChart } from "@jio/datavis-components";

const data = [
  { id: "jan", category: "Jan", value: 120 },
  { id: "feb", category: "Feb", value: 180 },
  { id: "mar", category: "Mar", value: 90 },
];

function App() {
  return (
    <VerticalBarChart
      data={data}
      chartHeader={{ title: "Monthly Revenue" }}
      modes={{ colourMode: "Light", colourTheme: "MyJio" }}
    />
  );
}

export default App;