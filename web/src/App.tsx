import { Outlet } from "react-router-dom";

import "@roochnetwork/rooch-sdk-kit/dist/index.css";
import "@radix-ui/themes/styles.css";
import "./App.css";

function App() {
  return (
    <div className="app-container">
      {/* App-level UI elements can go here */}
      <Outlet />
    </div>
  );
}

export default App;
