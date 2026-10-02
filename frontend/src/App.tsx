import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Snackbar } from "./components/Snackbar.tsx";
import { MemoCreatePage } from "./pages/MemoCreatePage.tsx";
import { MemoEditPage } from "./pages/MemoEditPage.tsx";
import { MemoListPage } from "./pages/MemoListPage.tsx";
import { MemoProvider } from "./state/MemoProvider.tsx";

export default function App() {
  return (
    <BrowserRouter>
      <MemoProvider>
        <Routes>
          <Route path="/" element={<MemoListPage />} />
          <Route path="/new" element={<MemoCreatePage />} />
          <Route path="/memos/:id/edit" element={<MemoEditPage />} />
        </Routes>
        <Snackbar />
      </MemoProvider>
    </BrowserRouter>
  );
}
